/**
 * Mock API — intercepts all calls when the backend is unreachable.
 * Activated automatically in demo mode (no real backend needed).
 */

export const DEMO_EMAIL = 'demo@kairos.app';
export const DEMO_PASSWORD = 'Demo1234!';
export const MOCK_TOKEN = 'mock_access_token_kairos_demo';

// ── Mock data ─────────────────────────────────────────────────────────────────

const MOCK_USER = { id: 'user_demo', email: DEMO_EMAIL, emailVerified: true, createdAt: new Date().toISOString() };

const MOCK_PROFILE = {
  id: 'profile_demo',
  userId: 'user_demo',
  firstName: 'Sophie',
  lastName: 'Martin',
  phone: '+41 79 123 45 67',
  location: 'Genève, Suisse',
  linkedinUrl: 'https://linkedin.com/in/sophie-martin',
  portfolioUrl: '',
  summary: "Ingénieure fullstack avec 5 ans d'expérience sur des produits SaaS B2B. Passionnée par la qualité du code et l'expérience utilisateur.",
  skills: ['TypeScript', 'React', 'Node.js', 'PostgreSQL', 'Docker', 'AWS'],
  languages: [{ name: 'Français', level: 'Natif' }, { name: 'Anglais', level: 'C1' }, { name: 'Allemand', level: 'B1' }],
  experience: [
    { title: 'Software Engineer', company: 'Swissquote', startDate: '2021-03', endDate: null, description: 'Développement de la plateforme de trading en React/TypeScript.' },
    { title: 'Développeur Fullstack', company: 'Selligent', startDate: '2019-06', endDate: '2021-02', description: 'API REST NestJS + frontend Angular.' },
  ],
  education: [{ degree: 'Bachelor Informatique', institution: 'EPFL', year: '2019' }],
  cvOriginalName: 'CV_Sophie_Martin_2024.pdf',
  cvParsedAt: new Date(Date.now() - 7 * 86400000).toISOString(),
  preferences: {
    desiredTitles: ['Software Engineer', 'Fullstack Developer', 'Tech Lead'],
    desiredLocations: ['Genève', 'Lausanne', 'Zurich', 'Remote'],
    remotePreference: 'HYBRID',
    contractTypes: ['CDI'],
    minSalary: 110000,
    currency: 'CHF',
    targetCountries: ['CH', 'FR'],
  },
};

