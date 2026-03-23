import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getWeekKey(): string {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const week = Math.ceil(
    ((now.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7
  );
  return `${now.getFullYear()}-${String(week).padStart(2, "0")}`;
}

function getNextWeekendDates(): { saturday: string; sunday: string } {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const daysUntilSat = dayOfWeek === 0 ? 6 : 6 - dayOfWeek;
  const sat = new Date(now);
  sat.setDate(now.getDate() + (daysUntilSat === 0 && dayOfWeek === 6 ? 7 : daysUntilSat));
  const sun = new Date(sat);
  sun.setDate(sat.getDate() + 1);
  const fmt = (d: Date) => d.toISOString().split("T")[0];
  return { saturday: fmt(sat), sunday: fmt(sun) };
}

// ─── Firecrawl scraping ───────────────────────────────────────────────────────

async function scrapeUrl(url: string, firecrawlKey: string): Promise<string> {
  const res = await fetch("https://api.firecrawl.dev/v1/scrape", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${firecrawlKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      url,
      formats: ["markdown"],
      onlyMainContent: true,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Firecrawl ${res.status}: ${err}`);
  }
  const data = await res.json();
  return data.data?.markdown ?? data.markdown ?? "";
}

// ─── Gemini extraction ────────────────────────────────────────────────────────

interface ScrapedActivity {
  category: "cinema" | "theatre" | "expo" | "activite";
  title: string;
  description: string;
  location: string;
  arrondissement: string;
  duration: string;
  booking_url: string;
  travel_walk: string;
  travel_bike: string;
  travel_car: string;
  is_exceptional: boolean;
  badge?: string;
  date_start: string;
  date_end: string;
  showtimes: string;
  cinema_name?: string;
  cinema_url?: string;
  source_url: string;
}

async function extractActivities(
  markdown: string,
  sourceUrl: string,
  weekendDates: { saturday: string; sunday: string },
  lovableApiKey: string
): Promise<ScrapedActivity[]> {
  const prompt = `Tu es un assistant qui extrait des activités pour enfants depuis du contenu web scraped.

Voici le contenu de la page ${sourceUrl} :

${markdown.slice(0, 12000)}

---

Extrait UNIQUEMENT les activités pour enfants qui ont lieu le week-end du ${weekendDates.saturday} (samedi) et ${weekendDates.sunday} (dimanche) à Paris.
Ignore tout ce qui n'est pas à Paris ou pas pendant ce week-end.

Pour chaque activité trouvée, retourne un objet JSON avec ces champs EXACTS :
- category: "cinema" | "theatre" | "expo" | "activite"
- title: string (titre de l'activité, SANS emoji)
- description: string (1-2 phrases max, max 8 mots par phrase)
- location: string (nom du lieu)
- arrondissement: string (ex: "6ème", "15ème")
- duration: string (ex: "~1h30", "45 min")
- booking_url: string (URL de réservation directe, ou "" si non disponible)
- travel_walk: string (estimation depuis le 6e arr. ex: "15 min", ou "")
- travel_bike: string (ex: "6 min", ou "")
- travel_car: string (ex: "8 min", ou "")
- is_exceptional: boolean (vrai si hors arrondissements 1-7, 14, 15)
- badge: string (ex: "dessin animé · 45 min" pour cinéma, ou "")
- date_start: string (YYYY-MM-DD)
- date_end: string (YYYY-MM-DD)
- showtimes: string (ex: "Sam 10h15 / Dim 11h00", ou "")
- cinema_name: string (nom du cinéma si category=cinema, sinon "")
- cinema_url: string (URL du cinéma si category=cinema, sinon "")
- source_url: "${sourceUrl}"

Retourne UNIQUEMENT un tableau JSON valide, sans texte avant ou après. Maximum 8 activités.
Si aucune activité n'est trouvée pour ce week-end, retourne [].`;

  const res = await fetch("https://api.lovable.dev/ai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${lovableApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini extraction failed ${res.status}: ${err}`);
  }

  const data = await res.json();
  const raw = data.choices?.[0]?.message?.content ?? "[]";

  try {
    // Handle both array directly or wrapped in an object
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
    // Sometimes model wraps it in { activities: [...] }
    const key = Object.keys(parsed).find((k) => Array.isArray(parsed[k]));
    if (key) return parsed[key];
    return [];
  } catch {
    console.error("JSON parse error:", raw.slice(0, 500));
    return [];
  }
}

// ─── Sources to scrape ────────────────────────────────────────────────────────

const SOURCES = [
  {
    name: "sortiraparis",
    url: "https://www.sortiraparis.com/enfants-famille/activites-sorties-enfants/guides/",
  },
  {
    name: "citizenkid",
    url: "https://www.citizenkid.com/paris/sorties",
  },
  {
    name: "quefaire",
    url: "https://quefaire.paris.fr/selection/enfants",
  },
  {
    name: "parismomes",
    url: "https://parismomes.fr/agenda/",
  },
];

// ─── Main handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const firecrawlKey = Deno.env.get("FIRECRAWL_API_KEY");
  const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  if (!firecrawlKey) {
    return new Response(JSON.stringify({ error: "FIRECRAWL_API_KEY not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  if (!lovableApiKey) {
    return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const weekKey = getWeekKey();
  const weekendDates = getNextWeekendDates();

  // Check if already scraped this week (unless force=true)
  let forceRescrape = false;
  try {
    const body = await req.json().catch(() => ({}));
    forceRescrape = body?.force === true;
  } catch {
    // no body
  }

  if (!forceRescrape) {
    const { data: existing } = await supabase
      .from("scrape_runs")
      .select("id, status")
      .eq("week_key", weekKey)
      .eq("status", "done")
      .single();

    if (existing) {
      return new Response(
        JSON.stringify({ message: "Already scraped this week", weekKey, fromCache: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  }

  // Create a scrape run record
  const { data: runRecord } = await supabase
    .from("scrape_runs")
    .insert({ week_key: weekKey, status: "running" })
    .select()
    .single();

  const runId = runRecord?.id;

  try {
    // Delete old entries for this week if force
    if (forceRescrape) {
      await supabase.from("scraped_activities").delete().eq("week_key", weekKey);
      // also delete old done runs
      await supabase.from("scrape_runs").delete().eq("week_key", weekKey).neq("id", runId);
    }

    const allActivities: ScrapedActivity[] = [];
    const sourcesDone: string[] = [];

    // Scrape each source sequentially (to avoid rate limits)
    for (const source of SOURCES) {
      try {
        console.log(`Scraping ${source.name}: ${source.url}`);
        const markdown = await scrapeUrl(source.url, firecrawlKey);
        if (markdown.length < 200) {
          console.log(`${source.name}: too short, skipping`);
          continue;
        }

        const activities = await extractActivities(markdown, source.url, weekendDates, lovableApiKey);
        console.log(`${source.name}: extracted ${activities.length} activities`);

        allActivities.push(...activities);
        sourcesDone.push(source.name);

        // Small delay between sources
        await new Promise((r) => setTimeout(r, 1000));
      } catch (err) {
        console.error(`Error scraping ${source.name}:`, err);
        // Continue with next source
      }
    }

    // Deduplicate by title (keep first occurrence)
    const seen = new Set<string>();
    const unique = allActivities.filter((a) => {
      const key = a.title.toLowerCase().trim();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Insert into DB
    if (unique.length > 0) {
      const rows = unique.map((a) => ({
        week_key: weekKey,
        category: a.category,
        title: a.title,
        description: a.description,
        location: a.location,
        arrondissement: a.arrondissement,
        duration: a.duration,
        booking_url: a.booking_url,
        travel_walk: a.travel_walk,
        travel_bike: a.travel_bike,
        travel_car: a.travel_car,
        is_exceptional: a.is_exceptional ?? false,
        badge: a.badge,
        date_start: a.date_start,
        date_end: a.date_end,
        showtimes: a.showtimes,
        cinema_name: a.cinema_name,
        cinema_url: a.cinema_url,
        source_url: a.source_url,
        raw_data: a as unknown as Record<string, unknown>,
      }));

      const { error: insertErr } = await supabase.from("scraped_activities").insert(rows);
      if (insertErr) throw new Error(`Insert error: ${insertErr.message}`);
    }

    // Mark run as done
    await supabase
      .from("scrape_runs")
      .update({
        status: "done",
        sources_scraped: sourcesDone,
        activities_found: unique.length,
        finished_at: new Date().toISOString(),
      })
      .eq("id", runId);

    return new Response(
      JSON.stringify({
        success: true,
        weekKey,
        activitiesFound: unique.length,
        sourcesDone,
        weekendDates,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Scrape error:", message);

    if (runId) {
      await supabase
        .from("scrape_runs")
        .update({ status: "error", error_message: message, finished_at: new Date().toISOString() })
        .eq("id", runId);
    }

    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
