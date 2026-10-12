export type LocalChatMessage = { role: "system" | "user" | "assistant"; content: string };

const baseUrl = () => process.env.LOCAL_LLM_BASE_URL || "http://127.0.0.1:11434";
const model = () => process.env.LOCAL_LLM_MODEL || "qwen3:14b";

export async function chatWithLocalModel(messages: LocalChatMessage[], signal?: AbortSignal) {
  const response = await fetch(`${baseUrl()}/api/chat`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ model: model(), messages, stream: false }),
    signal,
  });
  if (!response.ok) throw new Error(`Local AI unavailable (${response.status}). Start Ollama and install ${model()}.`);
  const payload = await response.json() as { message?: { content?: string } };
  const content = payload.message?.content?.trim();
  if (!content) throw new Error("Local AI returned an empty response.");
  return { content, model: model() };
}

export async function checkLocalModel() {
  const response = await fetch(`${baseUrl()}/api/tags`, { cache: "no-store" });
  if (!response.ok) return { available: false, model: model() };
  const payload = await response.json() as { models?: Array<{ name?: string }> };
  return { available: true, model: model(), installed: payload.models?.some((item) => item.name === model()) ?? false };
}
