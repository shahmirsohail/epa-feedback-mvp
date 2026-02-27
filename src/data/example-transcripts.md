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

---

## 13) Long-form complex ED debrief (stress test)
**Expected direction:** Likely `FOD-1` with plausible secondary overlap (`FOD-2C`, `FOD-5`, `FOD-2B`), confidence should depend on rationale quality.

**Transcript**
Attending: "Let’s do a full debrief of the shift, from triage to handover. I want your self-assessment first: where were you strong, where were you uncertain, and where did safety feel fragile?"
Resident: "I think I prioritized acuity reasonably, but I felt task-saturated during the 16:00 to 18:00 surge. We had chest pain in Bed 12, septic shock concern in Bed 3, postpartum headache in Bed 15, and an elderly delirium case in Bed 7. I did well on early ECG and initial escalation, but I noticed cognitive drift toward disposition pressure when the waiting room climbed."
Attending: "Good start. Walk me through Bed 12 in detail. Don’t skip your differential evolution."
Resident: "Fifty-eight-year-old with central chest pressure radiating to jaw, nausea, diaphoresis, borderline hypotension after sublingual nitro from EMS. I treated as high-risk ACS until proven otherwise: monitor, repeat ECGs, serial high-sensitivity troponins, focused exam for heart failure signs, and early nurse communication for q15 vitals. Differential also included aortic syndrome and PE because pain onset was abrupt while lifting and he described a tearing quality for about a minute before pressure pattern dominated. I considered dissection less likely after exam and CXR, but I documented why it stayed in differential pending reassessment."
Attending: "You escalated quickly, which was excellent. Where did I have to prompt you?"
Resident: "I initially framed disposition too early—said if second troponin is negative we might discharge with close follow-up. You challenged me to reframe around dynamic risk, persistent symptoms, and overnight access barriers. I realized I was unconsciously optimizing flow over risk."
Attending: "Exactly. Throughput pressure is real, but disposition language can anchor teams. Next case: Bed 3, presumed sepsis. What happened?"
Resident: "Seventy-three-year-old with fever, confusion, hypotension, tachypnea. I activated sepsis pathway, broad-spectrum antibiotics after blood cultures, fluid bolus adjusted for probable heart failure history, lactate, and early vasopressor discussion when MAP remained low. I asked respiratory therapy for VBG trend and oxygen titration. I think I communicated urgency well, but I was slower than ideal to assign closed-loop task ownership, so duplicate orders happened once and one repeat pressure was delayed."
Attending: "Your physiology reasoning was solid. Team leadership under noise needs sharpening. I heard you ask for ‘someone to repeat vitals,’ but no named owner. What would better sound like?"
Resident: "‘Nurse Patel, please repeat BP in five minutes and tell me directly if MAP stays under 65.’ Then I should repeat back the contingency in one sentence."
Attending: "Good. Bed 15 postpartum headache—this one matters because misses can be catastrophic."
Resident: "Eight days postpartum, severe headache, photophobia, elevated blood pressure, nausea. I considered migraine and post-dural puncture headache too early and should have foregrounded postpartum preeclampsia, CVST, and intracranial hemorrhage sooner. After your prompt, I repeated neuro exam, ordered urgent labs including liver profile and urine protein ratio, called OB early, and discussed neuroimaging pathway with radiology. I delayed magnesium discussion by around twenty minutes; that’s the part I’m least comfortable about."
Attending: "I agree with your self-assessment. You recovered well, but initial framing was too benign for the context. What language did you use with the patient once you pivoted?"
Resident: "I said: ‘Most headaches are not dangerous, but in the postpartum period your symptoms can signal serious complications. We’re treating this urgently while we run tests to identify the cause quickly.’ She seemed anxious but understood why we broadened care."
Attending: "That communication was clear and compassionate. Keep that wording template. Now Bed 7, delirium after a fall."
Resident: "I initially over-focused on trauma imaging because of anticoagulation history. CT was negative and I almost stopped the diagnostic search. After your cue, I reframed delirium as syndrome: infection, urinary retention, medication effects, pain, dehydration, constipation, hypoxia, and environmental disorientation. Collateral from daughter revealed recent anticholinergic sleep aid and baseline hearing impairment. We addressed retention, medication review, orientation aids, and avoided restraints. I regret that my first wording implied restraints too early before trying least-restrictive measures."
Attending: "Important insight. Policy and culture follow language. Also your documentation captured tests but not your collateral reasoning. Why does that matter?"
Resident: "Because the chart then under-represents risk reasoning and can mislead overnight teams about why we chose non-pharmacologic delirium strategies first. It also weakens handover quality if the note reads like a checklist instead of a clinical narrative."
Attending: "Exactly. Let’s talk handover itself. Your verbal sign-out had strengths and gaps."
Resident: "Strengths: I used one-liner plus active problems, flagged pending troponin and repeat lactate, and gave clear triggers for escalation in Bed 3 if vasopressor threshold crossed. Gaps: I rushed code-status summary on two patients and forgot to explicitly state uncertainty for postpartum headache differential, which made the plan sound narrower than intended."
Attending: "That’s the key: communicate uncertainty explicitly, not implicitly. Under fatigue, teams hear certainty unless you name alternatives. What about procedures today?"
Resident: "I did one ultrasound-guided peripheral IV and one simple laceration repair. IV first pass failed because my probe-hand drifted and I lost tip visualization. Second pass succeeded after lowering entry angle and narrating landmarks out loud. Laceration repair was technically fine, but my consent explanation was rushed because family pressure was rising and I didn’t pause for questions."
Attending: "Technical competence is progressing. Communication during procedures is your next step. Now professionalism: any interaction you want to revisit?"
Resident: "I was abrupt with respiratory therapy when an ABG was delayed. I apologized, but I still own that tone. I need a stress-reset phrase before speaking when multiple alarms are firing."
Attending: "Good repair and good awareness. Let’s convert this into concrete goals for next week."
Resident: "Goal one: for high-risk presentations—chest pain, severe headache, altered mental status—I will do a 20-second ‘can’t-miss’ diagnostic timeout before discussing discharge. Goal two: use named closed-loop assignments for reassessments when vitals are unstable. Goal three: during handover I will include code status, uncertainty statement, and escalation triggers for every active patient."
Attending: "Add a fourth: special-population trigger. For postpartum, frail geriatric delirium, and immunocompromised fever, broaden early and consult earlier than feels comfortable. Don’t wait for complete certainty."
Resident: "Agreed. I’ll also ask the senior to audit two of my handovers and two bedside risk conversations using teach-back so I get objective feedback."
Attending: "Excellent. Final entrustment summary: you are approaching autonomy in routine acute care if cognitive load is moderate. Under high task density, you still need intermittent support to maintain prioritization, explicit uncertainty communication, and closed-loop leadership. Your trajectory is strong because you’re reflective, coachable, and you make real-time corrections."
Resident: "Thank you. That’s specific and actionable—I’ll carry these goals on my shift card and review after each block."
