import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ─── Sources ──────────────────────────────────────────────────────────────────
// Sélection des meilleures sources par catégorie depuis la liste des 113 sites.
// On fait tourner les sources par jour pour couvrir plus de sources sur la semaine
// sans exploser le quota Firecrawl.

const ALL_SOURCES = [
  // ── Agrégateurs (agenda hebdo enfants) ── priorité max
  { name: "sortiraparis",    url: "https://www.sortiraparis.com/enfant-famille",           category: "aggregator", priority: 1 },
  { name: "parismomes",      url: "https://parismomes.fr/agenda/",                          category: "aggregator", priority: 1 },
  { name: "citizenkid",      url: "https://www.citizenkid.com/paris",                       category: "aggregator", priority: 1 },
  { name: "quefaire",        url: "https://www.paris.fr/quefaire/semaine-enfants",          category: "aggregator", priority: 1 },
  { name: "kidiklik",        url: "https://paris.kidiklik.fr",                              category: "aggregator", priority: 2 },
  { name: "offi",            url: "https://www.offi.fr/enfants",                            category: "aggregator", priority: 2 },
  { name: "agendaculturel",  url: "https://75.agendaculturel.fr",                           category: "aggregator", priority: 2 },
  { name: "timeout",         url: "https://www.timeout.fr/paris/enfants",                  category: "aggregator", priority: 2 },
  { name: "familinparis",    url: "https://www.familinparis.fr",                            category: "aggregator", priority: 3 },
  { name: "lamuse",          url: "https://www.lamuse.fr",                                  category: "aggregator", priority: 3 },
  { name: "figaro",          url: "https://www.lefigaro.fr/sortir-paris",                  category: "aggregator", priority: 3 },

  // ── Billetterie (spectacles enfants) ──
  { name: "billetreduc",     url: "https://www.billetreduc.com/spectacles-enfants",        category: "ticketing",  priority: 1 },
  { name: "theatreonline",   url: "https://www.theatreonline.com",                          category: "ticketing",  priority: 1 },
  { name: "fnacspectacles",  url: "https://www.fnacspectacles.com",                        category: "ticketing",  priority: 2 },
  { name: "billetnet",       url: "https://www.billetnet.fr/billetterie/enfants/reservations/billets", category: "ticketing", priority: 2 },

  // ── Cinéma ──
  { name: "allocine",        url: "https://www.allocine.fr",                               category: "cinema",     priority: 1 },
  { name: "mk2",             url: "https://www.mk2.com",                                   category: "cinema",     priority: 1 },
  { name: "forumdesimages",  url: "https://www.forumdesimages.fr",                         category: "cinema",     priority: 2 },
  { name: "cinematheque",    url: "https://www.cinemathequefrancaise.fr",                  category: "cinema",     priority: 2 },

  // ── Théâtres jeune public ──
  { name: "mouffetard",      url: "https://www.mouffetard-paris.com",                     category: "theatre",    priority: 1 },
  { name: "lucernaire",      url: "https://www.lucernaire.fr",                             category: "theatre",    priority: 1 },
  { name: "theatredunois",   url: "https://www.theatredunois.org",                         category: "theatre",    priority: 1 },
  { name: "grandparquet",    url: "https://www.grandparquet.com",                          category: "theatre",    priority: 2 },
  { name: "gaitemontparnasse", url: "https://www.gaite-montparnasse.com",                 category: "theatre",    priority: 2 },
  { name: "lespetitsbaudets", url: "https://www.lespetitsbaudets.fr",                     category: "theatre",    priority: 2 },
  { name: "theatreestral",   url: "https://www.theatreastral.com",                         category: "theatre",    priority: 3 },
  { name: "doublefond",      url: "https://www.doublefond.com",                            category: "theatre",    priority: 3 },

  // ── Musées / Expos ──
  { name: "museenherbe",     url: "https://www.musee-en-herbe.com",                       category: "museum",     priority: 1 },
  { name: "philharmonie",    url: "https://philharmoniedeparis.fr",                        category: "museum",     priority: 1 },
  { name: "centrepompidou",  url: "https://www.centrepompidou.fr",                        category: "museum",     priority: 1 },
  { name: "citesciences",    url: "https://www.cite-sciences.fr",                         category: "museum",     priority: 1 },
  { name: "le104",           url: "https://www.104.fr",                                   category: "museum",     priority: 2 },
  { name: "museeorsay",      url: "https://www.musee-orsay.fr",                           category: "museum",     priority: 2 },
  { name: "quaibranly",      url: "https://www.quaibranly.fr",                            category: "museum",     priority: 2 },
  { name: "museedelillusion", url: "https://www.museedelillusion.fr",                     category: "museum",     priority: 3 },
  { name: "paradoxmuseum",   url: "https://www.paradox-museum.com",                       category: "museum",     priority: 3 },

  // ── Loisirs indoor ──
  { name: "paintinvaders",   url: "https://www.paintinvaders.fr",                         category: "indoor",     priority: 1 },
  { name: "smileworld",      url: "https://www.smileworldloisirs.com",                    category: "indoor",     priority: 1 },
  { name: "aquaboulevard",   url: "https://www.aquaboulevard.fr",                         category: "indoor",     priority: 2 },
  { name: "youkids",         url: "https://www.you-kids.fr",                              category: "indoor",     priority: 2 },
];