const MOCK_JOBS = [
  {
    id: 'job1', source: 'JOBSCH', title: 'Senior Fullstack Developer (React/Node.js)',
    company: 'Nexthink', location: 'Lausanne, VD', isRemote: false,
    contractType: 'CDI', salaryMin: 120000, salaryMax: 150000, currency: 'CHF',
    skills: ['React', 'TypeScript', 'Node.js', 'PostgreSQL', 'Kubernetes'],
    postedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
    scrapedAt: new Date().toISOString(), applyUrl: 'https://jobs.ch', matchScore: 0.92,
    aiSummary: 'Nexthink cherche un développeur senior pour sa plateforme DEX SaaS. Stack React + Node.js + K8s. Poste stimulant avec forte autonomie.',
    description: 'Nexthink recherche un(e) Senior Fullstack Developer pour renforcer son équipe produit. Vous travaillerez sur notre plateforme SaaS de DEX (Digital Employee Experience). Stack: React, TypeScript, Node.js, PostgreSQL, Kubernetes.',
  },
  {
    id: 'job2', source: 'JOBUPCH', title: 'Lead Software Engineer – FinTech',
    company: 'SEBA Bank', location: 'Zurich, ZH', isRemote: false,
    contractType: 'CDI', salaryMin: 140000, salaryMax: 180000, currency: 'CHF',
    skills: ['TypeScript', 'React', 'Java', 'AWS', 'Microservices'],
    postedAt: new Date(Date.now() - 86400000).toISOString(),
    scrapedAt: new Date().toISOString(), applyUrl: 'https://jobup.ch', matchScore: 0.78,
    aiSummary: 'SEBA Bank recherche un Lead Engineer pour son projet de banque digitale. Architecture microservices, TypeScript, Java et AWS.',
    description: 'SEBA Bank is looking for a Lead Software Engineer to drive the architecture of our digital banking platform.',
  },
  {
    id: 'job3', source: 'WELCOME_TO_THE_JUNGLE', title: 'Ingénieure Fullstack – B2B SaaS',
    company: 'Pennylane', location: 'Paris, France', isRemote: true,
    contractType: 'CDI', salaryMin: 55000, salaryMax: 75000, currency: 'EUR',
    skills: ['React', 'Ruby on Rails', 'PostgreSQL', 'TypeScript'],
    postedAt: new Date(Date.now() - 3 * 86400000).toISOString(),
    scrapedAt: new Date().toISOString(), applyUrl: 'https://welcometothejungle.com', matchScore: 0.65,
    aiSummary: 'Pennylane construit le futur de la compta pour PME françaises. Full remote, stack React + Rails.',
    description: 'Pennylane construit le futur de la gestion financière pour les PME françaises. On cherche une ingénieure fullstack pour travailler sur notre API Rails + frontend React.',
  },
  {
    id: 'job4', source: 'LINKEDIN', title: 'Software Engineer – Platform Team',
    company: 'Alan', location: 'Paris, France', isRemote: true,
    contractType: 'CDI', salaryMin: 60000, salaryMax: 80000, currency: 'EUR',
    skills: ['Python', 'TypeScript', 'React', 'AWS'],
    postedAt: new Date(Date.now() - 5 * 86400000).toISOString(),
    scrapedAt: new Date().toISOString(), applyUrl: 'https://linkedin.com', matchScore: 0.58,
    aiSummary: "Alan révolutionne l'assurance santé. Platform team Python/TypeScript, full remote possible.",
    description: "Alan révolutionne l'assurance santé en Europe. Rejoignez notre platform team pour construire les fondations de nos systèmes.",
  },
  {
    id: 'job5', source: 'INDEED', title: 'Tech Lead – E-commerce Platform',
    company: 'Digitec Galaxus', location: 'Zurich, ZH', isRemote: false,
    contractType: 'CDI', salaryMin: 130000, salaryMax: 160000, currency: 'CHF',
    skills: ['.NET', 'React', 'PostgreSQL', 'Kubernetes'],
    postedAt: new Date(Date.now() - 4 * 86400000).toISOString(),
    scrapedAt: new Date().toISOString(), applyUrl: 'https://indeed.ch', matchScore: 0.71,
    aiSummary: "Digitec Galaxus, le plus grand e-commerce suisse, cherche un Tech Lead pour une équipe de 6 ingénieurs.",
    description: 'Digitec Galaxus est le plus grand détaillant en ligne de Suisse. Nous recherchons un Tech Lead pour guider une équipe de 6 ingénieurs.',
  },
  {
    id: 'job6', source: 'JOBSCH', title: 'Backend Engineer – Golang',
    company: 'Beekeeper', location: 'Zurich, ZH', isRemote: true,
    contractType: 'CDI', salaryMin: 115000, salaryMax: 140000, currency: 'CHF',
    skills: ['Go', 'PostgreSQL', 'Kubernetes', 'AWS', 'gRPC'],
    postedAt: new Date(Date.now() - 6 * 86400000).toISOString(),
    scrapedAt: new Date().toISOString(), applyUrl: 'https://jobs.ch', matchScore: 0.48,
    aiSummary: "Beekeeper cherche un backend Golang pour sa plateforme de communication terrain. Remote friendly.",
    description: "Beekeeper's mobile-first platform connects the frontline workforce. We're looking for a Backend Engineer proficient in Go.",
  },
];

// ── Mock ATS data ─────────────────────────────────────────────────────────────

