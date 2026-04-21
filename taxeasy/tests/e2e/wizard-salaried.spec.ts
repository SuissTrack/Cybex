import { test, expect } from "@playwright/test";

/**
 * E2E — Parcours wizard complet pour un salarié célibataire genevois.
 *
 * Scénario :
 *  - Alice (alice@taxeasy.ch, plan PREMIUM, commune Genève-Ville)
 *  - Résident genevois · Célibataire · Salarié · Transport TP · Pilier 3A
 *  - Solde bancaire CHF 15'000
 *  - Vérification du calcul fiscal estimé
 */

const TEST_EMAIL = "alice@taxeasy.ch";
const TEST_PASSWORD = "dev-password"; // Credentials provider (dev only)

test.describe("Wizard — Salarié célibataire", () => {
  test.beforeEach(async ({ page }) => {
    // Connexion via le provider Credentials dev
    await page.goto("/login");
    await page.getByLabel(/email/i).fill(TEST_EMAIL);
    await page.getByRole("button", { name: /connexion rapide|quick login/i }).click();
    await page.waitForURL("/dashboard", { timeout: 10_000 });
  });

  test("crée une nouvelle déclaration et la redirige vers le wizard", async ({ page }) => {
    await page.goto("/dashboard");
    await page.getByRole("link", { name: /nouvelle déclaration/i }).click();

    // La page /declaration/new crée la déclaration et redirige vers /declaration/[id]
    await page.waitForURL(/\/declaration\/[a-z0-9]+$/, { timeout: 10_000 });
    await expect(page.getByText(/résidence/i)).toBeVisible();
  });

  test("parcourt le wizard complet et obtient une estimation fiscale", async ({ page }) => {
    // Créer déclaration
    await page.goto("/declaration/new");
    await page.waitForURL(/\/declaration\/[a-z0-9]+$/);

    // Section 1 — Résidence
    await page.getByLabel(/résident.*genevois/i).click();
    await page.getByRole("button", { name: /continuer/i }).click();

    // Section 2 — État civil
    await page.getByLabel(/célibataire/i).click();
    await page.getByRole("button", { name: /continuer/i }).click();

    // Pas d'enfants
    await page.getByLabel(/non/i).first().click();
    await page.getByRole("button", { name: /continuer/i }).click();

    // Section 3 — Revenus : salarié
    await page.getByLabel(/salarié\(e\)$/i).click();
    await page.getByRole("button", { name: /continuer/i }).click();

    // Upload certificat de salaire — on skip (info node ou document_upload)
    // On clique "Continuer" sans uploader (le step document_upload accepte la navigation)
    await page.getByRole("button", { name: /continuer/i }).click();

    // Pas d'autres revenus
    await page.getByLabel(/non/i).first().click();
    await page.getByRole("button", { name: /continuer/i }).click();

    // Section 4 — Déductions : pas de rachat LPP
    await page.getByLabel(/non/i).first().click();
    await page.getByRole("button", { name: /continuer/i }).click();

    // 3A : oui
    await page.getByLabel(/^oui$/i).click();
    await page.getByRole("button", { name: /continuer/i }).click();

    // 3B : non
    await page.getByLabel(/non/i).first().click();
    await page.getByRole("button", { name: /continuer/i }).click();

    // LAMal : CHF 4'000
    await page.getByPlaceholder(/0/i).fill("4000");
    await page.getByRole("button", { name: /continuer/i }).click();

    // Frais pro : forfait
    await page.getByLabel(/forfait/i).click();
    await page.getByRole("button", { name: /continuer/i }).click();

    // Transport : TP
    await page.getByLabel(/transports en commun/i).click();
    await page.getByRole("button", { name: /continuer/i }).click();

    // Pas de télétravail
    await page.getByLabel(/non/i).first().click();
    await page.getByRole("button", { name: /continuer/i }).click();

    // Repas : non
    await page.getByLabel(/non/i).first().click();
    await page.getByRole("button", { name: /continuer/i }).click();

    // Formation : non
    await page.getByLabel(/non/i).first().click();
    await page.getByRole("button", { name: /continuer/i }).click();

    // Frais médicaux : non
    await page.getByLabel(/non/i).first().click();
    await page.getByRole("button", { name: /continuer/i }).click();

    // Handicap : non
    await page.getByLabel(/non/i).first().click();
    await page.getByRole("button", { name: /continuer/i }).click();

    // Dons : non
    await page.getByLabel(/non/i).first().click();
    await page.getByRole("button", { name: /continuer/i }).click();

    // Pensions : non
    await page.getByLabel(/non/i).first().click();
    await page.getByRole("button", { name: /continuer/i }).click();

    // Section 5 — Fortune
    // Comptes bancaires : CHF 15'000
    await page.getByPlaceholder(/0/i).fill("15000");
    await page.getByRole("button", { name: /continuer/i }).click();

    // Titres : non
    await page.getByLabel(/non/i).first().click();
    await page.getByRole("button", { name: /continuer/i }).click();

    // Immobilier : non
    await page.getByLabel(/non/i).first().click();
    await page.getByRole("button", { name: /continuer/i }).click();

    // Véhicules : non
    await page.getByLabel(/non/i).first().click();
    await page.getByRole("button", { name: /continuer/i }).click();

    // Autres éléments : non
    await page.getByLabel(/non/i).first().click();
    await page.getByRole("button", { name: /continuer/i }).click();

    // CRV : non
    await page.getByLabel(/non/i).first().click();
    await page.getByRole("button", { name: /terminer/i }).click();

    // Récapitulatif — vérifier que l'estimation est présente
    await expect(page.getByText(/estimation/i)).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/CHF/)).toBeVisible();
  });

  test("le bouton Retour navigue vers l'étape précédente", async ({ page }) => {
    await page.goto("/declaration/new");
    await page.waitForURL(/\/declaration\/[a-z0-9]+$/);

    // Répondre à la première question
    await page.getByLabel(/résident.*genevois/i).click();
    await page.getByRole("button", { name: /continuer/i }).click();

    // Vérifier qu'on est sur la page famille
    await expect(page.getByText(/familiale|civil/i)).toBeVisible();

    // Retour
    await page.getByRole("button", { name: /retour/i }).click();

    // On revient sur la résidence
    await expect(page.getByText(/résidence/i)).toBeVisible();
  });
});