// Rotation quotidienne : chaque jour scrape un sous-ensemble différent
// pour couvrir toutes les sources en ~4 jours sans dépasser le quota.
// Priorité 1 = scraping tous les jours
// Priorité 2 = jours pairs
// Priorité 3 = jour 0 et 3 de la semaine
function getSourcesForToday(): typeof ALL_SOURCES {
  const dayOfWeek = new Date().getDay(); // 0=dim, 1=lun...
  return ALL_SOURCES.filter((s) => {
    if (s.priority === 1) return true;                        // toujours
    if (s.priority === 2) return dayOfWeek % 2 === 0;        // jours pairs
    if (s.priority === 3) return dayOfWeek === 0 || dayOfWeek === 3; // dim & mer
    return false;
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getDayKey(): string {
  return new Date().toISOString().split("T")[0]; // YYYY-MM-DD
}

function getNextWeekendDates(): { saturday: string; sunday: string } {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const daysUntilSat = dayOfWeek === 0 ? 6 : 6 - dayOfWeek;
  const offset = daysUntilSat === 0 && dayOfWeek === 6 ? 7 : daysUntilSat;
  const sat = new Date(now);
  sat.setDate(now.getDate() + offset);
  const sun = new Date(sat);
  sun.setDate(sat.getDate() + 1);
  const fmt = (d: Date) => d.toISOString().split("T")[0];
  return { saturday: fmt(sat), sunday: fmt(sun) };
}

// ─── Firecrawl ────────────────────────────────────────────────────────────────

interface FirecrawlResult {
  markdown: string;
  ogImage: string | null;
}

async function scrapeUrl(url: string, firecrawlKey: string): Promise<FirecrawlResult> {
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
    throw new Error(`Firecrawl ${res.status}: ${err.slice(0, 200)}`);
  }
  const data = await res.json();
  const markdown = data.data?.markdown ?? data.markdown ?? "";
  // Extract og:image from Firecrawl metadata
  const ogImage = data.data?.metadata?.ogImage
    ?? data.data?.metadata?.["og:image"]
    ?? data.metadata?.ogImage
    ?? null;
  return { markdown, ogImage };
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
  badge: string;
  date_start: string;
  date_end: string;
  showtimes: string;
  cinema_name: string;
  cinema_url: string;
  source_url: string;
  poster_url?: string;
}

async function extractActivities(
  markdown: string,
  sourceUrl: string,
  weekendDates: { saturday: string; sunday: string },
  lovableApiKey: string
): Promise<ScrapedActivity[]> {
  const prompt = `Tu es un assistant qui extrait des activités pour enfants depuis du contenu web scraped.

Voici le contenu de la page ${sourceUrl} :

${markdown.slice(0, 10000)}

---

Extrait UNIQUEMENT les activités pour ENFANTS (0-12 ans) à Paris qui ont lieu le week-end du ${weekendDates.saturday} (samedi) et/ou ${weekendDates.sunday} (dimanche).
Ignore les activités hors Paris ou hors ce week-end.
Ignore les activités pour adultes uniquement.

Pour chaque activité trouvée, retourne un objet JSON avec :
- category: "cinema" | "theatre" | "expo" | "activite"
- title: string (titre, SANS emoji, SANS ponctuation excessive)
- description: string (1-2 phrases courtes, max 8 mots par phrase, en français)
- location: string (nom du lieu)
- arrondissement: string (ex: "6ème", "15ème", "" si inconnu)
- duration: string (ex: "~1h30", "45 min", "" si inconnu)
- booking_url: string (URL de réservation directe, ou "" si non disponible)
- travel_walk: string (estimation depuis le 6e arr, ex: "15 min", ou "")
- travel_bike: string (ex: "6 min", ou "")
- travel_car: string (ex: "8 min", ou "")
- is_exceptional: boolean (true si hors arrondissements centraux 1-7, 14, 15)
- badge: string (ex: "dessin animé · 45 min" pour cinéma, ou "")
- date_start: string (YYYY-MM-DD, ou "")
- date_end: string (YYYY-MM-DD, ou "")
- showtimes: string (ex: "Sam 10h15 / Dim 11h00", ou "")
- cinema_name: string (nom du cinéma si category=cinema, sinon "")
- cinema_url: string (URL du cinéma si category=cinema, sinon "")
- source_url: "${sourceUrl}"

Retourne UNIQUEMENT un JSON valide : {"activities": [...]}. Maximum 6 activités par source. Si aucune trouvée : {"activities": []}.`;

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
    throw new Error(`Gemini ${res.status}: ${err.slice(0, 200)}`);
  }

  const data = await res.json();
  const raw = data.choices?.[0]?.message?.content ?? "{}";

  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
    const key = Object.keys(parsed).find((k) => Array.isArray(parsed[k]));
    if (key) return parsed[key];
    return [];
  } catch {
    console.error("JSON parse error:", raw.slice(0, 300));
    return [];
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

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
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  if (!lovableApiKey) {
    return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const dayKey = getDayKey();
  const weekendDates = getNextWeekendDates();

  // Parse body options
  let forceRescrape = false;
  let specificSources: string[] | null = null;
  try {
    const body = await req.json().catch(() => ({}));
    forceRescrape = body?.force === true;
    specificSources = body?.sources ?? null; // optional: ["sortiraparis", "parismomes"]
  } catch { /* no body */ }

  // Check if already scraped today (unless force)
  if (!forceRescrape) {
    const { data: existing } = await supabase
      .from("scrape_runs")
      .select("id, status")
      .eq("week_key", dayKey)
      .eq("status", "done")
      .single();

    if (existing) {
      return new Response(
        JSON.stringify({ message: "Déjà scrappé aujourd'hui", dayKey, fromCache: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  }

  // Create run record
  const { data: runRecord } = await supabase
    .from("scrape_runs")
    .insert({ week_key: dayKey, status: "running" })
    .select()
    .single();
  const runId = runRecord?.id;

  try {
    // Clean up today's old activities if force
    if (forceRescrape) {
      await supabase.from("scraped_activities").delete().eq("week_key", dayKey);
      await supabase.from("scrape_runs").delete().eq("week_key", dayKey).neq("id", runId);
    }

    // Determine sources to use
    const sourcesToRun = specificSources
      ? ALL_SOURCES.filter((s) => specificSources!.includes(s.name))
      : getSourcesForToday();

    console.log(`Day ${dayKey} — scraping ${sourcesToRun.length} sources: ${sourcesToRun.map((s) => s.name).join(", ")}`);
    console.log(`Weekend target: ${weekendDates.saturday} – ${weekendDates.sunday}`);

    const allActivities: ScrapedActivity[] = [];
    const sourcesDone: string[] = [];
    const sourceErrors: string[] = [];

    for (const source of sourcesToRun) {
      try {
        console.log(`→ Scraping ${source.name}: ${source.url}`);
        const { markdown, ogImage } = await scrapeUrl(source.url, firecrawlKey);

        if (markdown.length < 150) {
          console.log(`  ${source.name}: contenu trop court (${markdown.length} chars), skip`);
          continue;
        }

        const activities = await extractActivities(markdown, source.url, weekendDates, lovableApiKey);
        // Attach source-level og:image as fallback poster for all activities from this page
        activities.forEach((a) => { if (!a.poster_url && ogImage) a.poster_url = ogImage; });
        console.log(`  ${source.name}: ${activities.length} activités extraites`);

        allActivities.push(...activities);
        sourcesDone.push(source.name);

        // Throttle between calls
        await new Promise((r) => setTimeout(r, 1500));
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`  Erreur ${source.name}: ${msg}`);
        sourceErrors.push(`${source.name}: ${msg}`);
      }
    }

    // Deduplicate by normalised title
    const seen = new Set<string>();
    const unique = allActivities.filter((a) => {
      const key = a.title.toLowerCase().trim().replace(/[^a-z0-9]/g, "").slice(0, 30);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    console.log(`Total unique activities: ${unique.length}`);

    // Insert into DB
    if (unique.length > 0) {
      const rows = unique.map((a) => ({
        week_key: dayKey,
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
        date_start: a.date_start || weekendDates.saturday,
        date_end: a.date_end || weekendDates.sunday,
        showtimes: a.showtimes,
        cinema_name: a.cinema_name,
        cinema_url: a.cinema_url,
        source_url: a.source_url,
        poster_url: a.poster_url ?? null,
        raw_data: a as unknown as Record<string, unknown>,
      }));

      const { error: insertErr } = await supabase.from("scraped_activities").insert(rows);
      if (insertErr) throw new Error(`Insert error: ${insertErr.message}`);
    }

    // Mark done
    await supabase
      .from("scrape_runs")
      .update({
        status: "done",
        sources_scraped: sourcesDone,
        activities_found: unique.length,
        finished_at: new Date().toISOString(),
        error_message: sourceErrors.length > 0 ? sourceErrors.join(" | ") : null,
      })
      .eq("id", runId);

    return new Response(
      JSON.stringify({
        success: true,
        dayKey,
        weekendDates,
        activitiesFound: unique.length,
        sourcesDone,
        sourceErrors,
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
