import "dotenv/config";
import { PrismaClient, Plan, DeclStatus, DocType, OcrStatus } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL ?? "postgresql://localhost:5432/taxeasy_dev";
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding database...");

  // Demo user
  const alice = await prisma.user.upsert({
    where: { email: "alice@example.com" },
    update: {},
    create: {
      email: "alice@example.com",
      name: "Alice Dupont",
      plan: Plan.PREMIUM,
      commune: "Genève-Ville",
    },
  });

  const bob = await prisma.user.upsert({
    where: { email: "bob@example.com" },
    update: {},
    create: {
      email: "bob@example.com",
      name: "Bob Martin",
      plan: Plan.FREE,
      commune: "Carouge",
    },
  });

  // Demo declaration for Alice — salarié marié, 2 enfants
  const declaration = await prisma.declaration.upsert({
    where: { id: "demo-decl-alice-2025" },
    update: {},
    create: {
      id: "demo-decl-alice-2025",
      userId: alice.id,
      taxYear: 2025,
      status: DeclStatus.IN_PROGRESS,
      currentNodeId: "deductions_lpp",
      answers: {
        residency_type: "resident_ge",
        family_status: "married",
        spouse_work: "yes",
        spouse_deduction: 6500000, // CHF 65'000 en centimes
        children: "yes",
        children_count: 2,
        children_age_check: "no",
        children_custody: "daycare_creche",
        income_main: "employee",
      },
    },
  });

  // Demo document
  await prisma.document.upsert({
    where: { id: "demo-doc-salary-alice" },
    update: {},
    create: {
      id: "demo-doc-salary-alice",
      userId: alice.id,
      declarationId: declaration.id,
      type: DocType.SALARY_CERT,
      filename: "certificat-salaire-alice-2025.pdf",
      storagePath: "/uploads/demo/certificat-salaire-alice-2025.pdf",
      ocrStatus: OcrStatus.DONE,
      confidence: 0.97,
      extractedData: {
        grossSalary: 12500000, // CHF 125'000 en centimes
        lppContributions: 950000, // CHF 9'500
        avsContributions: 612500, // CHF 6'125
        familyAllowances: 300000, // CHF 3'000
        sourceWithholding: 0,
        employer: "ACME SA",
        canton: "GE",
        year: 2025,
      },
    },
  });

  console.log(`Seeded: alice (${alice.id}), bob (${bob.id})`);
  console.log(`Seeded: declaration (${declaration.id})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