const MOCK_ATS_NEXTHINK = {
  score: 87,
  strengths: [
    'Stack React/TypeScript parfaitement alignée avec les exigences du poste',
    'Expérience Kubernetes et CI/CD directement transférable à l\'environnement Nexthink',
    'Profil SaaS B2B correspondant exactement au contexte de la plateforme DEX',
  ],
  gaps: [
    'Pas de mention de Go ou de microservices dans le CV',
    'Expérience en observabilité / monitoring (Prometheus, Grafana) non précisée',
    'Références à des équipes > 10 personnes absentes',
  ],
  suggestions: [
    'Mettre en avant la gestion de production à grande échelle chez Swissquote (volumétrie, SLA)',
    'Ajouter une ligne sur les outils de monitoring utilisés (DataDog, Grafana, etc.)',
    'Mentionner toute contribution open-source ou side project Kubernetes',
  ],
  verdict: 'Profil très solide — envoyez cette candidature, vous avez d\'excellentes chances de décrocher un entretien.',
};

const MOCK_ATS_SEBA = {
  score: 72,
  strengths: [
    'Maîtrise TypeScript/React confirmée',
    'Expérience AWS en production (certification ou projets)',
    'Background FinTech via Swissquote, secteur identique à SEBA Bank',
  ],
  gaps: [
    'Java non mentionné dans le CV — technologie clé du poste',
    'Architecture microservices peu développée',
    'Leadership d\'équipe peu illustré (poste Lead)',
  ],
  suggestions: [
    'Préciser tout projet Java ou compatibilité JVM (Kotlin, Scala)',
    'Décrire un exemple d\'architecture distribuée que vous avez conçue',
    'Mentionner le nombre de développeurs guidés/encadrés chez Swissquote',
  ],
  verdict: 'Candidature pertinente mais manque quelques mots-clés critiques — personnalisez la lettre de motivation.',
};

const MOCK_COVER_LETTER_NEXTHINK = `Passionnée par les produits SaaS à fort impact, le poste de Senior Fullstack Developer chez Nexthink m'a immédiatement interpellée. Votre plateforme DEX – conçue pour mesurer et améliorer l'expérience numérique des collaborateurs à grande échelle – est exactement le type de défi que je cherche : code exigeant, enjeux de performance réels, utilisateurs en prod comptés en milliers.

Chez Swissquote, j'ai co-conçu et maintenu des interfaces React/TypeScript affichant des données de marché en temps réel pour 500 000 clients, avec des SLA stricts. J'ai également piloté la migration CI/CD vers Kubernetes et réduit le lead time de déploiement de 40 %. Ces expériences me permettraient de contribuer immédiatement à vos cycles de livraison, sans courbe d'apprentissage sur votre stack.

Je serais ravie d'approfondir comment mon profil peut renforcer votre équipe produit. Dans l'attente de votre retour, je vous adresse mes cordiales salutations.`;

const MOCK_COVER_LETTER_SEBA = `L'opportunité de Lead Software Engineer chez SEBA Bank rejoint deux de mes passions : la fintech et l'architecture logicielle robuste. Après quatre ans à construire des systèmes financiers critiques chez Swissquote, je comprends les enjeux de fiabilité, de conformité et de scalabilité propres au secteur bancaire.

Mon expérience inclut la conception d'APIs REST à fort trafic, l'intégration de flux de données temps réel (WebSocket, Kafka) et la coordination technique d'une équipe de 5 développeurs sur un projet de refonte majeure. Je maîtrise l'écosystème AWS (EC2, RDS, Lambda, S3) et j'ai animé des sessions d'architecture pour homogénéiser les pratiques de l'équipe.

Je serais enthousiaste à l'idée de discuter de la vision technique de SEBA Bank et de la manière dont mon parcours peut y contribuer. Cordiales salutations.`;

