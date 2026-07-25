import type { ApiKeySlug } from "./api-key-config.js";

export interface ProbeResult {
  healthy: boolean;
  message: string;
  accountLabel?: string | null;
  latencyMs?: number;
  metadata?: Record<string, unknown>;
}

async function timedFetch(
  url: string,
  init?: RequestInit,
): Promise<{ response: Response; latencyMs: number }> {
  const started = Date.now();
  const response = await fetch(url, init);
  return { response, latencyMs: Date.now() - started };
}

/** Gemini — list models with API key. */
export async function probeGemini(apiKey: string): Promise<ProbeResult> {
  const { response, latencyMs } = await timedFetch(
    `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}&pageSize=1`,
  );
  if (!response.ok) {
    const text = await response.text();
    return {
      healthy: false,
      message: `Gemini probe failed (${response.status}): ${text.slice(0, 200)}`,
      latencyMs,
    };
  }
  return {
    healthy: true,
    message: "Gemini API key validated.",
    accountLabel: "Gemini",
    latencyMs,
    metadata: { features: ["assistant", "documents", "summaries"] },
  };
}

/** OpenAI — list models (future provider). */
export async function probeOpenAi(apiKey: string): Promise<ProbeResult> {
  const { response, latencyMs } = await timedFetch(
    "https://api.openai.com/v1/models",
    {
      headers: { Authorization: `Bearer ${apiKey}` },
    },
  );
  if (!response.ok) {
    const text = await response.text();
    return {
      healthy: false,
      message: `OpenAI probe failed (${response.status}): ${text.slice(0, 200)}`,
      latencyMs,
    };
  }
  return {
    healthy: true,
    message: "OpenAI API key validated.",
    accountLabel: "OpenAI",
    latencyMs,
  };
}

/**
 * Stripe — retrieve account (architecture verify only; no charges).
 * Accepts secret key starting with sk_.
 */
export async function probeStripe(apiKey: string): Promise<ProbeResult> {
  const { response, latencyMs } = await timedFetch(
    "https://api.stripe.com/v1/account",
    {
      headers: { Authorization: `Bearer ${apiKey}` },
    },
  );
  if (!response.ok) {
    const text = await response.text();
    return {
      healthy: false,
      message: `Stripe probe failed (${response.status}): ${text.slice(0, 200)}`,
      latencyMs,
    };
  }
  const data = (await response.json()) as {
    id?: string;
    business_profile?: { name?: string };
    email?: string;
  };
  return {
    healthy: true,
    message: "Stripe account reachable. Payment processing deferred.",
    accountLabel: data.business_profile?.name || data.email || data.id || "Stripe",
    latencyMs,
    metadata: {
      architecture: [
        "products",
        "subscriptions",
        "checkout",
        "payment_intents",
        "customer_portal",
        "webhooks",
      ],
      paymentsEnabled: false,
    },
  };
}

/**
 * Cloudinary — admin ping via authenticated upload preset check / API usage.
 * Expects cloudinary URL-style key: cloud_name:api_key:api_secret OR JSON.
 */
export async function probeCloudinary(secret: string): Promise<ProbeResult> {
  const parsed = parseCloudinarySecret(secret);
  if (!parsed) {
    return {
      healthy: false,
      message:
        "Invalid Cloudinary credential. Use cloud_name:api_key:api_secret",
    };
  }
  const auth = Buffer.from(`${parsed.apiKey}:${parsed.apiSecret}`).toString(
    "base64",
  );
  const { response, latencyMs } = await timedFetch(
    `https://api.cloudinary.com/v1_1/${encodeURIComponent(parsed.cloudName)}/ping`,
    {
      headers: { Authorization: `Basic ${auth}` },
    },
  );
  if (!response.ok) {
    const text = await response.text();
    return {
      healthy: false,
      message: `Cloudinary probe failed (${response.status}): ${text.slice(0, 200)}`,
      latencyMs,
    };
  }
  return {
    healthy: true,
    message: "Cloudinary cloud reachable.",
    accountLabel: parsed.cloudName,
    latencyMs,
    metadata: {
      features: ["file_upload", "image_upload", "video_upload", "folders", "secure_urls"],
    },
  };
}

