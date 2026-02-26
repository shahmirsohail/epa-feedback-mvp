export type ExampleTranscript = {
  id: string;
  label: string;
  expectedEpa: string;
  transcript: string;
};

export const exampleTranscripts: ExampleTranscript[] = [
  {
    id: "fod-1-acute",
    label: "Acute SOB + chest pain",
    expectedEpa: "FOD-1",
    transcript:
      'Attending: "Walk me through your assessment of the patient with sudden shortness of breath and chest pain in triage."\nResident: "I prioritized airway, breathing, circulation, got vitals and ECG within minutes, and started a focused differential for ACS, PE, and pneumothorax."\nAttending: "Good start. You also ordered troponins and CXR quickly. Next time, state your immediate management plan earlier while waiting for confirmatory tests."'
  },
  {
    id: "fod-2a-rounds",
    label: "Inpatient rounds update",
    expectedEpa: "FOD-2A",
    transcript:
      'Attending: "On rounds, your update on bed 14 was organized."\nResident: "I reviewed overnight vitals, adjusted diuretics for volume overload, and updated the problem list with acute kidney injury and heart failure exacerbation."\nAttending: "Your plan was appropriate and you identified monitoring parameters clearly. Keep tightening your prioritized assessment before listing all secondary issues."'
  },
  {
    id: "fod-2b-family",
    label: "Family communication",
    expectedEpa: "FOD-2B",
    transcript:
      'Attending: "I observed your family meeting this afternoon."\nResident: "I explained why we were switching antibiotics, checked for understanding, and answered the daughter\'s questions about expected recovery."\nAttending: "You used plain language well. Next step is to pause more and ask what matters most to them before finalizing the care plan."'
  },
  {
    id: "fod-2c-handover",
    label: "Signover to night team",
    expectedEpa: "FOD-2C",
    transcript:
      'Attending: "Your signover to the night team was concise."\nResident: "I used SBAR, flagged pending blood cultures, and highlighted that if the blood pressure drops again they should reassess lactate and call ICU early."\nAttending: "Great anticipation of contingencies. Ensure every handover includes a one-line code status summary."'
  },
  {
    id: "fod-3-consult",
    label: "GI consult integration",
    expectedEpa: "FOD-3",
    transcript:
      'Attending: "Tell me how you handled the GI bleed consult."\nResident: "I called GI with a focused question, shared hemodynamics and hemoglobin trend, then integrated their endoscopy timing and transfusion threshold recommendations into our plan."\nAttending: "Excellent. Continue documenting why consultant recommendations were adopted or deferred."'
  },
  {
    id: "fod-4-discharge",
    label: "Discharge planning",
    expectedEpa: "FOD-4",
    transcript:
      'Attending: "I liked your discharge workflow for Mr. K."\nResident: "I completed medication reconciliation, arranged follow-up in one week, and used teach-back to confirm he understood red flags and when to return."\nAttending: "Strong discharge communication. Next time involve pharmacy earlier when there are multiple medication changes."'
  },
  {
    id: "fod-5-unstable",
    label: "Rapid response unstable patient",
    expectedEpa: "FOD-5",
    transcript:
      'Attending: "During the rapid response, what was your approach?"\nResident: "The patient became hypotensive and confused. I called for help, started fluid bolus, reassessed airway and perfusion, and prepared vasopressors while arranging ICU transfer."\nAttending: "You escalated appropriately and stayed calm. Keep verbalizing your differential in real time so the team can align quickly."'
  },
  {
    id: "fod-6-goc",
    label: "Goals of care discussion",
    expectedEpa: "FOD-6",
    transcript:
      'Attending: "How did the code status conversation go?"\nResident: "I discussed prognosis and treatment options with the patient and substitute decision maker, explored values, and documented a comfort-focused plan with DNR status."\nAttending: "You handled sensitive communication respectfully. Continue checking for emotional processing and revisit goals as clinical status changes."'
  },
  {
    id: "fod-7-learning",
    label: "Learning need reflection",
    expectedEpa: "FOD-7",
    transcript:
      'Attending: "What did you identify as your learning goal after this case?"\nResident: "I realized I was weak on hyponatremia workup, so I reviewed guidelines tonight and made a quick algorithm card for tomorrow\'s admissions."\nAttending: "Great self-directed improvement. Bring one teaching pearl from your review to rounds tomorrow."'
  },
  {
    id: "cod-5-procedure",
    label: "Paracentesis debrief",
    expectedEpa: "COD-5",
    transcript:
      'Attending: "Let\'s debrief your paracentesis."\nResident: "I obtained consent, used ultrasound to mark the pocket, maintained sterile technique, and removed fluid without immediate complications."\nAttending: "Solid procedural flow. Keep refining your pre-procedure timeout script so the team hears the safety checks clearly."'
  },
  {
    id: "cod-8-disclosure",
    label: "Medication safety disclosure",
    expectedEpa: "COD-8",
    transcript:
      'Attending: "Can you summarize the medication incident disclosure?"\nResident: "I informed the patient that the wrong dose was given, apologized, explained potential effects, and reviewed our monitoring and prevention steps. I also filed the safety report."\nAttending: "Good transparency and ownership. Next time invite the patient to ask questions earlier in the conversation."'
  },
  {
    id: "mixed-ambiguous",
    label: "Ambiguous family + handover",
    expectedEpa: "Ambiguous (FOD-2B/FOD-6/low-confidence)",
    transcript:
      'Attending: "You had a difficult conversation with the family and then handed over quickly before call."\nResident: "I updated them on prognosis, discussed preferences, and mentioned the overnight monitoring plan to the junior resident."\nAttending: "Good effort. Your communication was empathetic, but the goals-of-care elements and handover details were both incomplete."'
  }
];
