// Build-time data generator.
//
// Fetches the IND public register, parses it, and emits two static files:
//   public/sponsors.json           — the full register ([name, kvk] pairs)
//   public/companies-resolved.json — the curated companies with their register
//                                    match resolved, so the app never has to
//                                    verify 280 x 12,793 pairs in the browser.
//
// A browser cannot fetch ind.nl (CORS), so this runs in Node: locally, or
// monthly in GitHub Actions (.github/workflows/refresh-register.yml).
//
//   node scripts/build-data.mjs            # fetch; reuse cache if offline
//   node scripts/build-data.mjs --strict   # fetch; fail loudly (used by CI)
//   node scripts/build-data.mjs --offline  # skip fetch, reuse cache

import * as cheerio from "cheerio";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { COMPANIES } from "../lib/companies.ts";
import { matchScore, normalizeName } from "../lib/normalize.ts";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const PUBLIC = path.join(ROOT, "public");
const SPONSORS_FILE = path.join(PUBLIC, "sponsors.json");
const RESOLVED_FILE = path.join(PUBLIC, "companies-resolved.json");

const WORK_REGISTER_URL =
  "https://ind.nl/en/public-register-recognised-sponsors/public-register-regular-labour-and-highly-skilled-migrants";
const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";

const args = new Set(process.argv.slice(2));
const strict = args.has("--strict");
const offline = args.has("--offline");

function parseRegister(html) {
  const $ = cheerio.load(html);
  const rows = [];
  $("tr").each((_, el) => {
    // Source HTML doubles quotes in some names ('""Aa-Dee""')
    const name = $(el).find("th").first().text().trim().replace(/"{2,}/g, '"');
    const kvk = $(el).find("td").first().text().trim();
    if (name && /^\d{6,9}$/.test(kvk)) rows.push([name, kvk]);
  });
  return rows;
}

function parseIndLastUpdated(html) {
  const m = html.match(/updated on (\d{1,2} \w+ \d{4})/i);
  return m ? m[1] : null;
}

function readCache() {
  if (!fs.existsSync(SPONSORS_FILE)) return null;
  return JSON.parse(fs.readFileSync(SPONSORS_FILE, "utf8"));
}

async function loadRegister() {
  if (offline) {
    const cached = readCache();
    if (!cached) throw new Error("--offline but public/sponsors.json is missing");
    console.log(`· offline: reusing cached register (${cached.count} sponsors)`);
    return { ...cached, changed: false };
  }

  let html;
  try {
    const res = await fetch(WORK_REGISTER_URL, {
      headers: { "User-Agent": USER_AGENT, Accept: "text/html" },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    html = await res.text();
  } catch (err) {
    const msg = `IND fetch failed: ${err.message}`;
    if (strict) throw new Error(msg);
    const cached = readCache();
    if (!cached) throw new Error(`${msg} (and no cache to fall back on)`);
    console.warn(`! ${msg} — reusing cached register (${cached.count} sponsors)`);
    return { ...cached, changed: false };
  }

  const sponsors = parseRegister(html);
  // The work register has thousands of entries; a tiny result means the page
  // structure changed. Never overwrite good data with a bad parse.
  if (sponsors.length < 500) {
    throw new Error(
      `Parse looks wrong (only ${sponsors.length} rows) — IND page structure may have changed. Existing data kept.`
    );
  }

  const previous = readCache();
  const changed =
    !previous || JSON.stringify(previous.sponsors) !== JSON.stringify(sponsors);

  return {
    indLastUpdated: parseIndLastUpdated(html),
    generatedAt: new Date().toISOString(),
    count: sponsors.length,
    sponsors,
    changed,
    previousCount: previous?.count ?? 0,
  };
}

/**
 * Resolve one curated company to a register entry.
 * Ported verbatim from the old /api/discover route so the badge keeps meaning
 * exactly what it meant before: a real match against real register data.
 */
function findInRegister(company, index) {
  const nq = normalizeName(company.registerName ?? company.name);
  if (!nq) return null;

  // 1. Word-boundary containment; prefer the shortest register name
  //    (closest to the parent entity).
  let contained = null;
  for (const s of index) {
    if (s.norm === nq || ` ${s.norm} `.includes(` ${nq} `)) {
      if (!contained || s.norm.length < contained.norm.length) contained = s;
    }
  }
  if (contained) return contained;

  // 2. Fuzzy fallback with a strict threshold.
  let best = null;
  let bestScore = 0;
  for (const s of index) {
    const score = matchScore(nq, s.norm);
    if (score > bestScore) {
      bestScore = score;
      best = s;
    }
  }
  return bestScore >= 0.85 ? best : null;
}

const register = await loadRegister();

fs.mkdirSync(PUBLIC, { recursive: true });

// Reuse the previous generatedAt when the content is byte-identical, so a
// scheduled run doesn't create a diff (and a pointless redeploy) purely from a
// fresh timestamp. "Changed" should mean the register really changed.
const prevSponsors = readCache();
const sponsorsSame =
  prevSponsors &&
  prevSponsors.indLastUpdated === register.indLastUpdated &&
  JSON.stringify(prevSponsors.sponsors) === JSON.stringify(register.sponsors);

fs.writeFileSync(
  SPONSORS_FILE,
  JSON.stringify({
    indLastUpdated: register.indLastUpdated,
    generatedAt: sponsorsSame ? prevSponsors.generatedAt : register.generatedAt,
    count: register.count,
    sponsors: register.sponsors,
  })
);

// Resolve every curated company against the register.
const index = register.sponsors.map(([name, kvk]) => ({
  name,
  kvk,
  norm: normalizeName(name),
}));

const resolved = COMPANIES.map((c) => {
  const match = findInRegister(c, index);
  return {
    ...c,
    sponsor: match ? { name: match.name, kvk: match.kvk } : null,
  };
});

const prevResolved = fs.existsSync(RESOLVED_FILE)
  ? JSON.parse(fs.readFileSync(RESOLVED_FILE, "utf8"))
  : null;
const resolvedSame =
  prevResolved &&
  prevResolved.indLastUpdated === register.indLastUpdated &&
  JSON.stringify(prevResolved.companies) === JSON.stringify(resolved);

fs.writeFileSync(
  RESOLVED_FILE,
  JSON.stringify({
    indLastUpdated: register.indLastUpdated,
    generatedAt: resolvedSame
      ? prevResolved.generatedAt
      : register.generatedAt,
    companies: resolved,
  })
);

const verified = resolved.filter((c) => c.sponsor).length;
const unverified = resolved.filter((c) => !c.sponsor).map((c) => c.name);

console.log(`✓ sponsors.json           ${register.count} sponsors`);
console.log(
  `✓ companies-resolved.json ${verified}/${resolved.length} verified` +
    (unverified.length ? `\n! UNVERIFIED: ${unverified.join(", ")}` : "")
);
if (register.changed && register.previousCount) {
  const delta = register.count - register.previousCount;
  console.log(
    `· register changed: ${register.previousCount} → ${register.count} (${delta > 0 ? "+" : ""}${delta})`
  );
}
