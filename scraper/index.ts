import { chromium } from "playwright";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { EXTRACT_THEATRE, EXTRACT_EXPO, EXTRACT_ACTIVITE, EXTRACT_MIXED } from "./extractors.js";

// ─── Config ──────────────────────────────────────────────────────────
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || "";
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY || "";

if (!SUPABASE_URL || !SUPABASE_KEY || !ANTHROPIC_KEY) {
  console.error("Missing env vars: SUPABASE_URL, SUPABASE_SERVICE_KEY, ANTHROPIC_API_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const anthropic = new Anthropic({ apiKey: ANTHROPIC_KEY });

// Week key = Monday of current week
const now = new Date();
const monday = new Date(now);
monday.setDate(now.getDate() - now.getDay() + 1);
const WEEK_KEY = monday.toISOString().split("T")[0];

// Parse args
const args = process.argv.slice(2);
const categoryFilter = args.includes("--category") ? args[args.indexOf("--category") + 1] : null;

interface Source {
  name: string;
  url: string;
  extract?: string;
  arrondissement?: string;
}

const sources: Record<string, Source[]> = JSON.parse(readFileSync("sources.json", "utf-8"));

// ─── Scrape a page with Playwright ──────────────────────────────────
async function scrapePage(url: string, browser: Awaited<ReturnType<typeof chromium.launch>>): Promise<string> {
  const context = await browser.newContext({
    userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  });
  const page = await context.newPage();

  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
    // Wait a bit for JS rendering
    await page.waitForTimeout(2000);

    // Extract main content text
    const text = await page.evaluate(() => {
      // Remove nav, footer, header, scripts, styles
      const removeSelectors = ["nav", "footer", "header", "script", "style", "noscript", ".cookie", "[class*='cookie']", "[id*='cookie']"];
      removeSelectors.forEach(sel => {
        document.querySelectorAll(sel).forEach(el => el.remove());
      });
      return document.body?.innerText || "";
    });

    await context.close();
    return text.slice(0, 15000); // Limit text size
  } catch (err) {
    await context.close();
    throw err;
  }
}

// ─── Extract with Claude ────────────────────────────────────────────
async function extractWithClaude(prompt: string): Promise<unknown> {
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    messages: [{ role: "user", content: prompt }],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "";
  const cleaned = text.replace(/^```(?:json)?\s*\n?/i, "").replace(/\n?```\s*$/i, "").trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    console.warn("  Failed to parse Claude response:", cleaned.slice(0, 200));
    return null;
  }
}

// ─── Insert into Supabase ───────────────────────────────────────────
interface ShowData {
  title: string;
  description?: string;
  venue?: string;
  arrondissement?: string;
  age_min?: number;
  age_max?: number;
  duration?: string;
  price?: string;
  booking_url?: string;
  dates?: string;
  showtimes?: string;
  tags?: string[];
}

async function insertTheatre(shows: ShowData[]) {
  const rows = shows.map(s => ({
    title: s.title,
    description: s.description || null,
    venue: s.venue || "",
    arrondissement: s.arrondissement || "",
    age_min: s.age_min || 3,
    age_max: s.age_max || 12,
    duration: s.duration || null,
    price: s.price || null,
    booking_url: s.booking_url || null,
    dates: s.dates || null,
    showtimes: s.showtimes || null,
    tags: s.tags || [],
    week_key: WEEK_KEY,
  }));

  const { error } = await supabase.from("theatre_showings").upsert(rows, { onConflict: "title,venue,week_key" });
  if (error) console.error("  DB error (theatre):", error.message);
  else console.log(`  → ${rows.length} spectacles insérés`);
}

async function insertExpo(expos: ShowData[]) {
  const rows = expos.map(e => ({
    title: e.title,
    description: e.description || null,
    venue: e.venue || "",
    arrondissement: e.arrondissement || "",
    age_min: e.age_min || 3,
    age_max: e.age_max || 12,
    duration: e.duration || null,
    price: e.price || null,
    booking_url: e.booking_url || null,
    dates: e.dates || null,
    tags: e.tags || [],
    week_key: WEEK_KEY,
  }));

  const { error } = await supabase.from("expo_showings").upsert(rows, { onConflict: "title,venue,week_key" });
  if (error) console.error("  DB error (expo):", error.message);
  else console.log(`  → ${rows.length} expos insérées`);
}

