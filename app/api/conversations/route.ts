import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

export async function POST(request: Request) {
  let user; try { user = await requireUser(); } catch { return Response.json({ error: "Authentication required." }, { status: 401 }); }
  const body = await request.json() as { sessionId?: string; avatarId?: string; title?: string };
  if (!body.sessionId) return Response.json({ error: "sessionId is required" }, { status: 400 });
  const conversation = await prisma.conversation.upsert({
    where: { sessionId: body.sessionId },
    create: { sessionId: body.sessionId, userId: user.id, avatarId: body.avatarId, title: body.title },
    update: { userId: user.id, avatarId: body.avatarId, title: body.title },
  });
  return Response.json(conversation, { status: 201 });
}

export async function GET() {
  let user; try { user = await requireUser(); } catch { return Response.json({ error: "Authentication required." }, { status: 401 }); }
  const conversations = await prisma.conversation.findMany({ where: { userId: user.id }, orderBy: { updatedAt: "desc" }, include: { _count: { select: { messages: true } } } });
  return Response.json(conversations);
}
