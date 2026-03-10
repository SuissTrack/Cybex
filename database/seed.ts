import { PrismaClient, JobSource, ContractType } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database…');

  // ── Demo user ──────────────────────────────────────────────────────────────
  const passwordHash = await bcrypt.hash('Demo1234!', 12);

  const user = await prisma.user.upsert({
    where: { email: 'demo@kairos.app' },
    update: {},
    create: {
      email: 'demo@kairos.app',
      passwordHash,
      emailVerified: true,
      profile: {
        create: {
          firstName: 'Sophie',
          lastName: 'Martin',
          location: 'Genève, Suisse',
          summary:
            'Ingénieure logiciel fullstack avec 5 ans d\'expérience en React, Node.js et PostgreSQL. Passionnée par les produits SaaS B2B.',
          skills: ['TypeScript', 'React', 'Node.js', 'PostgreSQL', 'Docker', 'AWS'],
          languages: [
            { name: 'Français', level: 'Natif' },
            { name: 'Anglais', level: 'C1' },
            { name: 'Allemand', level: 'B1' },
          ],
          experience: [
            {
              title: 'Software Engineer',
              company: 'Swissquote',
              startDate: '2021-03',
              endDate: null,
              description: 'Développement de la plateforme de trading en React/TypeScript.',
            },
            {
              title: 'Développeur Fullstack',
              company: 'Selligent',
              startDate: '2019-06',
              endDate: '2021-02',
              description: 'API REST NestJS + frontend Angular.',
            },
          ],
          education: [
            {
              degree: 'Bachelor Informatique',
              institution: 'EPFL',
              year: '2019',
            },
          ],
          preferences: {
            create: {
              desiredTitles: ['Software Engineer', 'Fullstack Developer', 'Tech Lead'],
              desiredLocations: ['Genève', 'Lausanne', 'Zurich', 'Remote'],
              remotePreference: 'HYBRID',
              contractTypes: ['CDI'],
              minSalary: 110000,
              currency: 'CHF',
              targetCountries: ['CH', 'FR'],
            },
          },
        },
      },
    },
  });

  console.log(`Created demo user: ${user.email}`);

  // ── Sample jobs ────────────────────────────────────────────────────────────
  const jobs = [
    {
      source: JobSource.JOBSCH,
      sourceUrl: 'https://www.jobs.ch/fr/offres-emploi/detail/sample-1/',
      externalId: 'sample-1',
      title: 'Senior Fullstack Developer (React/Node.js)',
      company: 'Nexthink',
      location: 'Lausanne, VD',
      isRemote: false,
      contractType: ContractType.CDI,
      salaryMin: 120000,
      salaryMax: 150000,
      currency: 'CHF',
      description:
        'Nexthink recherche un(e) Senior Fullstack Developer pour renforcer son équipe produit. Vous travaillerez sur notre plateforme SaaS de DEX (Digital Employee Experience). Stack: React, TypeScript, Node.js, PostgreSQL, Kubernetes.',
      applyUrl: 'https://www.jobs.ch/fr/offres-emploi/detail/sample-1/',
      postedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      skills: ['React', 'TypeScript', 'Node.js', 'PostgreSQL', 'Kubernetes'],
    },
    {
      source: JobSource.JOBUPCH,
      sourceUrl: 'https://www.jobup.ch/fr/emplois/detail/sample-2/',
      externalId: 'sample-2',
      title: 'Lead Software Engineer – FinTech',
      company: 'SEBA Bank',
      location: 'Zurich, ZH',
      isRemote: false,
      contractType: ContractType.CDI,
      salaryMin: 140000,
      salaryMax: 180000,
      currency: 'CHF',
      description:
        'SEBA Bank is looking for a Lead Software Engineer to drive the architecture of our digital banking platform. You\'ll mentor junior engineers and work closely with product teams. Stack: TypeScript, React, Java, microservices, AWS.',
      applyUrl: 'https://www.jobup.ch/fr/emplois/detail/sample-2/',
      postedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      skills: ['TypeScript', 'React', 'Java', 'AWS', 'Microservices'],
    },
    {
      source: JobSource.WELCOME_TO_THE_JUNGLE,
      sourceUrl: 'https://www.welcometothejungle.com/fr/companies/sample/jobs/sample-3',
      externalId: 'sample-3',
      title: 'Ingénieure Fullstack – B2B SaaS',
      company: 'Pennylane',
      location: 'Paris, France',
      isRemote: true,
      contractType: ContractType.CDI,
      salaryMin: 55000,
      salaryMax: 75000,
      currency: 'EUR',
      description:
        'Pennylane construit le futur de la gestion financière pour les PME françaises. On cherche une ingénieure fullstack pour travailler sur notre API Rails + frontend React. Télétravail complet possible.',
      applyUrl: 'https://www.welcometothejungle.com/fr/companies/sample/jobs/sample-3',
      postedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      skills: ['React', 'Ruby on Rails', 'PostgreSQL', 'TypeScript'],
    },
    {
      source: JobSource.LINKEDIN,
      sourceUrl: 'https://www.linkedin.com/jobs/view/sample-4/',
      externalId: 'sample-4',
      title: 'Software Engineer – Platform Team',
      company: 'Alan',
      location: 'Paris, France',
      isRemote: true,
      contractType: ContractType.CDI,
      salaryMin: 60000,
      salaryMax: 80000,
      currency: 'EUR',
      description:
        'Alan révolutionne l\'assurance santé en Europe. Rejoignez notre platform team pour construire les fondations de nos systèmes. Python, TypeScript, React, AWS. Full remote possible.',
      applyUrl: 'https://www.linkedin.com/jobs/view/sample-4/',
      postedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      skills: ['Python', 'TypeScript', 'React', 'AWS'],
    },
    {
      source: JobSource.INDEED,
      sourceUrl: 'https://ch.indeed.com/viewjob?jk=sample-5',
      externalId: 'sample-5',
      title: 'Tech Lead – E-commerce Platform',
      company: 'Digitec Galaxus',
      location: 'Zurich, ZH',
      isRemote: false,
      contractType: ContractType.CDI,
      salaryMin: 130000,
      salaryMax: 160000,
      currency: 'CHF',
      description:
        'Digitec Galaxus est le plus grand détaillant en ligne de Suisse. Nous recherchons un Tech Lead pour guider une équipe de 6 ingénieurs sur notre plateforme e-commerce. Stack: .NET, React, PostgreSQL, Kubernetes.',
      applyUrl: 'https://ch.indeed.com/viewjob?jk=sample-5',
      postedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
      skills: ['.NET', 'React', 'PostgreSQL', 'Kubernetes'],
    },
  ];

  for (const job of jobs) {
    await prisma.job.upsert({
      where: { sourceUrl: job.sourceUrl },
      update: {},
      create: job,
    });
  }

  console.log(`Seeded ${jobs.length} sample jobs`);
  console.log('Done!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