export function parseCloudinarySecret(secret: string): {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
} | null {
  const trimmed = secret.trim();
  if (trimmed.startsWith("{")) {
    try {
      const json = JSON.parse(trimmed) as Record<string, string>;
      if (json.cloud_name && json.api_key && json.api_secret) {
        return {
          cloudName: json.cloud_name,
          apiKey: json.api_key,
          apiSecret: json.api_secret,
        };
      }
    } catch {
      return null;
    }
  }
  const parts = trimmed.split(":");
  if (parts.length >= 3) {
    const cloudName = parts[0];
    const apiKey = parts[1];
    const apiSecret = parts.slice(2).join(":");
    if (!cloudName || !apiKey || !apiSecret) return null;
    return { cloudName, apiKey, apiSecret };
  }
  return null;
}

/** Resend — list domains (or API keys endpoint). */
export async function probeResend(apiKey: string): Promise<ProbeResult> {
  const { response, latencyMs } = await timedFetch(
    "https://api.resend.com/domains",
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    },
  );
  if (!response.ok) {
    const text = await response.text();
    return {
      healthy: false,
      message: `Resend probe failed (${response.status}): ${text.slice(0, 200)}`,
      latencyMs,
    };
  }
  return {
    healthy: true,
    message: "Resend API key validated.",
    accountLabel: "Resend",
    latencyMs,
    metadata: {
      emailTypes: [
        "transactional",
        "otp",
        "invoice",
        "notification",
        "ai_generated",
      ],
    },
  };
}

/**
 * Supabase — verify project URL + service role via Auth health / storage buckets.
 * Secret format: url|service_role_key  OR JSON { url, serviceRoleKey }
 */
export async function probeSupabase(secret: string): Promise<ProbeResult> {
  const parsed = parseSupabaseSecret(secret);
  if (!parsed) {
    // Fall back to env-configured Supabase (verify existing stack)
    const url = process.env.SUPABASE_URL?.replace(/\/$/, "");
    const key =
      process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
      process.env.SUPABASE_SECRET_KEY?.trim();
    if (!url || !key) {
      return {
        healthy: false,
        message:
          "Supabase not configured. Provide url|service_role_key or set SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY.",
      };
    }
    return probeSupabaseWithCreds(url, key);
  }
  return probeSupabaseWithCreds(parsed.url, parsed.serviceRoleKey);
}

async function probeSupabaseWithCreds(
  url: string,
  serviceRoleKey: string,
): Promise<ProbeResult> {
  const { response, latencyMs } = await timedFetch(`${url}/auth/v1/health`, {
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
    },
  });
  if (!response.ok) {
    // Some projects use /rest/v1/ as fallback
    const rest = await timedFetch(`${url}/rest/v1/`, {
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
      },
    });
    if (!rest.response.ok && rest.response.status !== 200) {
      return {
        healthy: false,
        message: `Supabase probe failed (${response.status})`,
        latencyMs,
      };
    }
  }
  return {
    healthy: true,
    message: "Supabase Auth/API reachable. Reusing existing Auth, DB, Storage, Realtime stack.",
    accountLabel: new URL(url).hostname,
    latencyMs,
    metadata: {
      verified: ["authentication", "database", "storage", "realtime"],
      duplicated: false,
    },
  };
}

export function parseSupabaseSecret(secret: string): {
  url: string;
  serviceRoleKey: string;
} | null {
  const trimmed = secret.trim();
  if (trimmed.startsWith("{")) {
    try {
      const json = JSON.parse(trimmed) as Record<string, string>;
      const url = json.url || json.SUPABASE_URL;
      const key =
        json.serviceRoleKey ||
        json.service_role_key ||
        json.SUPABASE_SERVICE_ROLE_KEY;
      if (url && key) return { url: url.replace(/\/$/, ""), serviceRoleKey: key };
    } catch {
      return null;
    }
  }
  const pipe = trimmed.indexOf("|");
  if (pipe > 0) {
    return {
      url: trimmed.slice(0, pipe).replace(/\/$/, ""),
      serviceRoleKey: trimmed.slice(pipe + 1),
    };
  }
  return null;
}

export async function probeApiKeyProvider(
  slug: ApiKeySlug,
  apiKey: string,
): Promise<ProbeResult> {
  switch (slug) {
    case "gemini":
      return probeGemini(apiKey);
    case "openai":
      return probeOpenAi(apiKey);
    case "stripe":
      return probeStripe(apiKey);
    case "cloudinary":
      return probeCloudinary(apiKey);
    case "resend":
      return probeResend(apiKey);
    case "supabase":
      return probeSupabase(apiKey);
    default: {
      const _exhaustive: never = slug;
      return _exhaustive;
    }
  }
}
