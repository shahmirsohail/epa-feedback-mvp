# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This App Does

EPA Feedback MVP is a Next.js 14 full-stack app for medical education. It takes attending-resident feedback transcripts (audio or text), de-identifies PHI, maps the conversation to an EPA (Entrustment-based Programmatic Assessment) competency, proposes an entrustment level, and generates a pre-filled feedback draft that gets emailed to the attending for approval.

**Important**: The app handles sensitive medical data. For real patient data, institutional approval, secure hosting, and stronger PHI de-identification are required. The current de-ID is best-effort regex-based, not HIPAA-grade.

## Commands

```bash
npm run dev          # Start dev server at http://localhost:3000
npm run build        # prisma generate + next build
npm run lint         # ESLint (next/core-web-vitals)

npm run prisma:generate   # Regenerate Prisma client after schema changes
npm run prisma:migrate    # Apply migrations + regenerate client
npm run prisma:seed       # Seed EPA catalog into DB
```

There are no unit tests. E2E tests use Playwright (see below).

## Setup

```bash
npm install
cp .env.example .env   # then fill in values
npm run prisma:migrate
npm run dev
```

Root (`/`) redirects to `/upload`. The app works without `OPENAI_API_KEY` (falls back to heuristics) and without SMTP config (draft-only mode).

## Environment Variables

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | SQLite path, default `file:./dev.db` |
| `OPENAI_API_KEY` | Required for LLM analysis and audio transcription |
| `OPENAI_TRANSCRIBE_MODEL` | Default `gpt-4o-mini-transcribe` |
| `OPENAI_CHAT_MODEL` | Default `gpt-4o-mini` |
| `SMTP_HOST/PORT/SECURE/USER/PASS` | Email delivery (optional) |
| `MAIL_FROM` | Sender address |
| `APP_BASE_URL` | Used in email links |

## Architecture

### Core Pipeline (`src/lib/session-workflow.ts`)

The central orchestration file. Runs: transcription → de-ID → adequacy check → EPA matching → draft generation → email. All major steps are called from here.

```
/upload form submit
  → POST /api/sessions/draft-and-email
    → session-workflow.ts: createSessionWithDraft()
      1. transcribe (if audio)  ← llm.ts / openai.ts
      2. deid.ts: deidentify()
      3. llm.ts: analyzeWithLLM()  (or heuristic fallback)
      4. draft.ts: buildDraft()  (heuristic only)
      5. prisma: save Session
      6. email.ts: sendDraftEmail()
    → redirect to /upload/result (result in sessionStorage)
```

### EPA Matching — Two Paths

- **LLM path** (`src/lib/llm.ts`): OpenAI chat completion with a structured prompt. Returns `LlmAnalysis` (EPA ID, confidence, entrustment, strengths/improvements/next-steps/quotes, summary). Post-processing filters ungrounded bullets and validates EPA IDs.
- **Heuristic path** (`src/lib/epa.ts`): Keyword scoring against the EPA catalog + regex-based entrustment signal detection. Always available as fallback.

The `meta.method` field on `FeedbackDraft` indicates which path was used.

### Data Model

**Session** (SQLite via Prisma): stores the full lifecycle — raw transcript, de-identified transcript, redaction report (JSON), mapped EPA, entrustment, the full `draftJson` (JSON-serialized `FeedbackDraft`), and email/approval status.

**EPA**: seeded from `src/data/epas.json` (14 EPAs: FOD-1 through FOD-7, COD-5, COD-8, etc.). Each has `id`, `title`, `description`, `keywords[]`.

### Key Types

**`FeedbackDraft`** (`src/lib/draft.ts`): the central DTO flowing through the pipeline.
```typescript
{
  meta: { method, insufficient_evidence?, epa_rationale?, epa_confidence?, entrustment_confidence? },
  epaId: string | null,
  entrustment: "Intervention" | "Direction" | "Support" | "Autonomy" | "Excellence",
  strengths: string[],
  improvements: string[],
  nextSteps: string[],
  evidenceQuotes: string[],
  summaryComment: string
}
```

### Pages

| Route | File | Notes |
|---|---|---|
| `/upload` | `src/app/upload/page.tsx` | Main form; loads example transcripts from `src/data/example-transcripts.ts` |
| `/upload/result` | `src/app/upload/result/page.tsx` | Reads draft from `sessionStorage`; lightweight editing |
| `/sessions` | `src/app/sessions/page.tsx` | Table of all DB-persisted sessions |
| `/sessions/[id]` | `src/app/sessions/[id]/page.tsx` | Full session detail + `DraftEditor.tsx` |

### API Routes

| Route | Purpose |
|---|---|
| `POST /api/sessions/draft-and-email` | Main flow: full pipeline + email |
| `POST /api/sessions/draft` | Draft generation only |
| `POST /api/sessions/email` | Send email for existing session |
| `POST /api/transcribe` | Audio → text (OpenAI), returns diarized text + speaker role inference |
| `GET /api/sessions` | List sessions |

### Path Alias

`@/*` maps to `./src/*` (configured in `tsconfig.json`).

## E2E Verification with Playwright

Tests live in `e2e/`. They run against any URL — local dev server or a Vercel preview deployment.

```bash
# Against local dev server (start it first with npm run dev)
npm run e2e

# Against a Vercel preview URL
BASE_URL=https://your-preview.vercel.app npm run e2e

# Run a single test file
BASE_URL=https://your-preview.vercel.app npx playwright test e2e/phi-scrub.spec.ts
```

Key test: `e2e/phi-scrub.spec.ts` — submits a transcript containing a fake patient name and asserts it does not appear verbatim in the generated draft result page.

### Self-Healing Loop

When making changes and verifying with Playwright:

1. Push the branch → wait for Vercel preview to build
2. Run API tests (no browser needed): `BASE_URL=<vercel-url> npm run e2e:api`
3. Run full browser tests (requires `npx playwright install chromium` first): `BASE_URL=<vercel-url> npm run e2e`
4. If tests fail: read the failure output, fix the code, commit + push, wait for new preview build, re-run
5. Repeat until all tests pass, then mark the task complete

**Note**: The Claude Code sandbox blocks outbound network and browser downloads. Run E2E tests from your local machine or CI against the Vercel preview URL.

Always prefer running E2E against the Vercel preview over local dev for features that depend on the full pipeline (LLM, DB, email).
