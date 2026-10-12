import { getCurrentUser } from "@/lib/auth";
export async function GET() { const user = await getCurrentUser(); return Response.json({ user: user ? { id: user.id, email: user.email, name: user.name, role: user.role } : null }); }
