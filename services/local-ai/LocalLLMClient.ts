export type LocalChatMessage = { role: "system" | "user" | "assistant"; content: string };

const baseUrl = () => process.env.LOCAL_LLM_BASE_URL || "http://127.0.0.1:11434";
const model = () => process.env.LOCAL_LLM_MODEL || "qwen3:14b";

export async function chatWithLocalModel(messages: LocalChatMessage[], signal?: AbortSignal) {
  const response = await fetch(`${baseUrl()}/api/chat`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    // Conversation responses should be spoken quickly. Qwen3's reasoning mode
    // can spend tens of seconds thinking before returning a short answer.
    body: JSON.stringify({ model: model(), messages, stream: false, think: false, options: { num_predict: 256 } }),
    signal,
  });
  if (!response.ok) throw new Error(`Local AI unavailable (${response.status}). Start Ollama and install ${model()}.`);
  const payload = await response.json() as { message?: { content?: string } };
  const content = payload.message?.content?.trim();
  if (!content) throw new Error("Local AI returned an empty response.");
  return { content, model: model() };
}

export async function* streamLocalModel(messages: LocalChatMessage[], signal?: AbortSignal): AsyncGenerator<string> {
  const response = await fetch(`${baseUrl()}/api/chat`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ model: model(), messages, stream: true, think: false, options: { num_predict: 256 } }),
    signal,
  });
  if (!response.ok || !response.body) throw new Error(`Local AI unavailable (${response.status}). Start Ollama and install ${model()}.`);
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let pending = "";
  try {
    while (true) {
      const { value, done } = await reader.read();
      pending += decoder.decode(value ?? new Uint8Array(), { stream: !done });
      const lines = pending.split("\n"); pending = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.trim()) continue;
        const payload = JSON.parse(line) as { message?: { content?: string }; error?: string };
        if (payload.error) throw new Error(payload.error);
        if (payload.message?.content) yield payload.message.content;
      }
      if (done) break;
    }
    if (pending.trim()) {
      const payload = JSON.parse(pending) as { message?: { content?: string }; error?: string };
      if (payload.error) throw new Error(payload.error);
      if (payload.message?.content) yield payload.message.content;
    }
  } finally { reader.releaseLock(); }
}

export async function checkLocalModel() {
  const response = await fetch(`${baseUrl()}/api/tags`, { cache: "no-store" });
  if (!response.ok) return { available: false, model: model() };
  const payload = await response.json() as { models?: Array<{ name?: string }> };
  return { available: true, model: model(), installed: payload.models?.some((item) => item.name === model()) ?? false };
}
