import { Plan } from "@/types/declaration";
import { getStripe } from "./client";
import { prisma } from "@/lib/db/client";

/**
 * Correspondance Plan → Price ID Stripe.
 * Configurez ces IDs dans le dashboard Stripe puis dans votre .env
 */
export const STRIPE_PRICE_IDS: Record<Exclude<Plan, "FREE">, string> = {
  BASIC: process.env.STRIPE_PRICE_BASIC ?? "price_basic_placeholder",
  PREMIUM: process.env.STRIPE_PRICE_PREMIUM ?? "price_premium_placeholder",
};

export const PLAN_AMOUNTS_CHF: Record<Plan, number> = {
  FREE: 0,
  BASIC: 19_00, // CHF 19.00 en centimes
  PREMIUM: 39_00, // CHF 39.00 en centimes
};

export const PLAN_LABELS: Record<Plan, string> = {
  FREE: "Gratuit",
  BASIC: "Basic",
  PREMIUM: "Premium",
};

/**
 * Crée une Checkout Session Stripe pour upgrader le plan.
 */
export async function createCheckoutSession(
  userId: string,
  userEmail: string,
  plan: Exclude<Plan, "FREE">,
  successUrl: string,
  cancelUrl: string
): Promise<string> {
  const stripe = getStripe();
  const priceId = STRIPE_PRICE_IDS[plan];

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: userEmail,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      userId,
      plan,
    },
    // Facturation en CHF
    currency: "chf",
  });

  if (!session.url) throw new Error("Stripe n'a pas retourné d'URL de paiement");
  return session.url;
}

/**
 * Upgrade le plan utilisateur en base après paiement confirmé.
 * Appelé depuis le webhook Stripe (checkout.session.completed).
 */
export async function activatePlan(userId: string, plan: Plan): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { plan },
  });
}
