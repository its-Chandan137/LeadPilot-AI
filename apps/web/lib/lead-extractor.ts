export type ExtractedLead = {
  name?: string;
  email?: string;
  phone?: string;
};

const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;

const PHONE_REGEX = /(?:\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}/;

const NAME_PATTERNS = [
  /my name is ([A-Z][a-z]+(?: [A-Z][a-z]+)*)/i,
  /i'?m ([A-Z][a-z]+(?: [A-Z][a-z]+)*)/i,
  /this is ([A-Z][a-z]+(?: [A-Z][a-z]+)*)/i,
  /i am ([A-Z][a-z]+(?: [A-Z][a-z]+)*)/i,
];

function extractEmail(text: string): string | undefined {
  const match = text.match(EMAIL_REGEX);
  return match ? match[0].toLowerCase() : undefined;
}

function extractPhone(text: string): string | undefined {
  const match = text.match(PHONE_REGEX);
  if (!match) return undefined;
  const cleaned = match[0].replace(/[^0-9+]/g, "");
  return cleaned.length >= 7 ? cleaned : undefined;
}

function extractName(text: string): string | undefined {
  for (const pattern of NAME_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      return match[1].trim();
    }
  }
  return undefined;
}

export function extractLeadInfo(text: string): ExtractedLead {
  const name = extractName(text);
  const email = extractEmail(text);
  const phone = extractPhone(text);

  return {
    ...(name && { name }),
    ...(email && { email }),
    ...(phone && { phone }),
  };
}

export function hasLeadData(data: ExtractedLead): boolean {
  return !!(data.name || data.email || data.phone);
}
