import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendDraftEmail } from "@/lib/email";

export async function POST(req: Request) {
  const form = await req.formData();
  const id = String(form.get("id") || "");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const session = await prisma.session.findUnique({ where: { id } });
  if (!session) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!session.approved) return NextResponse.json({ error: "Session not approved" }, { status: 400 });

  const draft = JSON.parse(session.draftJson);
  const appBaseUrl = process.env.APP_BASE_URL || "http://localhost:3000";

  await sendDraftEmail({
    to: session.residentEmail,
    residentName: session.residentName,
    attendingName: session.attendingName,
    sessionId: session.id,
    draft,
    appBaseUrl
  });

  await prisma.session.update({
    where: { id },
    data: { emailSent: true, emailSentAt: new Date() }
  });

  return NextResponse.redirect(new URL(`/sessions/${id}`, req.url));
}
