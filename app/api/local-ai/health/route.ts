import { checkLocalModel } from "@/services/local-ai/LocalLLMClient";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET() {
  const [ollama, database, stt, tts] = await Promise.all([
    checkLocalModel().catch(() => ({ available: false, installed: false, model: process.env.LOCAL_LLM_MODEL || "qwen3:14b" })),
    prisma.$queryRaw`SELECT 1`.then(() => true).catch(() => false),
    fetch(`${process.env.LOCAL_STT_URL || "http://127.0.0.1:8101"}/health`).then((response) => response.ok).catch(() => false),
    fetch(`${process.env.LOCAL_TTS_URL || "http://127.0.0.1:8102"}/health`).then((response) => response.ok).catch(() => false),
  ]);
  return Response.json({
    ollama,
    database: { available: database },
    stt: { available: stt, configured: stt, provider: process.env.LOCAL_STT_PROVIDER || "faster-whisper" },
    tts: { available: tts, configured: tts, provider: process.env.LOCAL_TTS_PROVIDER || "piper" },
  }, { headers: { "cache-control": "no-store" } });
}
