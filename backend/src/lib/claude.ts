import Anthropic from '@anthropic-ai/sdk';

export const claude = new Anthropic({ apiKey: process.env.CLAUDE_API_KEY });

// ── Smart Job Ranking ─────────────────────────────────────────────────────────

export interface JobMatch {
  jobId: string;
  score: number;   // 0–100
  reason: string;  // 1 courte phrase (≤ 12 mots)
}

/**
 * Analyse en batch la compatibilité profil × N offres.
 * Un seul appel Claude Haiku, retourne un tableau trié score décroissant.
 */
export async function rankJobsForProfile(params: {
  cvText: string;
  profileSummary: string;
  jobs: Array<{ id: string; title: string; company: string; skills: string[] }>;
  language?: 'fr' | 'en';
}): Promise<JobMatch[]> {
  const { cvText, profileSummary, jobs, language = 'fr' } = params;

  // Compact list — no full descriptions to keep token count low
  const jobList = jobs
    .map((j, i) => `${i + 1}. [${j.id}] ${j.title} @ ${j.company} | Skills requis: ${j.skills.slice(0, 6).join(', ')}`)
    .join('\n');

  const prompt =
    language === 'fr'
      ? `Tu es un expert en recrutement tech. Analyse la compatibilité entre ce candidat et chaque offre.

**PROFIL CANDIDAT**:
${profileSummary}

**EXTRAITS CV**:
${cvText.slice(0, 1800)}

**OFFRES (${jobs.length}) — format: [ID] titre @ entreprise | skills**:
${jobList}

Attribue un score (0-100) et une raison COURTE (≤12 mots) pour chaque offre.
Réponds UNIQUEMENT avec ce tableau JSON (sans markdown) :
[{"jobId":"<id exact>","score":<0-100>,"reason":"<raison courte>"},…]`
      : `You are a tech recruitment expert. Analyze compatibility between this candidate and each job.

**CANDIDATE PROFILE**:
${profileSummary}

**CV EXTRACT**:
${cvText.slice(0, 1800)}

**JOBS (${jobs.length}) — format: [ID] title @ company | required skills**:
${jobList}

Give a score (0-100) and SHORT reason (≤12 words) per job.
Reply ONLY with this JSON array (no markdown):
[{"jobId":"<exact id>","score":<0-100>,"reason":"<short reason>"},…]`;

  const message = await claude.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: Math.max(512, jobs.length * 50 + 128),
    messages: [{ role: 'user', content: prompt }],
  });

  const block = message.content[0];
  if (block.type !== 'text') throw new Error('Unexpected Claude response type');

  const raw = block.text.trim().replace(/^```json?\s*/i, '').replace(/\s*```$/i, '');
  const parsed = JSON.parse(raw) as JobMatch[];
  return parsed.sort((a, b) => b.score - a.score);
}

// ── Cover Letter ──────────────────────────────────────────────────────────────

export async function generateCoverLetter(params: {
  jobTitle: string;
  company: string;
  jobDescription: string;
  candidateName: string;
  cvText: string;
  language?: 'fr' | 'en';
}): Promise<string> {
  const { jobTitle, company, jobDescription, candidateName, cvText, language = 'fr' } = params;

  const system =
    language === 'fr'
      ? `Tu es un expert en rédaction de lettres de motivation professionnelles pour le marché suisse et français.
Tu rédiges des lettres concises (max 300 mots), percutantes, personnalisées au poste et à l'entreprise.
Ton professionnel mais humain. Format: 3 paragraphes (accroche forte + valeur ajoutée concrète + conclusion avec CTA).
NE JAMAIS utiliser de formules génériques comme "Je me permets de vous contacter".`
      : `You are an expert at writing professional cover letters for the Swiss and French job markets.
Write concise (max 300 words), impactful, personalised letters.
Professional but human tone. 3 paragraphs: strong hook, concrete value-add, closing CTA.`;

  const user =
    language === 'fr'
      ? `Rédige une lettre de motivation pour ce poste :

**Poste**: ${jobTitle}
**Entreprise**: ${company}
**Description du poste**: ${jobDescription.slice(0, 2500)}

**Profil du candidat (extrait CV)**:
${cvText.slice(0, 2500)}

**Nom**: ${candidateName}

Génère uniquement le corps de la lettre (3 paragraphes), sans en-tête ni formules de politesse finales.`
      : `Write a cover letter for this position:

**Role**: ${jobTitle} at ${company}
**Job description**: ${jobDescription.slice(0, 2500)}
**Candidate profile (CV)**: ${cvText.slice(0, 2500)}
**Name**: ${candidateName}

Return only the 3-paragraph letter body.`;

  const message = await claude.messages.create({
    model: 'claude-opus-4-5',
    max_tokens: 1024,
    system,
    messages: [{ role: 'user', content: user }],
  });

  const block = message.content[0];
  if (block.type !== 'text') throw new Error('Unexpected Claude response type');
  return block.text.trim();
}

// ── ATS / Job Match Analysis ──────────────────────────────────────────────────

export interface AtsAnalysis {
  score: number;          // 0–100
  strengths: string[];    // 3 points forts du profil pour ce poste
  gaps: string[];         // mots-clés / compétences manquants
  suggestions: string[];  // 3 actions concrètes pour améliorer la candidature
  verdict: string;        // phrase de synthèse (1 ligne)
}

export async function analyzeJobMatch(params: {
  jobTitle: string;
  company: string;
  jobDescription: string;
  cvText: string;
  language?: 'fr' | 'en';
}): Promise<AtsAnalysis> {
  const { jobTitle, company, jobDescription, cvText, language = 'fr' } = params;

  const prompt =
    language === 'fr'
      ? `Analyse la compatibilité entre ce profil candidat et cette offre d'emploi.

**Poste**: ${jobTitle} chez ${company}
**Description**: ${jobDescription.slice(0, 2000)}

**CV du candidat**:
${cvText.slice(0, 2000)}

Réponds UNIQUEMENT avec ce JSON (sans markdown, sans explication) :
{
  "score": <entier 0-100>,
  "strengths": ["<point fort 1>", "<point fort 2>", "<point fort 3>"],
  "gaps": ["<manque 1>", "<manque 2>", "<manque 3>"],
  "suggestions": ["<action concrète 1>", "<action concrète 2>", "<action concrète 3>"],
  "verdict": "<phrase de synthèse en 1 ligne>"
}`
      : `Analyze the compatibility between this candidate profile and job posting.

**Role**: ${jobTitle} at ${company}
**Description**: ${jobDescription.slice(0, 2000)}

**Candidate CV**:
${cvText.slice(0, 2000)}

Reply ONLY with this JSON (no markdown):
{
  "score": <integer 0-100>,
  "strengths": ["<strength 1>", "<strength 2>", "<strength 3>"],
  "gaps": ["<gap 1>", "<gap 2>", "<gap 3>"],
  "suggestions": ["<action 1>", "<action 2>", "<action 3>"],
  "verdict": "<one-line summary>"
}`;

  const message = await claude.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 512,
    messages: [{ role: 'user', content: prompt }],
  });

  const block = message.content[0];
  if (block.type !== 'text') throw new Error('Unexpected Claude response type');

  // Strip potential markdown fences
  const raw = block.text.trim().replace(/^```json?\s*/i, '').replace(/\s*```$/i, '');
  return JSON.parse(raw) as AtsAnalysis;
}
