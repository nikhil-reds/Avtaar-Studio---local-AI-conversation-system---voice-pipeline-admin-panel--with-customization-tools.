import { prisma } from "@/lib/prisma";
import { chatWithLocalModel } from "@/services/local-ai/LocalLLMClient";
import { requireUser } from "@/lib/auth";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  let user; try { user = await requireUser(); } catch { return Response.json({ error: "Authentication required." }, { status: 401 }); }
  const { id } = await context.params;
  const owner = await prisma.conversation.findFirst({ where: { id, userId: user.id }, select: { id: true } });
  if (!owner) return Response.json({ error: "Conversation not found" }, { status: 404 });
  const messages = await prisma.message.findMany({ where: { conversationId: id }, orderBy: { sequence: "asc" } });
  return Response.json(messages);
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  let user; try { user = await requireUser(); } catch { return Response.json({ error: "Authentication required." }, { status: 401 }); }
  const { id } = await context.params;
  const body = await request.json() as { content?: string; role?: "user" | "system"; sequence?: number };
  if (!body.content?.trim() || !body.role) return Response.json({ error: "role and content are required" }, { status: 400 });
  const conversation = await prisma.conversation.findFirst({ where: { id, userId: user.id } });
  if (!conversation) return Response.json({ error: "Conversation not found" }, { status: 404 });
  const nextSequence = body.sequence ?? ((await prisma.message.count({ where: { conversationId: id } })) + 1);
  const userMessage = await prisma.message.create({ data: { conversationId: id, role: body.role, content: body.content.trim(), sequence: nextSequence } });
  if (body.role !== "user") return Response.json({ userMessage });
  const history = await prisma.message.findMany({ where: { conversationId: id }, orderBy: { sequence: "asc" }, take: 40 });
  const started = Date.now();
  const result = await chatWithLocalModel(history.map((message) => ({ role: message.role === "tool" ? "system" : message.role, content: message.content })));
  const assistantMessage = await prisma.message.create({ data: { conversationId: id, role: "assistant", content: result.content, sequence: nextSequence + 1, model: result.model, latencyMs: Date.now() - started } });
  return Response.json({ userMessage, assistantMessage });
}
