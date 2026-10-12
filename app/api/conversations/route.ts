import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const body = await request.json() as { sessionId?: string; avatarId?: string; title?: string };
  if (!body.sessionId) return Response.json({ error: "sessionId is required" }, { status: 400 });
  const conversation = await prisma.conversation.upsert({
    where: { sessionId: body.sessionId },
    create: { sessionId: body.sessionId, avatarId: body.avatarId, title: body.title },
    update: { avatarId: body.avatarId, title: body.title },
  });
  return Response.json(conversation, { status: 201 });
}

export async function GET() {
  const conversations = await prisma.conversation.findMany({ orderBy: { updatedAt: "desc" }, include: { _count: { select: { messages: true } } } });
  return Response.json(conversations);
}
