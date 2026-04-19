import { test, expect } from "@playwright/test";

const PHI_NAME = "John Smith";
const TRANSCRIPT = `
Attending: So John Smith came in last night with chest pain. Let me give you some feedback on how you handled it.
Resident: Thanks, I appreciate that.
Attending: You did a great job with the history. You asked about John Smith's cardiac risk factors, got a clear timeline, and didn't miss the family history.
Resident: I was trying to be systematic.
Attending: It showed. Your differential was well-reasoned — you led with ACS, considered PE, and ruled out GI causes appropriately. The management plan was solid. You ordered the right investigations and communicated clearly with the team.
Resident: I wasn't sure about the troponin timing.
Attending: That's the one area to work on. You should have repeated the troponin at 3 hours, not 6. Next time, follow the accelerated diagnostic protocol for chest pain. Also, make sure you document your clinical reasoning in the chart — it was clear in person but not captured in writing.
Resident: Got it. I'll review the chest pain pathway.
Attending: Overall, you're performing well. I'd say you can manage these cases with intermittent support.
`.trim();

test.describe("PHI scrubbing in feedback draft", () => {
  test("patient name does not appear in generated draft", async ({ page }) => {
    await page.goto("/upload");

    // Fill in the form
    await page.getByLabel(/resident.*name/i).fill("Dr. Resident Test");
    await page.getByLabel(/resident.*email/i).fill("resident@test.com");
    await page.getByLabel(/attending.*name/i).fill("Dr. Attending Test");
    await page.getByLabel(/attending.*email/i).fill("attending@test.com");

    // Fill transcript — try textarea directly
    const transcriptArea = page.locator("textarea").first();
    await transcriptArea.fill(TRANSCRIPT);

    // Submit
    await page.getByRole("button", { name: /generate|submit|draft/i }).click();

    // Wait for result page
    await page.waitForURL(/\/upload\/result/, { timeout: 30_000 });

    // Grab all visible text on the result page
    const bodyText = await page.locator("body").innerText();

    // Patient name must not appear verbatim in the draft
    expect(bodyText).not.toContain(PHI_NAME);
  });

  test("result page renders EPA and entrustment", async ({ page }) => {
    await page.goto("/upload");

    await page.getByLabel(/resident.*name/i).fill("Dr. Resident Test");
    await page.getByLabel(/resident.*email/i).fill("resident@test.com");
    await page.getByLabel(/attending.*name/i).fill("Dr. Attending Test");
    await page.getByLabel(/attending.*email/i).fill("attending@test.com");

    const transcriptArea = page.locator("textarea").first();
    await transcriptArea.fill(TRANSCRIPT);

    await page.getByRole("button", { name: /generate|submit|draft/i }).click();
    await page.waitForURL(/\/upload\/result/, { timeout: 30_000 });

    const bodyText = await page.locator("body").innerText();

    // Should show an entrustment level
    const entrustmentLevels = ["Intervention", "Direction", "Support", "Autonomy", "Excellence"];
    const hasEntrustment = entrustmentLevels.some((level) => bodyText.includes(level));
    expect(hasEntrustment).toBe(true);
  });
});
