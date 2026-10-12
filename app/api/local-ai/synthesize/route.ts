export const runtime = "nodejs";

export async function POST(request: Request) {
  const service = process.env.LOCAL_TTS_URL || "http://127.0.0.1:8102";
  try {
    const response = await fetch(`${service}/synthesize`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(await request.json()) });
    return new Response(await response.arrayBuffer(), { status: response.status, headers: { "content-type": response.headers.get("content-type") || "application/json" } });
  } catch { return Response.json({ error: "Local TTS is offline. Start Docker Compose and try again." }, { status: 503 }); }
}