const MOCK_APPLICATIONS = [
  {
    id: 'app_draft1', userId: 'user_demo', jobId: 'job2', status: 'DRAFT',
    matchScore: 0.72, appliedAt: null,
    coverLetter: MOCK_COVER_LETTER_SEBA,
    customAnswers: { ats: MOCK_ATS_SEBA },
    createdAt: new Date(Date.now() - 20 * 60000).toISOString(),
    job: { id: 'job2', title: 'Lead Software Engineer – FinTech', company: 'SEBA Bank', location: 'Zurich, ZH', source: 'JOBUPCH', applyUrl: 'https://jobup.ch' },
  },
  {
    id: 'app1', userId: 'user_demo', jobId: 'job1', status: 'APPLIED',
    matchScore: 0.92, appliedAt: new Date(Date.now() - 86400000).toISOString(),
    coverLetter: MOCK_COVER_LETTER_NEXTHINK,
    customAnswers: { ats: MOCK_ATS_NEXTHINK },
    createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
    job: { id: 'job1', title: 'Senior Fullstack Developer (React/Node.js)', company: 'Nexthink', location: 'Lausanne, VD', source: 'JOBSCH', applyUrl: 'https://jobs.ch' },
  },
  {
    id: 'app2', userId: 'user_demo', jobId: 'job3', status: 'INTERVIEW_SCHEDULED',
    matchScore: 0.65, appliedAt: new Date(Date.now() - 5 * 86400000).toISOString(),
    interviewDate: new Date(Date.now() + 3 * 86400000).toISOString(),
    coverLetter: "Fullstack developer passionnée par les produits SaaS B2B, je serais ravie de rejoindre Pennylane dans sa mission de simplifier la gestion financière des PME françaises. Mon expérience en React et Node.js est directement applicable à votre stack.\n\nChez Swissquote, j'ai livré des fonctionnalités complexes de A à Z, en coordination avec des équipes produit et design. Cette capacité à travailler en mode produit, avec une forte orientation résultat, me permettrait de m'intégrer rapidement dans votre culture.\n\nJ'aimerais beaucoup en discuter avec vous. Cordiales salutations.",
    customAnswers: null,
    createdAt: new Date(Date.now() - 6 * 86400000).toISOString(),
    job: { id: 'job3', title: 'Ingénieure Fullstack – B2B SaaS', company: 'Pennylane', location: 'Paris, France', source: 'WELCOME_TO_THE_JUNGLE', applyUrl: 'https://welcometothejungle.com' },
  },
  {
    id: 'app3', userId: 'user_demo', jobId: 'job5', status: 'APPLIED',
    matchScore: 0.71, appliedAt: new Date(Date.now() - 3 * 86400000).toISOString(),
    coverLetter: null, customAnswers: null,
    createdAt: new Date(Date.now() - 4 * 86400000).toISOString(),
    job: { id: 'job5', title: 'Tech Lead – E-commerce Platform', company: 'Digitec Galaxus', location: 'Zurich, ZH', source: 'INDEED', applyUrl: 'https://indeed.ch' },
  },
  {
    id: 'app5', userId: 'user_demo', jobId: 'job4', status: 'REJECTED',
    matchScore: 0.58, appliedAt: new Date(Date.now() - 10 * 86400000).toISOString(),
    coverLetter: null, customAnswers: null, failureReason: null,
    createdAt: new Date(Date.now() - 11 * 86400000).toISOString(),
    job: { id: 'job4', title: 'Software Engineer – Platform Team', company: 'Alan', location: 'Paris, France', source: 'LINKEDIN', applyUrl: 'https://linkedin.com' },
  },
];

// ── Router ────────────────────────────────────────────────────────────────────

type MockResponse = { data: unknown; status: number };

