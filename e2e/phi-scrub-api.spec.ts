import { test, expect } from "@playwright/test";

const PHI_NAME = "John Smith";
const TRANSCRIPT = `
Attending: So John Smith came in last night with chest pain. Let me give you some feedback on how you handled it.
Resident: Thanks, I appreciate that.
Attending: You did a great job with the history. You asked about John Smith's cardiac risk factors, got a clear timeline, and did not miss the family history.
Resident: I was trying to be systematic.
Attending: It showed. Your differential was well-reasoned — you led with ACS, considered PE, and ruled out GI causes appropriately. The management plan was solid. You ordered the right investigations and communicated clearly with the team.
Resident: I was not sure about the troponin timing.
Attending: That's the one area to work on. You should have repeated the troponin at 3 hours, not 6. Next time, follow the accelerated diagnostic protocol for chest pain. Also make sure you document your clinical reasoning in the chart — it was clear in person but not captured in writing.
Resident: Got it. I will review the chest pain pathway.
Attending: Overall, you are performing well. I would say you can manage these cases with intermittent support.
`.trim();

test.describe("PHI scrubbing — API level (no browser needed)", () => {
  test("draft API: patient name scrubbed from all text fields", async ({ request }) => {
    const resp = await request.post("/api/sessions/draft-and-email", {
      data: {
        residentName: "Dr. Resident Test",
        residentEmail: "resident@test.com",
        attendingName: "Dr. Attending Test",
        attendingEmail: "attending@test.com",
        context: "E2E PHI scrub test",
        transcript: TRANSCRIPT
      }
    });

    expect(resp.ok()).toBeTruthy();
    const body = await resp.json();
    const draft = body.draft;

    const allText = [
      draft.summaryComment ?? "",
      ...(draft.strengths ?? []),
      ...(draft.improvements ?? []),
      ...(draft.nextSteps ?? []),
      ...(draft.evidenceQuotes ?? []),
      draft.meta?.epa_rationale ?? ""
    ].join("\n");

    expect(allText).not.toContain(PHI_NAME);
    expect(allText).not.toContain("John Smith");
  });

  test("draft API: returns valid entrustment level", async ({ request }) => {
    const resp = await request.post("/api/sessions/draft-and-email", {
      data: {
        residentName: "Dr. Resident Test",
        residentEmail: "resident@test.com",
        attendingName: "Dr. Attending Test",
        attendingEmail: "attending@test.com",
        transcript: TRANSCRIPT
      }
    });

    expect(resp.ok()).toBeTruthy();
    const body = await resp.json();
    const validLevels = ["Intervention", "Direction", "Support", "Autonomy", "Excellence"];
    expect(validLevels).toContain(body.draft.entrustment);
  });
});
