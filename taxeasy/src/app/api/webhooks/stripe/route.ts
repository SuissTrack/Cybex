import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe/client";
import { activatePlan } from "@/lib/stripe/plans";
import { Plan } from "@/types/declaration";
import type Stripe from "stripe";

/**
 * POST /api/webhooks/stripe
 *
 * Reçoit les événements Stripe et met à jour le plan utilisateur.
 * La signature est vérifiée via STRIPE_WEBHOOK_SECRET.
 *
 * Événements gérés :
 *  - checkout.session.completed → active le plan
 *  - payment_intent.payment_failed → log uniquement (pas de downgrade auto)
 */
export async function POST(req: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("[stripe-webhook] STRIPE_WEBHOOK_SECRET manquant");
    return NextResponse.json({ error: "Webhook non configuré" }, { status: 500 });
  }

  const rawBody = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig) {
    return NextResponse.json({ error: "Signature manquante" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err) {
    console.error("[stripe-webhook] Signature invalide:", err);
    return NextResponse.json(
      { error: "Signature invalide" },
      { status: 400 }
    );
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId;
        const plan = session.metadata?.plan as Plan | undefined;

        if (!userId || !plan) {
          console.error("[stripe-webhook] Métadonnées manquantes:", session.metadata);
          break;
        }

        if (!["BASIC", "PREMIUM"].includes(plan)) {
          console.error("[stripe-webhook] Plan invalide:", plan);
          break;
        }

        await activatePlan(userId, plan);
        console.log(`[stripe-webhook] Plan ${plan} activé pour user ${userId}`);
        break;
      }

      case "payment_intent.payment_failed": {
        const pi = event.data.object as Stripe.PaymentIntent;
        console.warn("[stripe-webhook] Paiement échoué:", pi.id, pi.last_payment_error?.message);
        // Pas de downgrade automatique — l'utilisateur reçoit un email de Stripe
        break;
      }

      default:
        // Événement non géré — on acquitte quand même pour éviter les retry Stripe
        break;
    }
  } catch (err) {
    console.error("[stripe-webhook] Erreur traitement:", err);
    return NextResponse.json(
      { error: "Erreur interne" },
      { status: 500 }
    );
  }

  return NextResponse.json({ received: true });
}