function ok(data: unknown): MockResponse { return { data, status: 200 }; }
function created(data: unknown): MockResponse { return { data, status: 201 }; }
function err(msg: string, status = 400): never {
  const e = Object.assign(new Error(msg), { response: { data: { error: msg }, status } });
  throw e;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let mockApplications: any[] = [...MOCK_APPLICATIONS];

export function handleMockRequest(method: string, url: string, body?: unknown): MockResponse {
  const m = method.toUpperCase();

  // ── Auth ──────────────────────────────────────────────────────────────────
  if (m === 'POST' && url === '/auth/login') {
    const { email, password } = body as { email: string; password: string };
    if (!email || !password) err('Email et mot de passe requis');
    return ok({ accessToken: MOCK_TOKEN, refreshToken: 'mock_refresh_token', userId: 'user_demo' });
  }
  if (m === 'POST' && url === '/auth/register') {
    const { email } = body as { email: string };
    return created({ accessToken: MOCK_TOKEN, refreshToken: 'mock_refresh_token', userId: 'user_demo', email });
  }
  if (m === 'POST' && url === '/auth/logout') return ok({ success: true });
  if (m === 'POST' && url === '/auth/refresh') return ok({ accessToken: MOCK_TOKEN, refreshToken: 'mock_refresh_token', userId: 'user_demo' });
  if (m === 'POST' && url === '/auth/forgot-password') return ok({ message: 'Email envoyé.' });
  if (m === 'GET' && url === '/auth/me') return ok(MOCK_USER);

  // ── Profile ──────────────────────────────────────────────────────────────
  if (m === 'GET' && url === '/profile') return ok(MOCK_PROFILE);
  if (m === 'PUT' && url === '/profile') return ok({ ...MOCK_PROFILE, ...(body as object) });
  if (m === 'PUT' && url === '/profile/preferences') return ok({ ...MOCK_PROFILE.preferences, ...(body as object) });
  if (m === 'POST' && url === '/profile/cv') return ok({ success: true, cvPath: '/uploads/cv_demo.pdf', cvParsedAt: new Date().toISOString() });

  // ── Jobs ─────────────────────────────────────────────────────────────────
  if (m === 'GET' && url.startsWith('/jobs')) {
    const jobId = url.match(/\/jobs\/([^?]+)/)?.[1];
    if (jobId) {
      const job = MOCK_JOBS.find((j) => j.id === jobId);
      if (!job) err('Job not found', 404);
      return ok(job);
    }
    const urlObj = new URL(url, 'http://x');
    const q = urlObj.searchParams.get('q')?.toLowerCase();
    const source = urlObj.searchParams.get('source');
    const remote = urlObj.searchParams.get('remote');
    let jobs = [...MOCK_JOBS];
    if (q) jobs = jobs.filter((j) => j.title.toLowerCase().includes(q) || j.company.toLowerCase().includes(q));
    if (source) jobs = jobs.filter((j) => j.source === source);
    if (remote === 'true') jobs = jobs.filter((j) => j.isRemote);
    return ok({ jobs, pagination: { page: 1, limit: 20, total: jobs.length, pages: 1 } });
  }

  // ── Applications ─────────────────────────────────────────────────────────

  // POST /applications/bulk — create multiple DRAFTs at once (no cover letters)
  if (m === 'POST' && url === '/applications/bulk') {
    const { jobIds, smartMatchData } = (body ?? {}) as {
      jobIds?: string[];
      smartMatchData?: Record<string, { score: number; reason: string }>;
    };
    if (!jobIds?.length) err('jobIds requis');

    const existingJobIds = new Set((mockApplications as Array<{ jobId: string }>).map((a) => a.jobId));
    const newJobIds = jobIds!.filter((id) => !existingJobIds.has(id));

    const newApps = newJobIds.map((jobId) => {
      const job = MOCK_JOBS.find((j) => j.id === jobId);
      const sm = smartMatchData?.[jobId];
      return {
        id: `app_bulk_${jobId}_${Date.now()}`,
        userId: 'user_demo',
        jobId,
        status: 'DRAFT',
        matchScore: sm ? sm.score / 100 : (job?.matchScore ?? 0),
        appliedAt: null,
        coverLetter: null,
        customAnswers: sm ? { smartMatch: sm } : null,
        createdAt: new Date().toISOString(),
        job: job
          ? { id: job.id, title: job.title, company: job.company, location: job.location, source: job.source, applyUrl: job.applyUrl }
          : null,
      };
    });

    mockApplications = [...newApps, ...mockApplications];
    return created({ created: newApps.length, skipped: jobIds!.length - newApps.length, applications: newApps });
  }

  // POST /applications/:id/generate-letter — generate mock cover letter on demand
  if (m === 'POST' && /\/applications\/[^/]+\/generate-letter$/.test(url)) {
    const id = url.split('/')[2];
    const app = (mockApplications as Array<{ id: string; job?: { title?: string; company?: string } }>).find((a) => a.id === id);
    if (!app) err('Not found', 404);

    const letter = `Votre offre pour le poste de ${app!.job?.title ?? 'ce poste'} chez ${app!.job?.company ?? 'votre entreprise'} correspond parfaitement à mes compétences et à mes ambitions. Développeuse fullstack avec 5 ans d'expérience sur des produits SaaS B2B, je maîtrise les technologies que vous recherchez et je suis habituée à livrer dans des environnements exigeants.

Mon parcours chez Swissquote m'a permis de développer une solide culture produit, une approche rigoureuse de la qualité du code et une capacité à collaborer efficacement avec des équipes pluridisciplinaires. Ces compétences seraient immédiatement mobilisables au sein de votre organisation.

Je serais ravie d'échanger sur la manière dont mon profil peut renforcer votre équipe. Dans l'attente de votre retour, je vous adresse mes cordiales salutations.`;

    mockApplications = mockApplications.map((a) => a.id === id ? { ...a, coverLetter: letter } : a);
    return ok(mockApplications.find((a) => a.id === id));
  }

  // POST /applications/:id/submit — mark DRAFT → APPLIED
  if (m === 'POST' && /\/applications\/[^/]+\/submit$/.test(url)) {
    const id = url.split('/')[2];
    mockApplications = mockApplications.map((a) =>
      a.id === id ? { ...a, status: 'APPLIED', appliedAt: new Date().toISOString() } : a,
    );
    const app = mockApplications.find((a) => a.id === id);
    if (!app) err('Not found', 404);
    return ok(app);
  }

  // POST /applications/:id/queue — legacy
  if (m === 'POST' && /\/applications\/[^/]+\/queue$/.test(url)) {
    const id = url.split('/')[2];
    mockApplications = mockApplications.map((a) => a.id === id ? { ...a, status: 'QUEUED' } : a);
    return ok(mockApplications.find((a) => a.id === id));
  }

  // PATCH /applications/:id/cover-letter — update letter
  if (m === 'PATCH' && /\/applications\/[^/]+\/cover-letter$/.test(url)) {
    const id = url.split('/')[2];
    const { coverLetter } = body as { coverLetter: string };
    mockApplications = mockApplications.map((a) => a.id === id ? { ...a, coverLetter } : a);
    return ok(mockApplications.find((a) => a.id === id));
  }

  if (m === 'GET' && url.startsWith('/applications')) {
    const appId = url.match(/\/applications\/([^?/]+)(?:\?|$)/)?.[1];
    if (appId) {
      const app = mockApplications.find((a) => a.id === appId);
      if (!app) err('Not found', 404);
      return ok({ ...app, automationLogs: [] });
    }
    const urlObj = new URL(url, 'http://x');
    const status = urlObj.searchParams.get('status');
    let apps = [...mockApplications];
    if (status) apps = apps.filter((a) => a.status === status);
    const stats = mockApplications.reduce((acc, a) => { acc[a.status] = (acc[a.status] || 0) + 1; return acc; }, {} as Record<string, number>);
    return ok({ applications: apps, stats, pagination: { page: 1, limit: 20, total: apps.length, pages: 1 } });
  }

  if (m === 'POST' && url === '/applications') {
    const { jobId } = body as { jobId: string };
    const job = MOCK_JOBS.find((j) => j.id === jobId);
    if (!job) err('Job not found', 404);
    // Simulate ~1s "AI generation" delay is handled on frontend; we return a DRAFT with mock ATS
    const mockAts = {
      score: Math.round(job!.matchScore * 100),
      strengths: [
        'Compétences techniques alignées avec les exigences du poste',
        'Expérience SaaS B2B pertinente pour ce contexte',
        'Profil international adapté au marché suisse/français',
      ],
      gaps: [
        'Certaines technologies secondaires du poste non mentionnées dans le CV',
        'Expérience en leadership d\'équipe à préciser',
        'Portfolio de projets similaires à documenter',
      ],
      suggestions: [
        'Personnalisez l\'introduction avec un fait précis sur l\'entreprise',
        'Ajoutez des métriques concrètes à vos expériences (% d\'amélioration, volumes)',
        'Mentionnez explicitement les technologies listées dans l\'offre',
      ],
      verdict: `Bon match (${Math.round(job!.matchScore * 100)}/100) — candidature recommandée avec la lettre de motivation générée.`,
    };
    const mockLetter = `Votre offre pour le poste de ${job!.title} chez ${job!.company} correspond précisément à mon profil et à mes ambitions professionnelles. Développeuse fullstack avec 5 ans d'expérience sur des produits SaaS, je maîtrise les technologies que vous recherchez et j'ai évolué dans des environnements similaires au vôtre.

Chez Swissquote, j'ai développé et maintenu des interfaces React/TypeScript en production à grande échelle, collaboré avec des équipes produit pluridisciplinaires et contribué à l'amélioration continue de nos processus de livraison. Cette expérience me permettrait de m'intégrer rapidement et de contribuer dès le premier jour.

Je serais ravie de discuter de la façon dont mon parcours peut enrichir votre équipe. Dans l'attente de vous lire, je vous adresse mes cordiales salutations.`;

    const newApp = {
      id: `app_${Date.now()}`, userId: 'user_demo', jobId, status: 'DRAFT',
      matchScore: job!.matchScore, appliedAt: null,
      coverLetter: mockLetter,
      customAnswers: { ats: mockAts },
      createdAt: new Date().toISOString(),
      job: { id: job!.id, title: job!.title, company: job!.company, location: job!.location, source: job!.source, applyUrl: job!.applyUrl },
    };
    mockApplications = [newApp, ...mockApplications];
    return created(newApp);
  }

  if (m === 'PATCH' && url.startsWith('/applications/')) {
    const id = url.split('/')[2];
    mockApplications = mockApplications.map((a) => a.id === id ? { ...a, ...(body as object) } : a);
    return ok(mockApplications.find((a) => a.id === id));
  }
  if (m === 'DELETE' && url.startsWith('/applications/')) {
    const id = url.split('/')[2];
    mockApplications = mockApplications.filter((a) => a.id !== id);
    return ok({ success: true });
  }

  // ── Smart Match ───────────────────────────────────────────────────────────
  if (m === 'POST' && url === '/jobs/smart-match') {
    const { jobIds } = (body ?? {}) as { jobIds?: string[] };
    const jobsToScore = jobIds?.length ? MOCK_JOBS.filter((j) => jobIds.includes(j.id)) : MOCK_JOBS;

    // Realistic match reasons for Sophie Martin's profile
    const MOCK_REASONS: Record<string, string> = {
      job1: 'Stack React/TypeScript identique — très fort match technique',
      job2: 'FinTech + TypeScript alignés, Java à compléter',
      job3: 'Full remote + React, Ruby on Rails absent du profil',
      job4: 'TypeScript OK, Python peu présent dans votre stack',
      job5: 'Lead tech bien aligné, .NET manquant dans le CV',
      job6: 'Go non maîtrisé — écart technique important',
    };

    const matches = jobsToScore
      .map((j) => ({
        jobId: j.id,
        score: Math.round(j.matchScore * 100),
        reason: MOCK_REASONS[j.id] ?? `${Math.round(j.matchScore * 100)}% de compatibilité estimée`,
      }))
      .sort((a, b) => b.score - a.score);

    return ok({ matches });
  }

  // ── Automation ────────────────────────────────────────────────────────────
  if (m === 'POST' && url === '/automation/scrape') return ok({ message: 'Scrape simulé (mode démo)', jobId: 'mock_job' });
  if (m === 'GET' && url.startsWith('/automation/logs')) return ok([]);

  // ── Health ────────────────────────────────────────────────────────────────
  if (m === 'GET' && url === '/health') return ok({ status: 'ok', db: 'mock' });

  err(`Route non gérée en mode démo: ${m} ${url}`, 404);
}
