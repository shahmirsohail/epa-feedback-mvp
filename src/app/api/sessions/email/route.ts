import { NextResponse } from "next/server";
import { emailSessionDraft } from "@/lib/session-workflow";

export async function POST(req: Request) {
  const form = await req.formData();
  const id = String(form.get("id") || "");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  try {
    await emailSessionDraft(id);
  } catch (e: any) {
    if ((e?.message || "").includes("Not found")) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ error: e?.message ?? "Unknown error" }, { status: 400 });
  }

  return NextResponse.redirect(new URL(`/sessions/${id}?emailed=1`, req.url));
}