async function insertActivite(activities: ShowData[]) {
  const rows = activities.map(a => ({
    title: a.title,
    description: a.description || null,
    venue: a.venue || "",
    arrondissement: a.arrondissement || "",
    age_min: a.age_min || 3,
    age_max: a.age_max || 12,
    duration: a.duration || null,
    price: a.price || null,
    booking_url: a.booking_url || null,
    dates: a.dates || null,
    tags: a.tags || [],
    week_key: WEEK_KEY,
  }));

  // activite_showings table might not exist yet — use expo_showings with activite tag
  const { error } = await supabase.from("expo_showings").upsert(
    rows.map(r => ({ ...r, tags: [...(r.tags || []), "activité"] })),
    { onConflict: "title,venue,week_key" }
  );
  if (error) console.error("  DB error (activite):", error.message);
  else console.log(`  → ${rows.length} activités insérées`);
}

// ─── Process a source ───────────────────────────────────────────────
async function processSource(
  source: Source,
  category: string,
  browser: Awaited<ReturnType<typeof chromium.launch>>
) {
  console.log(`\n📄 [${category}] ${source.name}: ${source.url}`);

  try {
    const text = await scrapePage(source.url, browser);
    if (text.length < 100) {
      console.log("  ⚠️ Page trop courte, skip");
      return;
    }
    console.log(`  ✅ Scrapé: ${text.length} chars`);

    // Choose extraction prompt
    const extractType = source.extract || category;
    let prompt: string;
    switch (extractType) {
      case "theatre": prompt = EXTRACT_THEATRE(text, source.url); break;
      case "expo": prompt = EXTRACT_EXPO(text, source.url); break;
      case "activite": prompt = EXTRACT_ACTIVITE(text, source.url); break;
      case "mixed": prompt = EXTRACT_MIXED(text, source.url); break;
      default: prompt = EXTRACT_MIXED(text, source.url);
    }

    const result = await extractWithClaude(prompt) as Record<string, unknown> | null;
    if (!result) return;

    // Insert based on type
    if (extractType === "theatre") {
      const shows = (result as { shows?: ShowData[] }).shows ?? [];
      if (shows.length > 0) await insertTheatre(shows);
      else console.log("  0 spectacles trouvés");
    } else if (extractType === "expo") {
      const expos = (result as { expos?: ShowData[] }).expos ?? [];
      if (expos.length > 0) await insertExpo(expos);
      else console.log("  0 expos trouvées");
    } else if (extractType === "activite") {
      const acts = (result as { activities?: ShowData[] }).activities ?? [];
      if (acts.length > 0) await insertActivite(acts);
      else console.log("  0 activités trouvées");
    } else if (extractType === "mixed") {
      const items = (result as { items?: (ShowData & { type?: string })[] }).items ?? [];
      const theatres = items.filter(i => i.type === "theatre");
      const expos = items.filter(i => i.type === "expo");
      const activites = items.filter(i => i.type === "activite");
      if (theatres.length > 0) await insertTheatre(theatres);
      if (expos.length > 0) await insertExpo(expos);
      if (activites.length > 0) await insertActivite(activites);
      if (items.length === 0) console.log("  0 items trouvés");
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`  ❌ Erreur: ${msg}`);
  }
}

// ─── Main ───────────────────────────────────────────────────────────
async function main() {
  console.log(`\n🚀 Pepite Scraper — Week ${WEEK_KEY}`);
  console.log(`📂 Categories: ${categoryFilter || "all"}\n`);

  const browser = await chromium.launch({ headless: true });

  const categories = categoryFilter
    ? { [categoryFilter]: sources[categoryFilter] || [] }
    : sources;

  let totalSources = 0;
  let totalProcessed = 0;

  for (const [category, categorySource] of Object.entries(categories)) {
    if (!categorySource || categorySource.length === 0) continue;
    console.log(`\n════════════════════════════════════════`);
    console.log(`📁 Catégorie: ${category} (${categorySource.length} sources)`);
    console.log(`════════════════════════════════════════`);

    // Process in batches of 3
    for (let i = 0; i < categorySource.length; i += 3) {
      const batch = categorySource.slice(i, i + 3);
      await Promise.all(batch.map(source => processSource(source, category, browser)));
      totalProcessed += batch.length;

      // Throttle between batches
      if (i + 3 < categorySource.length) {
        await new Promise(r => setTimeout(r, 2000));
      }
    }
    totalSources += categorySource.length;
  }

  await browser.close();

  console.log(`\n✅ Terminé: ${totalProcessed}/${totalSources} sources traitées`);
}

main().catch(err => {
  console.error("Fatal:", err);
  process.exit(1);
});
