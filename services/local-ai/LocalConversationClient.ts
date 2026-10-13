export type ConnectionState = "disconnected" | "connecting" | "connected" | "reconnecting" | "error";
export interface LocalConversationCallbacks {
  onState: (state: ConnectionState) => void;
  onError: (message: string) => void;
  onAudio: (bytes: Uint8Array, rate: number) => void;
  onInterrupted: () => void;
  onTurnComplete: () => void;
  onTranscript: (speaker: "user" | "avatar", text: string, finished: boolean) => void;
  onUserActivity?: (active: boolean) => void;
}

export class LocalConversationClient {
  private sessionId = crypto.randomUUID();
  private conversationId = "";
  private active = false;
  private audioChunks: Uint8Array[] = [];
  constructor(private callbacks: LocalConversationCallbacks) {}
  get connected() { return this.active; }
  async connect() {
    if (this.active) return;
    this.callbacks.onState("connecting");
    const response = await fetch("/api/conversations", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ sessionId: this.sessionId }) });
    if (!response.ok) { this.callbacks.onState("error"); throw new Error("Could not start the local conversation database session."); }
    const conversation = await response.json() as { id: string };
    this.conversationId = conversation.id; this.active = true; this.callbacks.onState("connected");
  }
  disconnect() { this.active = false; this.audioChunks = []; this.callbacks.onInterrupted(); this.callbacks.onState("disconnected"); }
  sendAudio(bytes?: Uint8Array) { if (bytes?.byteLength) this.audioChunks.push(bytes.slice()); }
  async endAudio() {
    if (!this.active || !this.audioChunks.length) return;
    const size = this.audioChunks.reduce((total, chunk) => total + chunk.byteLength, 0);
    const pcm = new Uint8Array(size);
    let offset = 0;
    for (const chunk of this.audioChunks) { pcm.set(chunk, offset); offset += chunk.byteLength; }
    this.audioChunks = [];
    const response = await fetch("/api/local-ai/transcribe", { method: "POST", headers: { "content-type": "application/octet-stream", "x-sample-rate": "16000" }, body: pcm });
    const payload = await response.json() as { text?: string; error?: string };
    if (!response.ok) { this.callbacks.onError(payload.error || "Local speech recognition failed."); return; }
    if (payload.text?.trim()) await this.sendText(payload.text.trim());
  }
  async sendText(text: string) {
    if (!this.active || !this.conversationId) throw new Error("Start the local conversation before sending a message.");
    if (!text.trim() || text.length > 4000) throw new Error("Enter a message of up to 4,000 characters.");
    this.callbacks.onTranscript("user", text.trim(), true); this.callbacks.onUserActivity?.(false);
    const response = await fetch(`/api/conversations/${this.conversationId}/messages`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ role: "user", content: text.trim() }) });
    if (!response.ok) { const payload = await response.json() as { error?: string }; throw new Error(payload.error || "Local AI could not answer."); }
    const history = await response.json() as { messages?: LocalChatMessage[] };
    const messages = history.messages ?? [{ role: "user" as const, content: text.trim() }];
    const buffer = new SentenceBuffer(); let fullText = "";
    for await (const token of streamLocalModel(messages)) {
      fullText += token; this.callbacks.onTranscript("avatar", token, false);
      for (const sentence of buffer.push(token)) await this.speak(sentence);
    }
    const remainder = buffer.flush(); if (remainder) await this.speak(remainder);
    if (fullText.trim()) this.callbacks.onTranscript("avatar", "", true);
    if (fullText.trim()) await fetch(`/api/conversations/${this.conversationId}/messages`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ role: "assistant", content: fullText.trim() }) });
    this.callbacks.onTurnComplete();
  }
  private async speak(text: string) {
    try {
      const speech = await fetch("/api/local-ai/synthesize", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text }) });
      if (speech.ok) { const audio = decodeWavPcm16(new Uint8Array(await speech.arrayBuffer())); if (audio) this.callbacks.onAudio(audio.bytes, audio.sampleRate); }
      else { const speechError = await speech.json().catch(() => ({ error: "Local TTS failed." })) as { error?: string }; this.callbacks.onError(speechError.error || "Local TTS failed; text response is still available."); }
    } catch { this.callbacks.onError("Local TTS is unavailable; text response is still available."); }
  }
  stopResponse() { this.callbacks.onInterrupted(); }
}

function decodeWavPcm16(bytes: Uint8Array): { bytes: Uint8Array; sampleRate: number } | null {
  if (bytes.length < 44 || new TextDecoder().decode(bytes.slice(0, 4)) !== "RIFF" || new TextDecoder().decode(bytes.slice(8, 12)) !== "WAVE") return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let offset = 12; let sampleRate = 0; let channels = 0; let bits = 0; let dataStart = -1; let dataSize = 0;
  while (offset + 8 <= bytes.length) {
    const id = new TextDecoder().decode(bytes.slice(offset, offset + 4)); const size = view.getUint32(offset + 4, true); offset += 8;
    if (id === "fmt " && size >= 16) { if (view.getUint16(offset, true) !== 1) return null; channels = view.getUint16(offset + 2, true); sampleRate = view.getUint32(offset + 4, true); bits = view.getUint16(offset + 14, true); }
    if (id === "data") { dataStart = offset; dataSize = Math.min(size, bytes.length - offset); break; }
    offset += size + (size % 2);
  }
  if (dataStart < 0 || channels !== 1 || bits !== 16 || !sampleRate) return null;
  return { bytes: bytes.slice(dataStart, dataStart + dataSize), sampleRate };
}
import { SentenceBuffer } from "./SentenceBuffer";
import { streamLocalModel, type LocalChatMessage } from "./LocalLLMClient";
