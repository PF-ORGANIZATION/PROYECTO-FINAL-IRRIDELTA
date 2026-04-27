// supabase/functions/chat/index.ts
// Supabase Edge Function — acts as a secure proxy to the Groq API.
// The GROQ_API_KEY secret is stored in Supabase's secret vault and
// never sent to the browser.
// Supports both streaming (stream: true) and non-streaming responses.

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",   // tighten to your domain in production
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const groqApiKey = Deno.env.get("GROQ_API_KEY");
    if (!groqApiKey) {
      throw new Error("GROQ_API_KEY secret is not configured in Supabase.");
    }

    const { messages, model, temperature, max_tokens, stream } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: "Invalid request: messages is required." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const groqBody = {
      model: model ?? "llama-3.1-8b-instant",
      messages,
      temperature: temperature ?? 0.1,
      max_tokens: max_tokens ?? 1024,
      stream: !!stream,
    };

    // ── Streaming mode ──
    if (stream) {
      const groqResponse = await fetch(GROQ_API_URL, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${groqApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(groqBody),
      });

      if (!groqResponse.ok) {
        const errData = await groqResponse.json();
        console.error("Groq streaming error:", errData);
        return new Response(JSON.stringify({ error: "Groq API error", details: errData }), {
          status: groqResponse.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Pipe Groq's SSE stream directly to the browser
      return new Response(groqResponse.body, {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive",
        },
      });
    }

    // ── Non-streaming mode (with retry for 429) ──
    const MAX_RETRIES = 3;
    let groqResponse: Response | null = null;
    let groqData: any = null;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      groqResponse = await fetch(GROQ_API_URL, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${groqApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(groqBody),
      });

      groqData = await groqResponse.json();

      if (groqResponse.status !== 429) break;

      console.warn(`Groq 429 — intento ${attempt}/${MAX_RETRIES}`);

      if (attempt < MAX_RETRIES) {
        await new Promise((r) => setTimeout(r, 2000 * attempt));
      }
    }

    if (!groqResponse!.ok) {
      console.error("Groq API error:", groqData);
      return new Response(JSON.stringify({ error: "Groq API error", details: groqData }), {
        status: groqResponse!.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(groqData), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("Edge function error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
