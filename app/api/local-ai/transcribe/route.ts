export const runtime = "nodejs";

export async function POST(request: Request) {
  const service = process.env.LOCAL_STT_URL || "http://127.0.0.1:8101";
  const sampleRate = request.headers.get("x-sample-rate") || "16000";
  const bytes = await request.arrayBuffer();
  if (!bytes.byteLength) return Response.json({ error: "No microphone audio received." }, { status: 400 });
  const form = new FormData();
  form.append("audio", new Blob([bytes], { type: "application/octet-stream" }), "microphone.pcm");
  form.append("sample_rate", sampleRate);
  try {
    const response = await fetch(`${service}/transcribe?sample_rate=${encodeURIComponent(sampleRate)}`, { method: "POST", body: form });
    const payload = await response.json();
    return Response.json(payload, { status: response.status });
  } catch {
    return Response.json({ error: "Local STT is offline. Start Docker Compose and try again." }, { status: 503 });
  }
}
