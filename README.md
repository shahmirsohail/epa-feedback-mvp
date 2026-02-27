# EPA (Web App)

This is a runnable prototype that:
- takes a pasted attending–resident feedback transcript
- de-identifies common PHI patterns (best-effort)
- maps to a closed set of EPAs (FOD/COD seed set)
- proposes an entrustment level (Intervention/Direction/Support/Autonomy/Excellence)
- generates a **draft** feedback form
- requires **attending approval** before emailing the pre-filled EPA to the attending

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
Open http://localhost:3000 (it now redirects straight to `/upload` for a one-screen flow).

### No-database mode for quick draft+email
The `/upload` flow now works without a Prisma/SQLite database. It generates the draft directly from transcript/audio and emails the attending immediately.

Database setup is only required for session persistence pages (`/sessions`, `/sessions/[id]`) and related legacy APIs.

## 5) Email configuration (optional)
To send emails, edit `.env` and set:
- SMTP_HOST
- SMTP_PORT
- SMTP_SECURE
- SMTP_USER / SMTP_PASS (if required)
- MAIL_FROM
- APP_BASE_URL

If you don't configure email, the app will still generate drafts but "Send email" will error.

If email fails, the app now still navigates to a draft results page (`/upload/result`) and shows the generated draft plus the email error.

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
- draft strengths/improvements/next steps with transcript-grounded details embedded directly in strengths/improvements bullets
- keep `evidence_quotes` as supplementary supporting snippets

If no key is set, it falls back to keyword/heuristic drafting.



## Example transcripts for testing
Use `src/data/example-transcripts.md` for synthetic attending–resident feedback transcripts with suggested expected EPA mappings. You can also load these directly from the `/upload` page via the new “Load an example transcript” dropdown.

## Editable draft UI (v4)
On the session page, the draft feedback form is editable (EPA, entrustment, strengths, improvements, next steps, evidence quotes, summary). Editing is locked after approval.

The `/upload/result` page now also supports lightweight prototype editing with **Edit**, **Save locally**, and **Reset to generated draft** controls. These edits are stored in `sessionStorage` and are session/browser scoped (not persisted to the database unless you use the `/sessions/[id]` flow).
