// Normalization + fuzzy matching so "adyen" finds "Adyen N.V."
// and "booking.com" finds "Booking.com B.V.".

const LEGAL_TOKENS = new Set([
  "bv", "nv", "cv", "vof", "ua", "io", "sa", "se", "ag", "gmbh", "inc",
  "ltd", "llc", "llp", "plc", "corp", "co", "coöperatie", "cooperatie",
  "cooperatief", "coöperatief", "stichting", "holding", "holdings",
  "groep", "group", "nederland", "netherlands", "holland", "europe",
  "european", "benelux", "international", "intl",
]);

export function normalizeName(raw: string): string {
  const tokens = raw
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // strip combining diacritics
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .filter(Boolean);
  // Drop legal-form/filler tokens and stray single letters ("B.V."
  // tokenizes to "b v"), so "Adyen N.V." and "adyen" compare equal.
  const filtered = tokens.filter((t) => t.length > 1 && !LEGAL_TOKENS.has(t));
  // Names made up entirely of such tokens (e.g. "H & M") keep everything.
  return (filtered.length > 0 ? filtered : tokens).join(" ");
}

function bigrams(s: string): Map<string, number> {
  const m = new Map<string, number>();
  const t = ` ${s} `;
  for (let i = 0; i < t.length - 1; i++) {
    const b = t.slice(i, i + 2);
    m.set(b, (m.get(b) ?? 0) + 1);
  }
  return m;
}

/** Sørensen–Dice similarity over character bigrams, 0..1 */
export function diceSimilarity(a: string, b: string): number {
  if (!a || !b) return 0;
  if (a === b) return 1;
  const ba = bigrams(a);
  const bb = bigrams(b);
  let overlap = 0;
  let totalA = 0;
  let totalB = 0;
  for (const [, n] of ba) totalA += n;
  for (const [, n] of bb) totalB += n;
  for (const [g, n] of ba) overlap += Math.min(n, bb.get(g) ?? 0);
  return (2 * overlap) / (totalA + totalB);
}

/**
 * Score how well a query matches a sponsor's normalized name.
 * 1.0 exact, ~0.9+ containment (weighted by length ratio), else dice.
 */
export function matchScore(normQuery: string, normName: string): number {
  if (!normQuery || !normName) return 0;
  if (normQuery === normName) return 1;
  if (normName.includes(normQuery) || normQuery.includes(normName)) {
    const ratio =
      Math.min(normQuery.length, normName.length) /
      Math.max(normQuery.length, normName.length);
    return 0.7 + 0.28 * ratio;
  }
  return diceSimilarity(normQuery, normName);
}
