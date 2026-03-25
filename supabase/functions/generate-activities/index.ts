import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY is not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    const token = authHeader.replace("Bearer ", "");

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) throw new Error("Unauthorized");
    const userId = user.id;

    const body = await req.json();
    const { weatherData, forceRegenerate, categoryToRefresh } = body;

    const { data: profile } = await supabase
      .from("family_profiles")
      .select("*")
       .eq("user_id", userId)
      .single();

    if (!profile) throw new Error("Profile not found");

    const { data: children } = await supabase
      .from("children")
      .select("*")
      .eq("family_id", profile.id);

    // Week key for caching — MUST include user_id to avoid cross-user cache pollution
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay() + 1);
    const weekKey = `activities-${userId}-${startOfWeek.toISOString().split("T")[0]}`;

    // Check cache
    if (!forceRegenerate) {
      const { data: cached } = await supabase
        .from("newsletter_cache")
        .select("content")
        .eq("user_id", userId)
        .eq("week_key", weekKey)
        .single();

      if (cached) {
        return new Response(JSON.stringify({ content: cached.content, fromCache: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Upcoming weekend dates
    const saturday = new Date(startOfWeek);
    saturday.setDate(startOfWeek.getDate() + 5);
    const sunday = new Date(startOfWeek);
    sunday.setDate(startOfWeek.getDate() + 6);
    const formatDate = (d: Date) => d.toLocaleDateString("fr-FR", { day: "numeric", month: "long" });

    const childrenDesc = children && children.length > 0
      ? children.map((c) => `${c.name || "enfant"}, ${c.age_years} ans, ${c.gender || "genre non précisé"}`).join(" / ")
      : "enfants";

    const prefsDesc = profile.preferences?.length > 0
      ? profile.preferences.join(", ")
      : "culture, plein air, créativité";

    const weekendPicksDesc = profile.weekend_picks?.length > 0
      ? profile.weekend_picks.join(", ")
      : "";

    const weekendDislikesDesc = (profile as any).weekend_dislikes?.length > 0
      ? (profile as any).weekend_dislikes.join(", ")
      : "";

    const transportDesc = profile.transport_modes?.length > 0
      ? profile.transport_modes.join(", ")
      : "voiture";

    const maxTravelDesc = profile.max_travel_minutes
      ? `${profile.max_travel_minutes} minutes maximum`
      : "30 minutes maximum";

    const weatherDesc = weatherData
      ? `Samedi: ${weatherData.saturday?.description || "variable"} ${weatherData.saturday?.tempMax || "?"}°C / Dimanche: ${weatherData.sunday?.description || "variable"} ${weatherData.sunday?.tempMax || "?"}°C`
      : "météo inconnue";

    // Fetch real cinema data from cinema_showings
    const cinemaWeekKey = startOfWeek.toISOString().split("T")[0];
    const minChildAge = children && children.length > 0
      ? Math.min(...children.map((c: { age_years: number }) => c.age_years))
      : 3;

    const { data: cinemaShowings } = await supabase
      .from("cinema_showings")
      .select("title, overview, poster_url, certification, age_min, cinemas, vote_average")
      .eq("week_key", cinemaWeekKey)
      .lte("age_min", minChildAge)
      .order("vote_average", { ascending: false })
      .limit(15);

    const hasCinemaData = cinemaShowings && cinemaShowings.length > 0;

    // Build cinema context: films + nearby cinemas list
    let cinemaContext = "";
    let cinemaInstruction = "";

    if (hasCinemaData) {
      // Extract unique cinemas from all films
      const allCinemas = new Map<string, { name: string; arrondissement: string; booking_url: string }>();
      for (const f of cinemaShowings!) {
        const cinemas = Array.isArray(f.cinemas) ? f.cinemas as Array<{ name: string; arrondissement: string; booking_url: string }> : [];
        for (const c of cinemas) {
          if (c.name && !allCinemas.has(c.name)) {
            allCinemas.set(c.name, c);
          }
        }
      }

      cinemaContext = `\n\nFILMS RÉELLEMENT À L'AFFICHE CETTE SEMAINE (source: TMDB) :\n` +
        cinemaShowings!.map((f) => {
          const cinemas = Array.isArray(f.cinemas) ? f.cinemas as Array<{ name: string; arrondissement: string; booking_url: string; showtimes?: string }> : [];
          const cinemasStr = cinemas.map(c => `    • ${c.name} (${c.arrondissement}) — séances: ${c.showtimes || "horaires non disponibles"} — résa: ${c.booking_url}`).join("\n");
          return `- "${f.title}" (${f.certification}, dès ${f.age_min} ans) — poster_url: ${f.poster_url || "null"}\n  ${(f.overview || "").slice(0, 100)}\n  Cinémas:\n${cinemasStr}`;
        }).join("\n") +
        `\n\nLISTE EXHAUSTIVE DES CINÉMAS AUTORISÉS (ne recommande QUE ceux-ci) :\n` +
        [...allCinemas.values()].map(c => `- ${c.name} (${c.arrondissement}) → ${c.booking_url}`).join("\n");

      cinemaInstruction = `\nFILMS: Utilise UNIQUEMENT les films de la liste "FILMS RÉELLEMENT À L'AFFICHE". Sélectionne les 2-3 plus adaptés aux enfants de cette famille. Préfère les films en 2D plutôt qu'en 3D. Pour chaque film, choisis UNIQUEMENT des cinémas de la liste "CINÉMAS PARISIENS" ci-dessous — N'INVENTE AUCUN cinéma qui n'est pas dans cette liste. Choisis les 2 plus PROCHES de ${profile.city}. Conserve EXACTEMENT les poster_url et booking_url fournis — ne les invente pas. Pour les séances, utilise UNIQUEMENT les horaires fournis dans le champ showtimes de chaque cinéma — N'INVENTE AUCUN horaire.`;
    } else {
      cinemaInstruction = `\nPas de données cinéma disponibles. Suggère des films réalistes actuellement à l'affiche.`;
    }

    // Fetch real theatre/spectacle data
    const { data: theatreShowings } = await supabase
      .from("theatre_showings")
      .select("title, description, venue, arrondissement, age_min, age_max, duration, price, booking_url, showtimes, tags")
      .eq("week_key", cinemaWeekKey)
      .lte("age_min", minChildAge)
      .limit(15);

    const hasTheatreData = theatreShowings && theatreShowings.length > 0;

    let theatreContext = "";
    let theatreInstruction = "";

    if (hasTheatreData) {
      theatreContext = `\n\nSPECTACLES ENFANTS RÉELLEMENT À L'AFFICHE (source: Billetreduc, Theatreonline) :\n` +
        theatreShowings!.map((s) =>
          `- "${s.title}" @ ${s.venue} (${s.arrondissement}) — ${s.duration} — ${s.price} — dès ${s.age_min} ans\n  ${(s.description || "").slice(0, 100)}\n  Séances: ${s.showtimes} | Résa: ${s.booking_url}`
        ).join("\n");

      theatreInstruction = `\nSPECTACLES: Utilise UNIQUEMENT les spectacles de la liste "SPECTACLES ENFANTS" pour la catégorie theatre. Sélectionne les 2-3 plus adaptés aux âges des enfants et les plus proches de ${profile.city}. Conserve EXACTEMENT les booking_url fournis.`;
    } else {
      theatreInstruction = `\nPas de données spectacles disponibles. Suggère des spectacles réalistes à l'affiche.`;
    }

    // Fetch real expo data
    const { data: expoShowings } = await supabase
      .from("expo_showings")
      .select("title, description, venue, arrondissement, age_min, age_max, duration, price, booking_url, tags")
      .eq("week_key", cinemaWeekKey)
      .lte("age_min", minChildAge)
      .limit(15);

    const hasExpoData = expoShowings && expoShowings.length > 0;

    let expoContext = "";
    let expoInstruction = "";

    if (hasExpoData) {
      expoContext = `\n\nEXPOSITIONS ENFANTS EN COURS À PARIS (sources: Sortiraparis, Paris.fr) :\n` +
        expoShowings!.map((e) =>
          `- "${e.title}" @ ${e.venue} (${e.arrondissement}) — ${e.duration} — ${e.price} — dès ${e.age_min} ans\n  ${(e.description || "").slice(0, 100)}\n  Résa: ${e.booking_url}`
        ).join("\n");

      expoInstruction = `\nEXPOS: Utilise UNIQUEMENT les expos de la liste "EXPOSITIONS ENFANTS" pour la catégorie expo. Sélectionne les 2-3 plus adaptées aux âges et les plus proches de ${profile.city}. Conserve EXACTEMENT les booking_url fournis.`;
    } else {
      expoInstruction = `\nPas de données expos disponibles. Suggère des expos réalistes en cours.`;
    }

    const systemPrompt = `Tu es un expert en sorties famille à Paris et en France. Tu recommandes des activités PRÉCISES et RÉELLES : des TITRES DE FILMS (pas des cinémas), des NOMS DE SPECTACLES (pas des théâtres), des NOMS D'EXPOSITIONS (pas des musées). Réponds UNIQUEMENT en JSON valide, sans markdown, sans backticks, sans explication.`;

    const categoryInstruction = categoryToRefresh
      ? `IMPORTANT: Génère UNIQUEMENT des activités de catégorie "${categoryToRefresh}" (différentes de celles habituelles). Génère 2 activités de cette catégorie, les autres catégories avec 0 activités.`
      : "";

    const userPrompt = `Génère des activités famille pour le week-end du ${formatDate(saturday)} & ${formatDate(sunday)}.

FAMILLE:
- Parent: ${profile.parent_name || "Parent"}, ville: ${profile.city || "France"}
- Enfants: ${childrenDesc}
- Préférences: ${prefsDesc}
${weekendPicksDesc ? `- Activités favorites: ${weekendPicksDesc}` : ""}
${weekendDislikesDesc ? `- CATÉGORIES À EXCLURE OBLIGATOIREMENT: ${weekendDislikesDesc}. NE GÉNÈRE AUCUNE activité de ces catégories.` : ""}
- Transport: ${transportDesc}
- Trajet max: ${maxTravelDesc}

MÉTÉO: ${weatherDesc}
${cinemaInstruction}${cinemaContext}
${theatreInstruction}${theatreContext}
${expoInstruction}${expoContext}

${categoryInstruction}

IMPORTANT — FORMAT DES ACTIVITÉS:
- Pour "cinema": le titre doit être un TITRE DE FILM RÉEL actuellement à l'affiche (ex: "Vaiana 2", "Perdu ? Retrouvé !", "Le Robot Sauvage"), PAS un nom de cinéma. Ajoute un champ "cinemas" avec 2 cinémas proches.
- Pour "theatre": le titre doit être un NOM DE SPECTACLE (ex: "Pirouette", "La Fée des chaussettes"), PAS un théâtre.
- Pour "expo": le titre doit être un NOM D'EXPOSITION (ex: "Digital Abysses", "Renaissance"), PAS un musée.

Génère ce JSON:
{
  "weekend": {
    "label": "${formatDate(saturday)} & ${formatDate(sunday)}",
    "activities": [
      {
        "title": "Titre PRÉCIS de l'activité (film, spectacle, expo, lieu)",
        "category": "cinema | theatre | expo | activite",
        "description": "2 phrases: 1/ description concrète. 2/ pourquoi c'est top pour la famille.",
        "location": "Nom du lieu principal",
        "arrondissement": "6ème",
        "duration": "~45 min",
        "booking_url": "https://url-de-reservation.com ou null",
        "badge": "dessin animé · dès 3 ans",
        "poster_url": "https://url-affiche.jpg ou null",
        "indoor": true,
        "highlighted": false,
        "cinemas": [
          {"name": "MK2 Odéon", "arrondissement": "6ème", "travel_walk": "12 min", "showtimes": "Sam 10h15 / Dim 10h30", "url": "https://..."}
        ]
      }
    ]
  },
  "prebooking": {
    "activities": [
      {
        "title": "Nom du spectacle/événement (DOIT exister dans les données fournies)",
        "category": "spectacle | cinema | atelier",
        "description": "Description courte et attractive",
        "location": "Nom du lieu (EXACT de la base de données)",
        "arrondissement": "4ème",
        "booking_url": "URL EXACTE de la base de données (booking_url fourni) — NE PAS INVENTER",
        "booking_deadline": "Réserver avant le ${formatDate(new Date(sunday.getTime() + 14 * 24 * 60 * 60 * 1000))}",
        "age": "dès 3 ans"
      }
    ]
  }
}

RÈGLES STRICTES:
- 6 activités weekend: au moins 2 cinema (titres de FILMS), 2 theatre/expo, 2 activite/sortie
${weekendDislikesDesc ? `- EXCEPTION: Si une catégorie est dans les dislikes (${weekendDislikesDesc}), NE GÉNÈRE AUCUNE activité de cette catégorie. Remplace-la par des activités d'autres catégories.` : ""}
- "cinemas" obligatoire pour category "cinema": exactement 2 cinémas, pris UNIQUEMENT dans la liste fournie. Pour les séances (showtimes), écris "Voir horaires" si aucune séance n'est fournie dans les données — N'INVENTE JAMAIS de faux horaires. Mets le booking_url réel du cinéma pour que l'utilisateur puisse vérifier
- Si pluie/<12°C: majorité indoor. Si beau: majorité outdoor
- OBLIGATOIRE: 3 pré-réservations dans "prebooking.activities" — spectacles, ateliers ou événements DIFFÉRENTS de ceux du weekend. Pioche UNIQUEMENT dans les spectacles et expos listés dans les données ci-dessus. Chaque pré-réservation DOIT:
  * utiliser le booking_url EXACT fourni dans les données (ne PAS inventer d'URL)
  * avoir une booking_deadline réaliste en ${formatDate(saturday).split(" ").pop()} ${saturday.getFullYear()} (nous sommes en ${saturday.getFullYear()}, PAS en 2024)
  * être un événement qui existe dans les listes "SPECTACLES ENFANTS" ou "EXPOSITIONS ENFANTS" ci-dessus
- Activités RÉELLES accessibles depuis ${profile.city} en ${transportDesc} (max ${maxTravelDesc})
- Adaptées aux âges: ${childrenDesc}
- "badge" court: "dessin animé · dès 3 ans" ou "marionnettes · 45 min" etc.
- N'INVENTE PAS de cinémas, séances, ou URLs de réservation qui ne sont pas dans les données fournies
- Pour TOUTES les activités et pré-réservations: utilise UNIQUEMENT les booking_url qui apparaissent dans les données fournies. Si aucun booking_url n'est fourni pour une activité, mets null
- Nous sommes en ${saturday.getFullYear()}. N'utilise JAMAIS 2024 dans les dates
- JSON valide uniquement`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4096,
        system: systemPrompt,
        messages: [
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requêtes atteinte." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`Anthropic API error: ${status}`);
    }

    const aiData = await response.json();
    const rawContent = aiData.content?.[0]?.text;
    if (!rawContent) throw new Error("Empty AI response");

    // Strip markdown code fences if present (```json ... ```)
    const cleaned = rawContent.replace(/^```(?:json)?\s*\n?/i, "").replace(/\n?```\s*$/i, "").trim();
    const parsedContent = JSON.parse(cleaned);

    // ─── Generate Ghibli-style posters for activities without poster_url ───
    const TOGETHER_API_KEY = Deno.env.get("TOGETHER_API_KEY");
    if (TOGETHER_API_KEY) {
      const allActivities = [
        ...(parsedContent.weekend?.activities || []),
        ...(parsedContent.prebooking?.activities || []),
      ];

      const needsPoster = allActivities.filter(
        (a: { poster_url?: string }) => !a.poster_url
      );

      if (needsPoster.length > 0) {
        console.log(`[generate-activities] Generating ${needsPoster.length} Ghibli posters...`);

        const categoryPrompts: Record<string, string> = {
          cinema: "magical movie theater with film reels and starry lights",
          theatre: "charming puppet theater stage with velvet curtains",
          spectacle: "charming puppet theater stage with velvet curtains",
          expo: "wonderous museum gallery with paintings coming alive",
          activite: "children playing joyfully in a magical park with butterflies",
          parc: "dreamy park with ancient trees and gentle sunlight",
          zoo: "adorable animals in a lush magical garden",
          concert: "musicians playing in a magical concert hall with floating notes",
          sport: "energetic children climbing and playing sports",
          escape: "adventurous children solving puzzles in a treasure room",
          visite: "magical boat on the Seine with Paris monuments glowing",
          atelier: "creative children painting and crafting in a colorful studio",
        };

        // Generate posters in parallel (max 4 at a time to avoid rate limits)
        const generatePoster = async (activity: { title: string; category: string; poster_url?: string }) => {
          try {
            const slug = activity.title
              .toLowerCase()
              .normalize("NFD")
              .replace(/[\u0300-\u036f]/g, "")
              .replace(/[^a-z0-9]+/g, "-")
              .replace(/^-|-$/g, "")
              .slice(0, 60);
            const fileName = `posters/${slug}.png`;

            // Check cache first
            const { data: existing } = await supabase.storage
              .from("activity-posters")
              .list("posters", { search: `${slug}.png` });

            if (existing && existing.length > 0) {
              const { data: urlData } = supabase.storage
                .from("activity-posters")
                .getPublicUrl(fileName);
              activity.poster_url = urlData.publicUrl;
              return;
            }

            const scene = categoryPrompts[activity.category] || "children having a wonderful adventure";
            const prompt = `Studio Ghibli watercolor illustration, ${scene}, inspired by "${activity.title}". Soft pastel colors, hand-painted texture, dreamy atmosphere, warm golden light, gentle brushstrokes, whimsical. No text, no letters.`;

            const imgResponse = await fetch("https://api.together.xyz/v1/images/generations", {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${TOGETHER_API_KEY}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                model: "black-forest-labs/FLUX.1-schnell-Free",
                prompt,
                width: 512,
                height: 512,
                steps: 4,
                n: 1,
                response_format: "b64_json",
              }),
            });

            if (!imgResponse.ok) {
              console.warn(`[poster] Failed for "${activity.title}": ${imgResponse.status}`);
              return;
            }

            const imgResult = await imgResponse.json();
            const b64 = imgResult.data?.[0]?.b64_json;
            if (!b64) return;

            const binaryStr = atob(b64);
            const bytes = new Uint8Array(binaryStr.length);
            for (let i = 0; i < binaryStr.length; i++) {
              bytes[i] = binaryStr.charCodeAt(i);
            }

            await supabase.storage
              .from("activity-posters")
              .upload(fileName, bytes, { contentType: "image/png", upsert: true });

            const { data: urlData } = supabase.storage
              .from("activity-posters")
              .getPublicUrl(fileName);

            activity.poster_url = urlData.publicUrl;
            console.log(`[poster] ✅ ${activity.title}`);
          } catch (err) {
            console.warn(`[poster] Error for "${activity.title}":`, err);
          }
        };

        // Process in batches of 4
        for (let i = 0; i < needsPoster.length; i += 4) {
          const batch = needsPoster.slice(i, i + 4);
          await Promise.all(batch.map(generatePoster));
        }
      }
    }

    // Save to cache
    await supabase.from("newsletter_cache").upsert({
      user_id: userId,
      week_key: weekKey,
      content: parsedContent,
    }, { onConflict: "user_id,week_key" });

    return new Response(JSON.stringify({ content: parsedContent, fromCache: false }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: unknown) {
    console.error("Generate activities error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
