import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TMDB_BASE = "https://api.themoviedb.org/3";
const TMDB_IMG = "https://image.tmdb.org/t/p/w500";

// Map French certifications to minimum age
function certToAge(cert: string): number {
  if (!cert || cert === "U" || cert === "Tous publics") return 0;
  if (cert === "-10" || cert === "10") return 10;
  if (cert === "-12" || cert === "12") return 12;
  if (cert === "-16" || cert === "16") return 16;
  if (cert === "-18" || cert === "18") return 18;
  return 0;
}

interface TmdbMovie {
  id: number;
  title: string;
  overview: string;
  poster_path: string | null;
  release_date: string;
  vote_average: number;
  genre_ids: number[];
}

interface CinemaInfo {
  name: string;
  arrondissement: string;
  showtimes: string;
  booking_url: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const TMDB_API_KEY = Deno.env.get("TMDB_API_KEY");
    if (!TMDB_API_KEY) throw new Error("TMDB_API_KEY not configured");

    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Week key = Monday of current week
    const now = new Date();
    const monday = new Date(now);
    monday.setDate(now.getDate() - now.getDay() + 1);
    const weekKey = monday.toISOString().split("T")[0];

    // Check if already refreshed this week
    const { data: existing } = await supabase
      .from("cinema_showings")
      .select("id")
      .eq("week_key", weekKey)
      .limit(1);

    let forceRefresh = false;
    try { const body = await req.json(); forceRefresh = body?.force === true; } catch { /* no body */ }

