# Example Feedback Transcripts for EPA Classification Testing

Use these mock attending–resident feedback snippets in the **Upload/paste transcript** flow to test EPA mapping behavior.

> Note: These are synthetic examples with no real patient identifiers.

---

## 1) Likely FOD-1 (acute presentation)
**Expected direction:** `FOD-1`

**Transcript**
Attending: "Walk me through your assessment of the patient with sudden shortness of breath and chest pain in triage."
Resident: "I prioritized airway, breathing, circulation, got vitals and ECG within minutes, and started a focused differential for ACS, PE, and pneumothorax."
Attending: "Good start. You also ordered troponins and CXR quickly. Next time, state your immediate management plan earlier while waiting for confirmatory tests."

---

## 2) Likely FOD-2A (inpatient assessment/management)
**Expected direction:** `FOD-2A`

**Transcript**
Attending: "On rounds, your update on bed 14 was organized."
Resident: "I reviewed overnight vitals, adjusted diuretics for volume overload, and updated the problem list with acute kidney injury and heart failure exacerbation."
Attending: "Your plan was appropriate and you identified monitoring parameters clearly. Keep tightening your prioritized assessment before listing all secondary issues."

---

## 3) Likely FOD-2B (inpatient communication with patient/family)
**Expected direction:** `FOD-2B`

**Transcript**
Attending: "I observed your family meeting this afternoon."
Resident: "I explained why we were switching antibiotics, checked for understanding, and answered the daughter's questions about expected recovery."
Attending: "You used plain language well. Next step is to pause more and ask what matters most to them before finalizing the care plan."

---

## 4) Likely FOD-2C (handover)
**Expected direction:** `FOD-2C`

**Transcript**
Attending: "Your signover to the night team was concise."
Resident: "I used SBAR, flagged pending blood cultures, and highlighted that if the blood pressure drops again they should reassess lactate and call ICU early."
Attending: "Great anticipation of contingencies. Ensure every handover includes a one-line code status summary."

---

## 5) Likely FOD-3 (consultation and integrating recommendations)
**Expected direction:** `FOD-3`

**Transcript**
Attending: "Tell me how you handled the GI bleed consult."
Resident: "I called GI with a focused question, shared hemodynamics and hemoglobin trend, then integrated their endoscopy timing and transfusion threshold recommendations into our plan."
Attending: "Excellent. Continue documenting why consultant recommendations were adopted or deferred."

---

## 6) Likely FOD-4 (discharge planning)
**Expected direction:** `FOD-4`

**Transcript**
Attending: "I liked your discharge workflow for Mr. K."
Resident: "I completed medication reconciliation, arranged follow-up in one week, and used teach-back to confirm he understood red flags and when to return."
Attending: "Strong discharge communication. Next time involve pharmacy earlier when there are multiple medication changes."

---

## 7) Likely FOD-5 (unstable patient)
**Expected direction:** `FOD-5`

**Transcript**
Attending: "During the rapid response, what was your approach?"
Resident: "The patient became hypotensive and confused. I called for help, started fluid bolus, reassessed airway and perfusion, and prepared vasopressors while arranging ICU transfer."
Attending: "You escalated appropriately and stayed calm. Keep verbalizing your differential in real time so the team can align quickly."

---

## 8) Likely FOD-6 (goals of care)
**Expected direction:** `FOD-6`

**Transcript**
Attending: "How did the code status conversation go?"
Resident: "I discussed prognosis and treatment options with the patient and substitute decision maker, explored values, and documented a comfort-focused plan with DNR status."
Attending: "You handled sensitive communication respectfully. Continue checking for emotional processing and revisit goals as clinical status changes."

---

## 9) Likely FOD-7 (learning needs/reflection)
**Expected direction:** `FOD-7`

**Transcript**
Attending: "What did you identify as your learning goal after this case?"
Resident: "I realized I was weak on hyponatremia workup, so I reviewed guidelines tonight and made a quick algorithm card for tomorrow's admissions."
Attending: "Great self-directed improvement. Bring one teaching pearl from your review to rounds tomorrow."

---

## 10) Likely COD-5 (procedure)
**Expected direction:** `COD-5`

**Transcript**
Attending: "Let's debrief your paracentesis."
Resident: "I obtained consent, used ultrasound to mark the pocket, maintained sterile technique, and removed fluid without immediate complications."
Attending: "Solid procedural flow. Keep refining your pre-procedure timeout script so the team hears the safety checks clearly."

---

## 11) Likely COD-8 (safety incident disclosure)
**Expected direction:** `COD-8`

**Transcript**
Attending: "Can you summarize the medication incident disclosure?"
Resident: "I informed the patient that the wrong dose was given, apologized, explained potential effects, and reviewed our monitoring and prevention steps. I also filed the safety report."
Attending: "Good transparency and ownership. Next time invite the patient to ask questions earlier in the conversation."

---

## 12) Deliberately mixed/ambiguous case
**Expected direction:** Could map to `FOD-2B`, `FOD-6`, or low-confidence/null EPA

**Transcript**
Attending: "You had a difficult conversation with the family and then handed over quickly before call."
Resident: "I updated them on prognosis, discussed preferences, and mentioned the overnight monitoring plan to the junior resident."
Attending: "Good effort. Your communication was empathetic, but the goals-of-care elements and handover details were both incomplete."
