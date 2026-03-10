import Anthropic from '@anthropic-ai/sdk';

export const claude = new Anthropic({
  apiKey: process.env.CLAUDE_API_KEY,
});

/**
 * Generate a tailored cover letter using Claude.
 */
export async function generateCoverLetter(params: {
  jobTitle: string;
  company: string;
  jobDescription: string;
  candidateName: string;
  cvText: string;
  language?: 'fr' | 'en';
}): Promise<string> {
  const { jobTitle, company, jobDescription, candidateName, cvText, language = 'fr' } = params;

  const systemPrompt =
    language === 'fr'
      ? `Tu es un expert en rédaction de lettres de motivation professionnelles pour le marché suisse et français.
Tu rédiges des lettres concises (max 300 mots), percutantes, adaptées au poste, sans fioriture.
Utilise un ton professionnel mais humain. Format: 3 paragraphes (accroche + valeur ajoutée + conclusion).`
      : `You are an expert at writing professional cover letters for the Swiss and French job markets.
Write concise (max 300 words), impactful letters tailored to the role.
Professional but human tone. Format: 3 paragraphs (hook + value add + closing).`;

  const userPrompt =
    language === 'fr'
      ? `Rédige une lettre de motivation pour ce poste :

**Poste**: ${jobTitle}
**Entreprise**: ${company}
**Description**: ${jobDescription.slice(0, 2000)}

**Profil du candidat (extrait CV)**:
${cvText.slice(0, 3000)}

**Nom**: ${candidateName}

Génère uniquement le corps de la lettre, sans en-tête ni formules de politesse finales.`
      : `Write a cover letter for this position:

**Role**: ${jobTitle}
**Company**: ${company}
**Description**: ${jobDescription.slice(0, 2000)}

**Candidate profile (CV extract)**:
${cvText.slice(0, 3000)}

**Name**: ${candidateName}

Return only the letter body, no headers or closing formulas.`;

  const message = await claude.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 1024,
    messages: [{ role: 'user', content: userPrompt }],
    system: systemPrompt,
  });

  const block = message.content[0];
  if (block.type !== 'text') throw new Error('Unexpected Claude response type');
  return block.text.trim();
}

/**
 * Generate answers to job application form questions.
 */
export async function generateFormAnswer(params: {
  question: string;
  jobTitle: string;
  company: string;
  cvText: string;
  language?: 'fr' | 'en';
}): Promise<string> {
  const { question, jobTitle, company, cvText, language = 'fr' } = params;

  const message = await claude.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 512,
    messages: [
      {
        role: 'user',
        content:
          language === 'fr'
            ? `Tu postules pour le poste de ${jobTitle} chez ${company}.
Réponds à cette question de formulaire de manière concise et professionnelle (max 150 mots) :
"${question}"

Profil (extrait CV): ${cvText.slice(0, 1500)}`
            : `You are applying for ${jobTitle} at ${company}.
Answer this form question concisely and professionally (max 150 words):
"${question}"

Profile (CV extract): ${cvText.slice(0, 1500)}`,
      },
    ],
  });

  const block = message.content[0];
  if (block.type !== 'text') throw new Error('Unexpected Claude response type');
  return block.text.trim();
}

/**
 * Summarize a job posting for display.
 */
export async function summarizeJob(description: string): Promise<string> {
  const message = await claude.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 256,
    messages: [
      {
        role: 'user',
        content: `Résume en 2-3 phrases clés (max 80 mots) cette offre d'emploi pour affichage dans une liste :

${description.slice(0, 3000)}`,
      },
    ],
  });

  const block = message.content[0];
  if (block.type !== 'text') return '';
  return block.text.trim();
}