    if (existing && existing.length > 0 && !forceRefresh) {
      return new Response(JSON.stringify({ message: "Already refreshed this week", weekKey, count: existing.length }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Clean old data if force
    if (forceRefresh) {
      await supabase.from("cinema_showings").delete().eq("week_key", weekKey);
    }

    console.log(`[refresh-cinema] Starting for week ${weekKey}`);

    // ─── PHASE A: TMDB — films à l'affiche ────────────────────────────────
    const tmdbHeaders = { Authorization: `Bearer ${TMDB_API_KEY}`, "Content-Type": "application/json" };

    // Get now playing in France
    const nowPlayingRes = await fetch(`${TMDB_BASE}/movie/now_playing?region=FR&language=fr-FR&page=1`, { headers: tmdbHeaders });
    if (!nowPlayingRes.ok) throw new Error(`TMDB now_playing error: ${nowPlayingRes.status}`);
    const nowPlaying = await nowPlayingRes.json();
    const movies: TmdbMovie[] = nowPlaying.results ?? [];

    console.log(`[refresh-cinema] TMDB: ${movies.length} films à l'affiche`);

    // TMDB genre IDs
    // Kid-friendly: 16=Animation, 10751=Famille, 12=Aventure, 14=Fantastique, 35=Comédie, 10402=Musique
    const KID_GENRES = new Set([16, 10751, 12, 14, 35, 10402]);
    // Adult/exclude: 27=Horreur, 53=Thriller, 80=Crime, 10752=Guerre
    const ADULT_GENRES = new Set([27, 53, 80, 10752]);

    // Filter and get certifications
    const kidMovies: Array<TmdbMovie & { certification: string; age_min: number }> = [];

    for (const movie of movies) {
      // Skip films with adult genres
      if (movie.genre_ids?.some(g => ADULT_GENRES.has(g))) {
        console.log(`[refresh-cinema] Skip (adult genre): ${movie.title}`);
        continue;
      }

      // Require at least one kid-friendly genre
      const hasKidGenre = movie.genre_ids?.some(g => KID_GENRES.has(g));
      if (!hasKidGenre) {
        console.log(`[refresh-cinema] Skip (no kid genre): ${movie.title} [${movie.genre_ids}]`);
        continue;
      }

      try {
        const certRes = await fetch(`${TMDB_BASE}/movie/${movie.id}/release_dates`, { headers: tmdbHeaders });
        const certData = await certRes.json();
        const frRelease = certData.results?.find((r: { iso_3166_1: string }) => r.iso_3166_1 === "FR");
        const cert = frRelease?.release_dates?.[0]?.certification ?? "";
        const ageMin = certToAge(cert);

        // Skip 16+ and 18+
        if (ageMin > 12) {
          console.log(`[refresh-cinema] Skip (cert ${cert}): ${movie.title}`);
          continue;
        }

        // Determine age_min from genre if cert is empty
        const isAnimation = movie.genre_ids?.includes(16);
        const effectiveAge = ageMin > 0 ? ageMin : (isAnimation ? 3 : 6);
        const effectiveCert = cert || (isAnimation ? "Tous publics" : "Tous publics");

        kidMovies.push({ ...movie, certification: effectiveCert, age_min: effectiveAge });

        await new Promise(r => setTimeout(r, 100));
      } catch (err) {
        console.warn(`[refresh-cinema] Cert error for ${movie.title}:`, err);
      }
    }

    console.log(`[refresh-cinema] ${kidMovies.length} films adaptés enfants`);

    // ─── PHASE B: Cinémas parisiens (base statique avec liens réels) ─────
    // Les sites de cinéma bloquent le scraping. On fournit une base de cinémas
    // réels par arrondissement avec liens billetterie. Claude matchera le plus
    // proche de chaque utilisateur dans generate-activities.
    const PARIS_CINEMAS: CinemaInfo[] = [
      { name: "MK2 Odéon", arrondissement: "6ème", showtimes: "", booking_url: "https://www.mk2.com/salle/mk2-odeon" },
      { name: "MK2 Beaubourg", arrondissement: "3ème", showtimes: "", booking_url: "https://www.mk2.com/salle/mk2-beaubourg" },
      { name: "MK2 Bastille", arrondissement: "11ème", showtimes: "", booking_url: "https://www.mk2.com/salle/mk2-bastille-cote-fg-st-antoine" },
      { name: "MK2 Nation", arrondissement: "11ème", showtimes: "", booking_url: "https://www.mk2.com/salle/mk2-nation" },
      { name: "MK2 Bibliothèque", arrondissement: "13ème", showtimes: "", booking_url: "https://www.mk2.com/salle/mk2-bibliotheque" },
      { name: "MK2 Parnasse", arrondissement: "14ème", showtimes: "", booking_url: "https://www.mk2.com/salle/mk2-parnasse" },
      { name: "UGC Ciné Cité Les Halles", arrondissement: "1er", showtimes: "", booking_url: "https://www.ugc.fr/cinema.html?id=32" },
      { name: "UGC Ciné Cité Bercy", arrondissement: "12ème", showtimes: "", booking_url: "https://www.ugc.fr/cinema.html?id=36" },
      { name: "UGC Odéon", arrondissement: "6ème", showtimes: "", booking_url: "https://www.ugc.fr/cinema.html?id=42" },
      { name: "UGC Gobelins", arrondissement: "13ème", showtimes: "", booking_url: "https://www.ugc.fr/cinema.html?id=38" },
      { name: "Gaumont Opéra", arrondissement: "9ème", showtimes: "", booking_url: "https://www.cinemaspathegaumont.com/cinemas/cinema-gaumont-opera" },
      { name: "Gaumont Parnasse", arrondissement: "14ème", showtimes: "", booking_url: "https://www.cinemaspathegaumont.com/cinemas/cinema-gaumont-parnasse" },
      { name: "Gaumont Aquaboulevard", arrondissement: "15ème", showtimes: "", booking_url: "https://www.cinemaspathegaumont.com/cinemas/cinema-gaumont-aquaboulevard" },
      { name: "Pathé Wepler", arrondissement: "18ème", showtimes: "", booking_url: "https://www.cinemaspathegaumont.com/cinemas/cinema-pathe-wepler" },
      { name: "Pathé Beaugrenelle", arrondissement: "15ème", showtimes: "", booking_url: "https://www.cinemaspathegaumont.com/cinemas/cinema-pathe-beaugrenelle" },
      { name: "Le Grand Rex", arrondissement: "2ème", showtimes: "", booking_url: "https://www.legrandrex.com" },
      { name: "Le Champo", arrondissement: "5ème", showtimes: "", booking_url: "https://www.lechampo.com" },
      { name: "Studio des Ursulines", arrondissement: "5ème", showtimes: "", booking_url: "https://www.studiodesursulines.com" },
      { name: "Cinéma du Panthéon", arrondissement: "5ème", showtimes: "", booking_url: "https://www.cinema-du-pantheon.fr" },
      { name: "Forum des Images", arrondissement: "1er", showtimes: "", booking_url: "https://www.forumdesimages.fr" },
      { name: "La Cinémathèque", arrondissement: "12ème", showtimes: "", booking_url: "https://www.cinematheque.fr" },
      { name: "Luminor Hôtel de Ville", arrondissement: "4ème", showtimes: "", booking_url: "https://www.luminor-hoteldeville.com" },
      { name: "Le Balzac", arrondissement: "8ème", showtimes: "", booking_url: "https://www.cinemabalzac.com" },
      { name: "L'Arlequin", arrondissement: "6ème", showtimes: "", booking_url: "https://www.cinema-arlequin.fr" },
    ];

    console.log(`[refresh-cinema] ${PARIS_CINEMAS.length} cinémas parisiens en base`);

    // ─── PHASE C: Fusion & stockage ───────────────────────────────────────
    const rows = kidMovies.map(movie => {
      return {
        tmdb_id: movie.id,
        title: movie.title,
        overview: movie.overview,
        poster_url: movie.poster_path ? `${TMDB_IMG}${movie.poster_path}` : null,
        certification: movie.certification,
        age_min: movie.age_min,
        genres: movie.genre_ids?.map(String) ?? [],
        vote_average: movie.vote_average,
        cinemas: PARIS_CINEMAS,
        week_key: weekKey,
      };
    });

    if (rows.length > 0) {
      const { error } = await supabase.from("cinema_showings").upsert(rows, { onConflict: "title,week_key" });
      if (error) throw new Error(`Insert error: ${error.message}`);
    }

    console.log(`[refresh-cinema] Stored ${rows.length} films`);

    return new Response(JSON.stringify({
      success: true,
      weekKey,
      filmsTotal: movies.length,
      filmsKidFriendly: kidMovies.length,
      cinemasCount: PARIS_CINEMAS.length,
      stored: rows.length,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: unknown) {
    console.error("[refresh-cinema] Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
