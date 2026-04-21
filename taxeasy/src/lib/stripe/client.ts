import Stripe from "stripe";

/**
 * Client Stripe singleton.
 * En développement, STRIPE_SECRET_KEY peut être absent — les fonctions
 * de paiement retournent des stubs dans ce cas.
 * La vérification est déplacée dans getStripe() pour éviter une erreur
 * au chargement du module lors du build Next.js.
 */
export const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2026-03-25.dahlia",
      typescript: true,
    })
  : null;

export function getStripe(): Stripe {
  if (!stripe) {
    // En production, cette erreur ne doit jamais se produire si l'env est correctement configuré
    throw new Error(
      "Stripe non configuré. Ajoutez STRIPE_SECRET_KEY à votre .env"
    );
  }
  return stripe;
}
