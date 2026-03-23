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
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) throw new Error("Unauthorized");

    const body = await req.json();
    const { weatherData, forceRegenerate } = body;

    const { data: profile } = await supabase
      .from("family_profiles")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (!profile) throw new Error("Profile not found");

    const { data: children } = await supabase
      .from("children")
      .select("*")
      .eq("family_id", profile.id);

    // Week key for caching
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay() + 1);
    const weekKey = `activities-${startOfWeek.toISOString().split("T")[0]}`;

    // Check cache
    if (!forceRegenerate) {
      const { data: cached } = await supabase
        .from("newsletter_cache")
        .select("content")
        .eq("user_id", user.id)
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

    const transportDesc = profile.transport_modes?.length > 0
      ? profile.transport_modes.join(", ")
      : "voiture";

    const maxTravelDesc = profile.max_travel_minutes
      ? `${profile.max_travel_minutes} minutes maximum`
      : "30 minutes maximum";

    const weatherDesc = weatherData
      ? `Samedi: ${weatherData.saturday?.description || "variable"} ${weatherData.saturday?.tempMax || "?"}°C / Dimanche: ${weatherData.sunday?.description || "variable"} ${weatherData.sunday?.tempMax || "?"}°C`
      : "météo inconnue";

    const systemPrompt = `Tu es un assistant expert en activités famille en France. Tu génères des suggestions d'activités concrètes, réalistes et disponibles dans la ville mentionnée, adaptées aux âges des enfants et à la météo. Tu réponds UNIQUEMENT en JSON valide. Pas de markdown, pas d'explications.`;

    const userPrompt = `Génère des activités famille pour le week-end du ${formatDate(saturday)} & ${formatDate(sunday)}.

FAMILLE:
- Parent: ${profile.parent_name || "Parent"}, ville: ${profile.city || "France"}
- Enfants: ${childrenDesc}
- Préférences générales: ${prefsDesc}
${weekendPicksDesc ? `- Activités souhaitées ce week-end: ${weekendPicksDesc}` : ""}
- Transport disponible: ${transportDesc}
- Trajet max accepté: ${maxTravelDesc}

MÉTÉO DU WEEK-END: ${weatherDesc}

Génère exactement ce JSON:
{
  "weekend": {
    "label": "${formatDate(saturday)} & ${formatDate(sunday)}",
    "weather_summary": "Résumé météo en 1 phrase avec conseil pratique",
    "activities": [
      {
        "id": "unique_id",
        "title": "Nom de l'activité",
        "emoji": "🎯",
        "category": "sortie | maison | culture | sport | créatif | spectacle",
        "age_min": 3,
        "age_max": 12,
        "duration": "2h",
        "distance_km": 5,
        "transport": ["voiture"],
        "description": "Description engageante de l'activité en 2 phrases. Pourquoi c'est top pour cette famille.",
        "practical_info": "Infos pratiques: adresse indicative, tarifs, horaires types",
        "requires_booking": false,
        "booking_url": null,
        "booking_deadline": null,
        "tags": ["en famille", "extérieur"],
        "highlighted": false,
        "indoor": false
      }
    ]
  },
  "prebooking": {
    "title": "À réserver maintenant",
    "activities": [
      {
        "id": "unique_id",
        "title": "Nom activité nécessitant réservation",
        "emoji": "🎟️",
        "category": "spectacle | cinema | atelier | sport",
        "description": "Description courte et attractive",
        "practical_info": "Lieu, date, tarifs",
        "booking_url": "URL si connue ou null",
        "booking_deadline": "Date limite indicative",
        "urgency": "high | medium | low",
        "tags": ["à réserver", "week-end"],
        "age_min": 4,
        "age_max": 14
      }
    ]
  }
}

RÈGLES ABSOLUES:
- 6 activités dans weekend.activities (mix indoor/outdoor selon météo)
- Si pluie ou <12°C: au moins 4 activités indoor
- Si beau temps: au moins 4 activités outdoor
- 3 activités dans prebooking.activities (spectacles, ateliers, cinema... qui se réservent à l'avance)
- Toutes les activités doivent être RÉALISTES et accessibles depuis ${profile.city}
- Respecter le transport disponible (${transportDesc}) et le trajet max (${maxTravelDesc})
- Adapter aux âges: ${childrenDesc}
- highlighted: true pour 1-2 coups de coeur
- JSON valide uniquement, aucun autre texte`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
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
      if (status === 402) {
        return new Response(JSON.stringify({ error: "Crédits insuffisants." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${status}`);
    }

    const aiData = await response.json();
    const rawContent = aiData.choices?.[0]?.message?.content;
    if (!rawContent) throw new Error("Empty AI response");

    const parsedContent = JSON.parse(rawContent);

    // Save to cache
    await supabase.from("newsletter_cache").upsert({
      user_id: user.id,
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
