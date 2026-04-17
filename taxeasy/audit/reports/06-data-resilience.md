# Audit 06 — Data Resilience

**Agent** : DataResilienceAuditor
**Date** : 2026-04-17
**Score** : PASS (après corrections)

---

## 1. Schéma Prisma — Indexes

| Colonne | Index présent avant audit | Action |
|---|---|---|
| `Declaration.userId` | Non | Ajouté `@@index([userId])` |
| `Declaration.status` | Non | Ajouté `@@index([status])` |
| `Document.userId` | Non | Ajouté `@@index([userId])` |
| `Document.declarationId` | Non | Ajouté `@@index([declarationId])` |
| `Export.declarationId` | Non | Ajouté `@@index([declarationId])` |
| `Account.[provider, providerAccountId]` | Oui (`@@unique`) | OK |
| `Session.sessionToken` | Oui (`@unique`) | OK |

**Tous les 5 indexes critiques étaient absents — ajoutés automatiquement.**

---

## 2. Cascades — Relations

| Relation | `onDelete` avant audit | Action |
|---|---|---|
| `User → Account` | Cascade | OK (NextAuth standard) |
| `User → Session` | Cascade | OK (NextAuth standard) |
| `User → Declaration` | **Absent** | Ajouté `onDelete: Cascade` |
| `User → Document` | **Absent** | Ajouté `onDelete: Cascade` |
| `Declaration → Document` | **Absent** | Ajouté `onDelete: SetNull` (Document peut exister sans déclaration) |
| `Declaration → Export` | **Absent** | Ajouté `onDelete: Cascade` |

**Choix `SetNull` pour `Declaration → Document`** : un document peut être uploadé sans être rattaché à une déclaration (`declarationId` est `String?`). Si la déclaration est supprimée, le document reste accessible sous l'utilisateur (comportement attendu). La suppression complète des documents d'un user est gérée par `DELETE /api/account/delete` via `prisma.document.deleteMany({ where: { userId } })`.

---

## 3. Requêtes N+1

### Analyse complète des requêtes Prisma

| Fichier | Requête | Pattern |
|---|---|---|
| `src/lib/db/queries/declarations.ts` | `getDeclarationsByUser` | `include: { documents, exports }` — **OK, 1 requête** |
| `src/lib/db/queries/declarations.ts` | `getDeclarationById` | `include: { documents, exports }` — **OK, 1 requête** |
| `src/app/(dashboard)/documents/page.tsx` | `document.findMany` | `include: { declaration }` — **OK, 1 requête** |
| `src/app/(dashboard)/declaration/[id]/export/page.tsx` | `getDeclarationById` + `export.findMany` | 2 requêtes parallèles — **acceptable** |
| `src/app/api/declarations/[id]/export/route.ts` | `getDeclarationById` + `user.findUnique` × 2 | **PROBLÈME : double fetch user** — corrigé |
| `src/app/api/declarations/[id]/answers/route.ts` | `user.findUnique` conditionnel | OK — seulement si nœud terminal |

**Aucun N+1 en boucle détecté.** Un seul doublon de requête (user dans export route) — corrigé.

---

## 4. Validation des données entrantes

### `POST /api/declarations`

| Champ | Validation |
|---|---|
| `taxYear` | Oui — vérification `< 2020 || > 2030` manuelle |
| Corps malformé | Oui — `.catch(() => ({}))` avec fallback |

Pas de Zod. Validation manuelle minimale mais suffisante pour ce champ simple.

### `PUT /api/declarations/[id]/answers`

| Champ | Validation |
|---|---|
| Corps manquant/non-objet | Oui — vérification `!body || typeof body !== "object"` |
| `currentNodeId` | Oui — `engine.getNode(currentNodeId)` valide l'existence du nœud |
| `answers` shape | **Non** — casté directement en `DeclarationAnswers` sans vérification de structure |
| Valeurs numériques (centimes) | **Non** — pas de vérification de plage ou de type sur les champs numériques |

**Risque** : un `answers` malformé (ex. string là où un number est attendu) est persisté tel quel. Le calcul fiscal échouera à l'exécution mais l'erreur est catchée (`best-effort`). Pas de risque de corruption critique car le champ est `Json` libre.

---

## 5. Edge Cases

### Champ `answers` avec champs inconnus

Le champ `answers` est `Json @default("{}")` sans contrainte de schéma côté base. Si des clés inconnues sont persistées (ex. futur wizard avec nouvelles questions), elles sont ignorées par le calculateur fiscal via destructuring sélectif dans `buildTaxInputFromAnswers`. Comportement sûr.

### `currentNodeId` vers un nœud inexistant

**Géré** : `engine.getNode(currentNodeId)` lève une exception si le nœud n'existe pas → retourne `400 Bad Request` avec message explicite.

### Montants en centimes et `Number.MAX_SAFE_INTEGER`

Max fortune plausible en Suisse : ~50 milliards CHF = 5 000 000 000 000 centimes = 5 × 10¹². `Number.MAX_SAFE_INTEGER` = ~9 × 10¹⁵. Pas de risque de dépassement sur des fortunes réelles.

---

## 6. Corrections appliquées

| ID | Correction | Fichier |
|---|---|---|
| DR-001 | Ajout `@@index([userId])` + `@@index([status])` sur `Declaration` | `prisma/schema.prisma` |
| DR-002 | Ajout `@@index([userId])` + `@@index([declarationId])` sur `Document` | `prisma/schema.prisma` |
| DR-003 | Ajout `@@index([declarationId])` sur `Export` | `prisma/schema.prisma` |
| DR-004 | Ajout `onDelete: Cascade` sur `User → Declaration` | `prisma/schema.prisma` |
| DR-005 | Ajout `onDelete: Cascade` sur `User → Document` | `prisma/schema.prisma` |
| DR-006 | Ajout `onDelete: SetNull` sur `Declaration → Document` | `prisma/schema.prisma` |
| DR-007 | Ajout `onDelete: Cascade` sur `Declaration → Export` | `prisma/schema.prisma` |
| DR-008 | Fusion des 2 `user.findUnique` en 1 requête (export route) | `src/app/api/declarations/[id]/export/route.ts` |

---

## 7. Points documentés (non bloquants)

| ID | Sévérité | Description |
|---|---|---|
| DR-009 | MEDIUM | Validation Zod absente sur `answers` shape — déjà documenté en SEC-012 / CQ-003 |
| DR-010 | LOW | `DELETE /api/account/delete` supprime manuellement au lieu de s'appuyer sur les cascades DB — comportement correct mais redondant post-fix |

---

## Migration requise

Après modification de `schema.prisma`, exécuter :

```bash
npx prisma migrate dev --name add-indexes-and-cascades
```

En production :
```bash
npx prisma migrate deploy
```
