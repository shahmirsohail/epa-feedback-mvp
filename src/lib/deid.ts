export type Redaction = {
  original: string;
  replacement: string;
  type: "NAME" | "DATE" | "ID" | "LOCATION" | "CONTACT" | "OTHER";
};

function replaceAllSafe(text: string, pattern: RegExp, makeReplacement: (m: RegExpExecArray) => Redaction) {
  const redactions: Redaction[] = [];
  let out = text;
  // iterate all matches from original text, but apply on out carefully (best-effort)
  const matches = Array.from(text.matchAll(pattern));
  for (const m of matches) {
    const original = m[0];
    if (!original) continue;
    const r = makeReplacement(m as unknown as RegExpExecArray);
    redactions.push(r);
    out = out.split(original).join(r.replacement);
  }
  return { out, redactions };
}

export function deidentify(raw: string) {
  let text = raw;
  let redactions: Redaction[] = [];

  // Emails
  {
    const r = replaceAllSafe(text, /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, (m) => ({
      original: m[0],
      replacement: "[EMAIL]",
      type: "CONTACT"
    }));
    text = r.out; redactions = redactions.concat(r.redactions);
  }

  // Phone numbers (very rough)
  {
    const r = replaceAllSafe(text, /\b(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g, (m) => ({
      original: m[0],
      replacement: "[PHONE]",
      type: "CONTACT"
    }));
    text = r.out; redactions = redactions.concat(r.redactions);
  }

  // MRN-ish / IDs (7-10 digits)
  {
    const r = replaceAllSafe(text, /\b\d{7,10}\b/g, (m) => ({
      original: m[0],
      replacement: "[ID]",
      type: "ID"
    }));
    text = r.out; redactions = redactions.concat(r.redactions);
  }

  // Dates (basic)
  {
    const r = replaceAllSafe(text, /\b(?:\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\s+\d{1,2}(?:,\s*\d{4})?)\b/gi, (m) => ({
      original: m[0],
      replacement: "[DATE]",
      type: "DATE"
    }));
    text = r.out; redactions = redactions.concat(r.redactions);
  }

  // Names (best-effort): patterns like "Mr. Smith", "Ms Jones", "John Smith"
  {
    const r = replaceAllSafe(text, /\b(Mr\.?|Ms\.?|Mrs\.?|Mx\.?|Dr\.?)\s+[A-Z][a-z]+\b/g, (m) => ({
      original: m[0],
      replacement: "[NAME]",
      type: "NAME"
    }));
    text = r.out; redactions = redactions.concat(r.redactions);
  }
  {
    const r = replaceAllSafe(text, /\b[A-Z][a-z]{2,}\s+[A-Z][a-z]{2,}\b/g, (m) => ({
      original: m[0],
      replacement: "[NAME]",
      type: "NAME"
    }));
    text = r.out; redactions = redactions.concat(r.redactions);
  }

  // Hospital/locations (very rough)
  {
    const r = replaceAllSafe(text, /\b(?:Toronto|Ontario|Mississauga|Brampton|Scarborough|Etobicoke|Hamilton|Ottawa|ICU|ED|Emergency|Ward \d+|Room \d+)\b/gi, (m) => ({
      original: m[0],
      replacement: "[LOCATION]",
      type: "LOCATION"
    }));
    text = r.out; redactions = redactions.concat(r.redactions);
  }

  return {
    deidentified: text,
    redactions
  };
}
