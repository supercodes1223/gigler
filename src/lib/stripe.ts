/**
 * Stripe billing helpers.
 * Manages subscriptions, plan upgrades/downgrades, and webhooks.
 */

const STRIPE_API = "https://api.stripe.com/v1";

interface StripeConfig {
  secretKey: string;
}

function stripeHeaders(config: StripeConfig) {
  return {
    Authorization: `Bearer ${config.secretKey}`,
    "Content-Type": "application/x-www-form-urlencoded",
  };
}

export const PLAN_PRICE_IDS: Record<string, string> = {
  pro: process.env.STRIPE_PRO_PRICE_ID || "",
  team: process.env.STRIPE_TEAM_PRICE_ID || "",
};

export async function createCheckoutSession(
  config: StripeConfig,
  options: {
    customerId?: string;
    priceId: string;
    successUrl: string;
    cancelUrl: string;
  }
): Promise<{ url: string; sessionId: string }> {
  const params = new URLSearchParams({
    "line_items[0][price]": options.priceId,
    "line_items[0][quantity]": "1",
    mode: "subscription",
    success_url: options.successUrl,
    cancel_url: options.cancelUrl,
  });

  if (options.customerId) {
    params.set("customer", options.customerId);
  }

  const response = await fetch(`${STRIPE_API}/checkout/sessions`, {
    method: "POST",
    headers: stripeHeaders(config),
    body: params.toString(),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(`Stripe error: ${data.error?.message || response.statusText}`);
  }

  return { url: data.url, sessionId: data.id };
}

export async function createCustomer(
  config: StripeConfig,
  email: string,
  name?: string,
  metadata?: Record<string, string>
): Promise<{ customerId: string }> {
  const params = new URLSearchParams({ email });
  if (name) params.set("name", name);
  if (metadata) {
    Object.entries(metadata).forEach(([k, v]) => {
      params.set(`metadata[${k}]`, v);
    });
  }

  const response = await fetch(`${STRIPE_API}/customers`, {
    method: "POST",
    headers: stripeHeaders(config),
    body: params.toString(),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(`Stripe error: ${data.error?.message || response.statusText}`);
  }

  return { customerId: data.id };
}

export async function createPortalSession(
  config: StripeConfig,
  customerId: string,
  returnUrl: string
): Promise<{ url: string }> {
  const response = await fetch(`${STRIPE_API}/billing_portal/sessions`, {
    method: "POST",
    headers: stripeHeaders(config),
    body: new URLSearchParams({
      customer: customerId,
      return_url: returnUrl,
    }).toString(),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(`Stripe error: ${data.error?.message || response.statusText}`);
  }

  return { url: data.url };
}

/**
 * Plan limits enforced in Lambda handlers before executing premium features.
 */
export const PLAN_LIMITS = {
  free: {
    maxActiveGigs: 5,
    voiceCalls: false,
    groupGigs: false,
    maxParticipantsPerGig: 1,
    maxDeliverablesPerGig: 1,
    brandingOnDeliverables: true,
    rateLimitedAI: true,
  },
  pro: {
    maxActiveGigs: Infinity,
    voiceCalls: true,
    groupGigs: true,
    maxParticipantsPerGig: 5,
    maxDeliverablesPerGig: Infinity,
    brandingOnDeliverables: false,
    rateLimitedAI: false,
  },
  team: {
    maxActiveGigs: Infinity,
    voiceCalls: true,
    groupGigs: true,
    maxParticipantsPerGig: 20,
    maxDeliverablesPerGig: Infinity,
    brandingOnDeliverables: false,
    rateLimitedAI: false,
  },
  enterprise: {
    maxActiveGigs: Infinity,
    voiceCalls: true,
    groupGigs: true,
    maxParticipantsPerGig: Infinity,
    maxDeliverablesPerGig: Infinity,
    brandingOnDeliverables: false,
    rateLimitedAI: false,
  },
} as const;

export type PlanType = keyof typeof PLAN_LIMITS;

export function checkPlanLimit(
  plan: string,
  feature: keyof (typeof PLAN_LIMITS)["free"]
): boolean {
  const limits = PLAN_LIMITS[(plan as PlanType) || "free"];
  const value = limits[feature];
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value > 0;
  return true;
}

export function getPlanLimit(
  plan: string,
  feature: keyof (typeof PLAN_LIMITS)["free"]
): number | boolean {
  const limits = PLAN_LIMITS[(plan as PlanType) || "free"];
  return limits[feature];
}
