import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/**
 * Primary n8n production webhook URL.
 * Note: If n8n workflow is not active, production URLs return 404.
 */
const N8N_WEBHOOK_URL =
  Deno.env.get("N8N_WEBHOOK_URL") ??
  "https://aiagentsworkbysk01.app.n8n.cloud/webhook/candidate-screening";

function normalizePathname(pathname: string) {
  return pathname.replace(/\/+$/, "");
}

function buildWebhookCandidates(primaryUrl: string): string[] {
  // Try a few safe variations to reduce common misconfiguration friction:
  // - /webhook vs /webhook-test
  // - candidate-screening vs resume-screening
  const out: string[] = [];
  const seen = new Set<string>();

  const add = (url: string) => {
    if (!seen.has(url)) {
      seen.add(url);
      out.push(url);
    }
  };

  let u: URL;
  try {
    u = new URL(primaryUrl);
  } catch {
    add(primaryUrl);
    return out;
  }

  const base = new URL(u.toString());
  const p0 = normalizePathname(base.pathname);

  const pathVariants = new Set<string>();
  pathVariants.add(p0);

  if (p0.includes("/webhook-test/")) {
    pathVariants.add(p0.replace("/webhook-test/", "/webhook/"));
  }
  if (p0.includes("/webhook/")) {
    pathVariants.add(p0.replace("/webhook/", "/webhook-test/"));
  }

  for (const p of Array.from(pathVariants)) {
    if (p.endsWith("/candidate-screening")) {
      pathVariants.add(p.replace(/\/candidate-screening$/, "/resume-screening"));
    }
    if (p.endsWith("/resume-screening")) {
      pathVariants.add(p.replace(/\/resume-screening$/, "/candidate-screening"));
    }
  }

  // Primary first
  add(primaryUrl);

  // Then normalized/derived versions
  for (const pathname of Array.from(pathVariants)) {
    const v = new URL(base.toString());
    v.pathname = pathname;
    add(v.toString());
  }

  return out;
}

function cloneFormData(entries: [string, FormDataEntryValue][]) {
  const fd = new FormData();
  for (const [k, v] of entries) fd.append(k, v);
  return fd;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const formData = await req.formData();
    const entries = Array.from(formData.entries());

    const candidates = buildWebhookCandidates(N8N_WEBHOOK_URL);
    console.log("resume-screening: forwarding to n8n", {
      method: "POST",
      candidatesCount: candidates.length,
    });

    let lastResponse: { status: number; text: string } | null = null;

    for (const url of candidates) {
      console.log("resume-screening: trying n8n url", url);

      const response = await fetch(url, {
        method: "POST",
        body: cloneFormData(entries),
      });

      const responseText = await response.text();
      lastResponse = { status: response.status, text: responseText };

      console.log("resume-screening: n8n responded", {
        url,
        status: response.status,
      });

      // If n8n says the webhook is not registered (404), try the next variant.
      if (response.status === 404) {
        continue;
      }

      let responseData: unknown;
      try {
        responseData = JSON.parse(responseText);
      } catch {
        responseData = { raw: responseText };
      }

      return new Response(JSON.stringify(responseData), {
        status: response.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // All candidates 404'd (or no candidates). Return last response details to help debugging.
    const finalText = lastResponse?.text ?? "No response from n8n";

    let responseData: unknown;
    try {
      responseData = JSON.parse(finalText);
    } catch {
      responseData = { raw: finalText };
    }

    return new Response(JSON.stringify(responseData), {
      status: lastResponse?.status ?? 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    console.error("resume-screening: error proxying to n8n:", errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
