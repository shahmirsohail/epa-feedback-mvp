import nodemailer from "nodemailer";
import { FeedbackDraft } from "./draft";

function looksLikePlaceholder(value: string) {
  return /(yourhospital|yourdomain|example|changeme)/i.test(value);
}

function isDnsSmtpError(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const maybeCode = "code" in error ? String((error as { code?: string }).code) : "";
  const maybeMessage = "message" in error ? String((error as { message?: string }).message) : "";
  return ["ENOTFOUND", "EAI_AGAIN", "EBUSY"].includes(maybeCode) || /getaddrinfo/i.test(maybeMessage);
}

export async function sendDraftEmail(opts: {
  to: string;
  residentName: string;
  attendingName: string;
  sessionId?: string;
  draft: FeedbackDraft;
  appBaseUrl?: string;
}) {
  const {
    SMTP_HOST,
    SMTP_PORT,
    SMTP_SECURE,
    SMTP_USER,
    SMTP_PASS,
    MAIL_FROM
  } = process.env;

  if (!SMTP_HOST || !SMTP_PORT || !MAIL_FROM) {
    throw new Error("Email not configured. Set SMTP_HOST/SMTP_PORT/MAIL_FROM (and optionally SMTP_USER/SMTP_PASS).");
  }

  if (looksLikePlaceholder(SMTP_HOST) || looksLikePlaceholder(MAIL_FROM)) {
    throw new Error("Email is using placeholder config. Update SMTP_HOST and MAIL_FROM in .env with real values.");
  }

  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: String(SMTP_SECURE).toLowerCase() === "true",
    auth: SMTP_USER ? { user: SMTP_USER, pass: SMTP_PASS } : undefined
  });

  const subject = `Draft EPA Feedback (${opts.draft.epaId ?? "Unmapped"}) – Please review`;

  const link = opts.sessionId && opts.appBaseUrl
    ? `${opts.appBaseUrl.replace(/\/$/, "")}/sessions/${opts.sessionId}`
    : null;

  const text = [
    `Hi ${opts.attendingName},`,
    ``,
    `This is a pre-filled EPA generated from a teaching/feedback conversation with ${opts.residentName}.`,
    `Please review and edit as needed before sharing it with the resident.`,
    ``,
    `EPA: ${opts.draft.epaId ?? "Not confidently matched"}`,
    `Entrustment: ${opts.draft.entrustment}`,
    ``,
    `Strengths:`,
    ...opts.draft.strengths.map(s => `- ${s}`),
    ``,
    `Areas to improve:`,
    ...opts.draft.improvements.map(s => `- ${s}`),
    ``,
    `Next steps:`,
    ...opts.draft.nextSteps.map(s => `- ${s}`),
    ``,
    ...(link ? [`Review link: ${link}`, ``] : []),
    `— EPA`
  ].join("\n");

  try {
    await transporter.sendMail({
      from: MAIL_FROM,
      to: opts.to,
      subject,
      text
    });
  } catch (error) {
    if (isDnsSmtpError(error)) {
      throw new Error("Could not reach SMTP host. Check SMTP_HOST/SMTP_PORT in .env or use a local SMTP service for testing.");
    }
    throw error;
  }
}
