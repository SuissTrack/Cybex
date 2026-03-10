/**
 * Simple keyword-based match score computation.
 * In production, replace with vector embeddings + cosine similarity.
 */

interface JobLike {
  title: string;
  company: string;
  location?: string | null;
  isRemote: boolean;
  contractType: string;
  skills: string[];
  description: string;
}

interface ProfileLike {
  skills: string[];
  preferences?: {
    desiredTitles: string[];
    desiredLocations: string[];
    remotePreference: string;
    contractTypes: string[];
  } | null;
}

export function computeMatchScore(job: JobLike, profile: ProfileLike): number {
  const prefs = profile.preferences;
  if (!prefs) return 0;

  let score = 0;
  let maxScore = 0;

  // ── Title match (weight: 3) ────────────────────────────────────────────────
  maxScore += 3;
  const titleLower = job.title.toLowerCase();
  const titleMatch = prefs.desiredTitles.some((t) => titleLower.includes(t.toLowerCase()));
  if (titleMatch) score += 3;

  // ── Skills match (weight: 3) ───────────────────────────────────────────────
  maxScore += 3;
  const profileSkills = profile.skills.map((s) => s.toLowerCase());
  const jobSkills = job.skills.map((s) => s.toLowerCase());
  const skillOverlap = jobSkills.filter((s) => profileSkills.some((p) => p.includes(s) || s.includes(p)));
  if (jobSkills.length > 0) {
    score += 3 * (skillOverlap.length / Math.max(jobSkills.length, 1));
  }

  // ── Remote match (weight: 2) ───────────────────────────────────────────────
  maxScore += 2;
  const remoteOk =
    prefs.remotePreference === 'ANY' ||
    (prefs.remotePreference === 'REMOTE' && job.isRemote) ||
    (prefs.remotePreference === 'ONSITE' && !job.isRemote) ||
    (prefs.remotePreference === 'HYBRID');
  if (remoteOk) score += 2;

  // ── Location match (weight: 1) ─────────────────────────────────────────────
  maxScore += 1;
  const locationLower = (job.location ?? '').toLowerCase();
  const locationMatch = prefs.desiredLocations.some((l) => locationLower.includes(l.toLowerCase()));
  if (locationMatch || job.isRemote) score += 1;

  // ── Contract type match (weight: 1) ───────────────────────────────────────
  maxScore += 1;
  if (prefs.contractTypes.includes(job.contractType) || prefs.contractTypes.includes('ANY')) score += 1;

  return maxScore > 0 ? Math.round((score / maxScore) * 100) / 100 : 0;
}
