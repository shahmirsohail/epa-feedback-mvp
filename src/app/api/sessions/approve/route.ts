import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const form = await req.formData();
  const id = String(form.get("id") || "");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  await prisma.session.update({
    where: { id },
    data: { approved: true, approvedAt: new Date() }
  });

  return NextResponse.redirect(new URL(`/sessions/${id}`, req.url));
}
