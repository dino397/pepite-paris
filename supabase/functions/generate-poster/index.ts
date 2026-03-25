import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * generate-poster: Generates Ghibli-style watercolor illustrations for activities
 *
 * Uses Together AI FLUX.1 Schnell (free tier) to generate images,
 * then stores them in Supabase Storage for caching.
 *
 * Input: { title, category, description }
 * Output: { poster_url } (public URL from Supabase Storage)
 */

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const TOGETHER_API_KEY = Deno.env.get("TOGETHER_API_KEY");
    if (!TOGETHER_API_KEY) throw new Error("TOGETHER_API_KEY is not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { title, category, description, activityId } = await req.json();
    if (!title) throw new Error("title is required");

    // Generate a stable filename from the title (for caching)
    const slug = title
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 60);
    const fileName = `posters/${slug}.png`;

    // Check if poster already exists in storage
    const { data: existingFile } = await supabase.storage
      .from("activity-posters")
      .list("posters", { search: `${slug}.png` });

    if (existingFile && existingFile.length > 0) {
      const { data: urlData } = supabase.storage
        .from("activity-posters")
        .getPublicUrl(fileName);

      return new Response(JSON.stringify({
        poster_url: urlData.publicUrl,
        cached: true
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build the image generation prompt based on category
    const categoryPrompts: Record<string, string> = {
      cinema: "a magical movie theater scene with film reels and starry lights",
      theatre: "a charming puppet theater stage with velvet curtains and warm spotlights",
      expo: "a wonderous museum gallery with paintings coming alive and children exploring",
      activite: "children playing joyfully in a magical park with butterflies and flowers",
      parc: "a dreamy park landscape with ancient trees, gentle sunlight filtering through leaves",
      zoo: "adorable animals in a lush magical garden, a gentle zookeeper with children",
      concert: "children and musicians playing instruments in a magical concert hall with floating notes",
      sport: "energetic children climbing, jumping and playing sports in a colorful gymnasium",
      escape: "adventurous children solving puzzles in a mysterious treasure-filled room",
      visite: "a magical boat gliding on the Seine river with Paris monuments glowing softly",
      attraction: "a whimsical carousel and ferris wheel in a dreamy fairground at golden hour",
    };

    const sceneDesc = categoryPrompts[category] || "children having a wonderful adventure in a magical place";

    const prompt = `Studio Ghibli watercolor illustration, ${sceneDesc}, inspired by "${title}". Soft pastel colors, hand-painted texture, dreamy atmosphere, warm golden light, gentle brushstrokes, whimsical and enchanting mood. No text, no letters, no words in the image.`;

    console.log(`[generate-poster] Generating: ${title} (${category})`);

    // Call Together AI FLUX.1 Schnell
    const response = await fetch("https://api.together.xyz/v1/images/generations", {
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

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Together AI error ${response.status}: ${errText.slice(0, 200)}`);
    }

    const result = await response.json();
    const b64Image = result.data?.[0]?.b64_json;
    if (!b64Image) throw new Error("No image data in response");

    // Decode base64 to binary
    const binaryStr = atob(b64Image);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from("activity-posters")
      .upload(fileName, bytes, {
        contentType: "image/png",
        upsert: true,
      });

    if (uploadError) throw new Error(`Upload error: ${uploadError.message}`);

    // Get public URL
    const { data: urlData } = supabase.storage
      .from("activity-posters")
      .getPublicUrl(fileName);

    const posterUrl = urlData.publicUrl;
    console.log(`[generate-poster] ✅ Generated: ${posterUrl}`);

    return new Response(JSON.stringify({
      poster_url: posterUrl,
      cached: false
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: unknown) {
    console.error("[generate-poster] Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
