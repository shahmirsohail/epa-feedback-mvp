import { test, expect } from "@playwright/test";
import { exampleTranscripts } from "../src/data/example-transcripts";

const VALID_ENTRUSTMENTS = ["Intervention", "Direction", "Support", "Autonomy", "Excellence"];

for (const example of exampleTranscripts) {
  test(`[${example.id}] LLM maps to expected EPA: ${example.expectedEpa}`, async ({ request }) => {
    const resp = await request.post("/api/sessions/draft-and-email", {
      data: {
        residentName: "Test Resident",
        residentEmail: "resident@test.internal",
        attendingName: "Test Attending",
        attendingEmail: "attending@test.internal",
        context: `Internal test: ${example.id}`,
        transcript: example.transcript
      }
    });

    expect(resp.ok()).toBeTruthy();
    const body = await resp.json();

    expect(body.draft).toBeDefined();
    expect(VALID_ENTRUSTMENTS).toContain(body.draft.entrustment);
    expect(body.draft.summaryComment?.length).toBeGreaterThan(10);

    console.log(
      `[${example.id}] Expected: ${example.expectedEpa} | Got: ${body.epaId} | Entrustment: ${body.draft.entrustment} | Match: ${body.epaId === example.expectedEpa}`
    );

    const isAmbiguous = example.expectedEpa.includes("/") || example.expectedEpa === "ambiguous";
    if (!isAmbiguous) {
      expect(body.epaId).toBe(example.expectedEpa);
    }
  });
}
