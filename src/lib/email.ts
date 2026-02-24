import nodemailer from "nodemailer";
import { FeedbackDraft } from "./draft";

export async function sendDraftEmail(opts: {
  to: string;
  residentName: string;
  attendingName: string;
  sessionId: string;
  draft: FeedbackDraft;
  appBaseUrl: string;
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

  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: String(SMTP_SECURE).toLowerCase() === "true",
    auth: SMTP_USER ? { user: SMTP_USER, pass: SMTP_PASS } : undefined
  });

  const subject = `Draft EPA Feedback (${opts.draft.epaId ?? "Unmapped"}) – Please review`;

  const link = `${opts.appBaseUrl.replace(/\/$/, "")}/sessions/${opts.sessionId}`;

  const text = [
    `Hi ${opts.residentName},`,
    ``,
    `This is a draft feedback form generated from a teaching/feedback conversation with ${opts.attendingName}.`,
    `Please note: This draft is provided for transparency and is subject to attending review/edits.`,
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
    `Review link: ${link}`,
    ``,
    `— ${opts.attendingName}`
  ].join("\n");

  await transporter.sendMail({
    from: MAIL_FROM,
    to: opts.to,
    subject,
    text
  });
}
