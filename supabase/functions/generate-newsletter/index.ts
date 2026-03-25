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

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) throw new Error("Unauthorized");

    const body = await req.json();
    const { weatherData, forceRegenerate } = body;

    // Get family profile + children + subscribers
    const [profileRes, subscribersRes] = await Promise.all([
      supabase.from("family_profiles").select("*").eq("user_id", user.id).single(),
      supabase.from("newsletter_subscribers").select("*").eq("user_id", user.id).eq("opt_in", true),
    ]);

    const profile = profileRes.data;
    if (!profile) throw new Error("Profile not found");

    const { data: children } = await supabase
      .from("children")
      .select("*")
      .eq("family_id", profile.id);

    // All opted-in subscribers (primary + family members)
    const subscribers = subscribersRes.data ?? [];

    // Build week key (week of year)
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay() + 1);
    const weekKey = startOfWeek.toISOString().split("T")[0];

    // Check cache
    if (!forceRegenerate) {
      const { data: cached } = await supabase
        .from("newsletter_cache")
        .select("content")
        .eq("user_id", user.id)
        .eq("week_key", weekKey)
        .single();

      if (cached) {
        return new Response(JSON.stringify({ content: cached.content, fromCache: true, subscribers: subscribers.map((s) => ({ name: s.name, email: s.email })) }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Get upcoming agenda events
    const nextWeekDate = new Date(startOfWeek);
    nextWeekDate.setDate(nextWeekDate.getDate() + 14);
    const { data: agendaEvents } = await supabase
      .from("agenda_events")
      .select("*")
      .eq("user_id", user.id)
      .gte("event_date", startOfWeek.toISOString().split("T")[0])
      .lte("event_date", nextWeekDate.toISOString().split("T")[0])
      .order("event_date");

    // Compute weekend dates
    const saturday = new Date(startOfWeek);
    saturday.setDate(startOfWeek.getDate() + 5);
    const sunday = new Date(startOfWeek);
    sunday.setDate(startOfWeek.getDate() + 6);
    const formatDate = (d: Date) => d.toLocaleDateString("fr-FR", { day: "numeric", month: "long" });

    const childrenDesc = children && children.length > 0
      ? children.map((c) => `${c.name || "enfant"} (${c.age_years} ans)`).join(", ")
      : "enfants en bas âge";

    const agesDesc = children && children.length > 0
      ? `âges: ${children.map((c) => c.age_years).join(", ")} ans`
      : "petits enfants";

    const prefsDesc = profile.preferences?.length > 0
      ? profile.preferences.join(", ")
      : "culture, plein air, créativité";

    const weatherDesc = weatherData
      ? `Samedi: ${weatherData.saturday?.description || "variable"}, ${weatherData.saturday?.tempMax || "?"}°C max / Dimanche: ${weatherData.sunday?.description || "variable"}, ${weatherData.sunday?.tempMax || "?"}°C max`
      : "météo non disponible";

    const agendaDesc = agendaEvents && agendaEvents.length > 0
      ? agendaEvents.map((e) => `${e.emoji} ${e.title} — ${new Date(e.event_date).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}`).join("\n")
      : "aucun événement prévu";

    const systemPrompt = `Tu es l'assistante newsletter d'une famille française avec enfants. Tu génères une newsletter hebdomadaire personnalisée et chaleureuse sur les activités du week-end, adaptée aux âges des enfants, à la ville et à la météo. Tu écrits en français, avec un ton chaleureux, pratique et enthousiaste. Tu génères du contenu réaliste, concret et utile, inspiré de ce qui existe vraiment dans la ville mentionnée.`;

    const userPrompt = `Génère la newsletter du week-end du ${formatDate(saturday)} & ${formatDate(sunday)} pour la famille ${profile.parent_name || "notre famille"} habitant à ${profile.city || "France"}.

Enfants: ${childrenDesc} (${agesDesc})
Préférences: ${prefsDesc}
Météo du week-end: ${weatherDesc}
Agenda de la famille cette semaine/prochaine semaine:
${agendaDesc}

Génère une newsletter structurée avec ces sections JSON. Chaque section doit avoir des suggestions RÉALISTES adaptées à la ville, aux âges des enfants et à la météo:

{
  "greeting": "Message de bienvenue personnalisé (2 phrases max, chaleureux, mentionne la météo)",
  "weather_comment": "Commentaire météo sympa et pratique (1 phrase)",
  "sections": [
    {
      "id": "cinema",
      "title": "🎬 Cinéma",
      "emoji": "🎬",
      "color": "blue",
      "items": [
        {
          "title": "Titre du film",
          "subtitle": "À partir de X ans — description courte",
          "description": "Description engageante du film (2 phrases)",
          "details": "Infos pratiques: horaires, tarifs indicatifs",
          "tags": ["famille", "animation"],
          "highlighted": false
        }
      ]
    },
    {
      "id": "sorties",
      "title": "🌳 Sorties & Nature",
      "emoji": "🌳",
      "color": "green",
      "items": [...]
    },
    {
      "id": "culture",
      "title": "🏛️ Musées & Culture",
      "emoji": "🏛️",
      "color": "purple",
      "items": [...]
    },
    {
      "id": "maison",
      "title": "🏠 Activités à la maison",
      "emoji": "🏠",
      "color": "orange",
      "items": [
        {
          "title": "Nom de l'activité",
          "subtitle": "Âge recommandé",
          "description": "Description et étapes",
          "details": "Matériel nécessaire (tout trouvable à la maison)",
          "tags": ["créatif", "facile"],
          "highlighted": false
        }
      ]
    },
    {
      "id": "spectacles",
      "title": "🎭 Spectacles & Théâtre",
      "emoji": "🎭",
      "color": "pink",
      "items": [...]
    }
  ],
  "tip_of_week": {
    "emoji": "💡",
    "title": "L'astuce de la semaine",
    "content": "Un conseil pratique pour les parents (gestion du temps, préparation sortie, etc.)"
  },
  "agenda_preview": {
    "title": "📅 Dans votre agenda",
    "note": "Rappel sympa sur les événements à venir de la famille"
  }
}

Assure-toi que:
- Les films/spectacles mentionnés sont adaptés aux ${agesDesc}
- Si la météo est mauvaise (pluie, froid), privilégie les activités intérieures et activités maison
- Si la météo est belle, propose des sorties en plein air pour ${profile.city}
- Les activités maison doivent être simples, ludiques, avec du matériel courant
- 2-3 items par section maximum, qualité > quantité
- Ton chaleureux et personnel, comme une amie qui conseille`;

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
        return new Response(JSON.stringify({ error: "Limite de requêtes atteinte, réessayez dans quelques instants." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`Anthropic API error: ${status}`);
    }

    const aiData = await response.json();
    const rawContent = aiData.content?.[0]?.text;
    if (!rawContent) throw new Error("Empty AI response");

    const cleaned = rawContent.replace(/^```(?:json)?\s*\n?/i, "").replace(/\n?```\s*$/i, "").trim();
    const parsedContent = JSON.parse(cleaned);

    // Save to cache (upsert)
    await supabase.from("newsletter_cache").upsert({
      user_id: user.id,
      week_key: weekKey,
      content: parsedContent,
    }, { onConflict: "user_id,week_key" });

    // Log subscribers who will receive the newsletter
    if (subscribers.length > 0) {
      console.log(`Newsletter generated for ${subscribers.length} subscriber(s): ${subscribers.map((s) => `${s.name || "?"} <${s.email}>`).join(", ")}`);
    }

    return new Response(JSON.stringify({
      content: parsedContent,
      fromCache: false,
      subscribers: subscribers.map((s) => ({ name: s.name, email: s.email })),
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Newsletter generation error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
