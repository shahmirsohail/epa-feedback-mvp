# EPA Feedback MVP (Web App)

This is a runnable prototype that:
- takes a pasted attending–resident feedback transcript
- de-identifies common PHI patterns (best-effort)
- maps to a closed set of EPAs (FOD/COD seed set)
- proposes an entrustment level (Intervention/Direction/Support/Autonomy/Excellence)
- generates a **draft** feedback form
- requires **attending approval** before emailing the draft to the resident

> ⚠️ Do **not** use for real patient data without institutional approval, secure hosting, consent, and a stronger PHI pipeline.

---

## 1) Prereqs
- Node.js 18+
- npm

## 2) Setup
```bash
cd epa-feedback-mvp
cp .env.example .env
npm install
```

## 3) Database (SQLite + Prisma, sessions only)
```bash
npm run prisma:generate
npm run prisma:migrate
```

EPA definitions are now loaded from `src/data/epas.json` (no EPA seeding needed).

## 4) Run
```bash
npm run dev
```
Open http://localhost:3000

## 5) Email configuration (optional)
To send emails, edit `.env` and set:
- SMTP_HOST
- SMTP_PORT
- SMTP_SECURE
- SMTP_USER / SMTP_PASS (if required)
- MAIL_FROM
- APP_BASE_URL

If you don't configure email, the app will still generate drafts but "Send email" will error.

---

## Next steps you can add
- Audio recording + Whisper transcription
- Stronger PHI scrubbing (dictionary + model pass + redaction diff UI)
- Editable draft form + PDF export for Elentra upload
- User accounts (attending login) + audit logs
- EPA list import from your institution (CSV)
- LLM-based EPA classification + evidence-backed scoring (human-in-the-loop)


## Audio transcription (v2)
Set `OPENAI_API_KEY` in `.env`, then use the **Record** or **Upload audio** buttons on `/upload` and click **Transcribe**.

The server calls `POST /api/transcribe` using OpenAI's `audio/transcriptions` endpoint. Default model is `gpt-4o-mini-transcribe` (change via `OPENAI_TRANSCRIBE_MODEL`).


## AI EPA classification + AI feedback drafting (v3)
If `OPENAI_API_KEY` is set, the server will use an LLM to:
- choose the most relevant EPA from the seeded list
- suggest an entrustment level
- draft strengths/improvements/next steps with evidence quotes

If no key is set, it falls back to keyword/heuristic drafting.


## Editable draft UI (v4)
On the session page, the draft feedback form is editable (EPA, entrustment, strengths, improvements, next steps, evidence quotes, summary). Editing is locked after approval.
