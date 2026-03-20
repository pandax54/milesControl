import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import 'dotenv/config';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const PROGRAMS = [
  {
    name: 'Smiles',
    type: 'AIRLINE' as const,
    currency: 'miles',
    website: 'https://www.smiles.com.br',
    transferPartners: [
      { name: 'Livelo', defaultRatio: '1:1' },
      { name: 'Esfera', defaultRatio: '1:1' },
      { name: 'iupp', defaultRatio: '1:1' },
    ],
  },
  {
    name: 'Latam Pass',
    type: 'AIRLINE' as const,
    currency: 'miles',
    website: 'https://latampass.latam.com',
    transferPartners: [
      { name: 'Livelo', defaultRatio: '1:1' },
      { name: 'Esfera', defaultRatio: '1:1' },
      { name: 'iupp', defaultRatio: '1:1' },
    ],
  },
  {
    name: 'Azul Fidelidade',
    type: 'AIRLINE' as const,
    currency: 'points',
    website: 'https://www.voeazul.com.br/tudoazul',
    transferPartners: [
      { name: 'Livelo', defaultRatio: '1:1' },
      { name: 'Esfera', defaultRatio: '1:1' },
      { name: 'iupp', defaultRatio: '1:1' },
    ],
  },
  {
    name: 'Livelo',
    type: 'BANKING' as const,
    currency: 'points',
    website: 'https://www.livelo.com.br',
    transferPartners: [
      { name: 'Smiles', defaultRatio: '1:1' },
      { name: 'Latam Pass', defaultRatio: '1:1' },
      { name: 'Azul Fidelidade', defaultRatio: '1:1' },
    ],
  },
  {
    name: 'Esfera',
    type: 'BANKING' as const,
    currency: 'points',
    website: 'https://www.esfera.com.vc',
    transferPartners: [
      { name: 'Smiles', defaultRatio: '1:1' },
      { name: 'Latam Pass', defaultRatio: '1:1' },
      { name: 'Azul Fidelidade', defaultRatio: '1:1' },
      { name: 'ConnectMiles', defaultRatio: '3:1' },
    ],
  },
  {
    name: 'iupp',
    type: 'BANKING' as const,
    currency: 'points',
    website: 'https://www.iupp.com.br',
    transferPartners: undefined,
  },
  {
    name: 'Átomos',
    type: 'BANKING' as const,
    currency: 'points',
    website: 'https://www.c6bank.com.br',
    transferPartners: undefined,
  },
];

interface ClubTierSeed {
  program: string;
  tiers: Array<{
    name: string;
    monthlyPrice: number;
    baseMonthlyMiles: number;
    minimumStayMonths: number;
  }>;
}

const CLUB_TIERS: ClubTierSeed[] = [
  {
    program: 'Smiles',
    tiers: [
      { name: 'Clube Smiles 1.000', monthlyPrice: 42.0, baseMonthlyMiles: 1000, minimumStayMonths: 6 },
      { name: 'Clube Smiles 2.000', monthlyPrice: 73.8, baseMonthlyMiles: 2000, minimumStayMonths: 6 },
      { name: 'Clube Smiles 5.000', monthlyPrice: 162.0, baseMonthlyMiles: 5000, minimumStayMonths: 6 },
      { name: 'Clube Smiles 7.000', monthlyPrice: 219.0, baseMonthlyMiles: 7000, minimumStayMonths: 6 },
      { name: 'Clube Smiles 10.000', monthlyPrice: 299.0, baseMonthlyMiles: 10000, minimumStayMonths: 6 },
      { name: 'Clube Smiles 20.000', monthlyPrice: 819.0, baseMonthlyMiles: 20000, minimumStayMonths: 10 },
    ],
  },
  {
    program: 'Livelo',
    tiers: [
      { name: 'Clube Livelo 200', monthlyPrice: 15.9, baseMonthlyMiles: 200, minimumStayMonths: 0 },
      { name: 'Clube Livelo 500', monthlyPrice: 29.9, baseMonthlyMiles: 500, minimumStayMonths: 0 },
      { name: 'Clube Livelo 1.000', monthlyPrice: 49.9, baseMonthlyMiles: 1000, minimumStayMonths: 0 },
      { name: 'Clube Livelo 3.000', monthlyPrice: 139.9, baseMonthlyMiles: 3000, minimumStayMonths: 0 },
      { name: 'Clube Livelo 5.000', monthlyPrice: 219.9, baseMonthlyMiles: 5000, minimumStayMonths: 0 },
      { name: 'Clube Livelo 10.000', monthlyPrice: 399.9, baseMonthlyMiles: 10000, minimumStayMonths: 0 },
    ],
  },
  {
    program: 'Azul Fidelidade',
    tiers: [
      { name: 'Clube TudoAzul 500', monthlyPrice: 29.9, baseMonthlyMiles: 500, minimumStayMonths: 3 },
      { name: 'Clube TudoAzul 1.000', monthlyPrice: 49.9, baseMonthlyMiles: 1000, minimumStayMonths: 3 },
      { name: 'Clube TudoAzul 3.000', monthlyPrice: 129.9, baseMonthlyMiles: 3000, minimumStayMonths: 3 },
      { name: 'Clube TudoAzul 5.000', monthlyPrice: 199.9, baseMonthlyMiles: 5000, minimumStayMonths: 3 },
      { name: 'Clube TudoAzul 10.000', monthlyPrice: 379.9, baseMonthlyMiles: 10000, minimumStayMonths: 3 },
    ],
  },
  {
    program: 'Esfera',
    tiers: [
      { name: 'Clube Esfera 500', monthlyPrice: 24.9, baseMonthlyMiles: 500, minimumStayMonths: 0 },
      { name: 'Clube Esfera 1.000', monthlyPrice: 44.9, baseMonthlyMiles: 1000, minimumStayMonths: 0 },
      { name: 'Clube Esfera 3.000', monthlyPrice: 119.9, baseMonthlyMiles: 3000, minimumStayMonths: 0 },
      { name: 'Clube Esfera 5.000', monthlyPrice: 189.9, baseMonthlyMiles: 5000, minimumStayMonths: 0 },
    ],
  },
  {
    program: 'Latam Pass',
    tiers: [
      { name: 'Clube Latam Pass 500', monthlyPrice: 34.9, baseMonthlyMiles: 500, minimumStayMonths: 3 },
      { name: 'Clube Latam Pass 1.000', monthlyPrice: 54.9, baseMonthlyMiles: 1000, minimumStayMonths: 3 },
      { name: 'Clube Latam Pass 2.500', monthlyPrice: 119.9, baseMonthlyMiles: 2500, minimumStayMonths: 3 },
      { name: 'Clube Latam Pass 5.000', monthlyPrice: 219.9, baseMonthlyMiles: 5000, minimumStayMonths: 3 },
    ],
  },
];

const CALENDAR_EVENTS = [
  { title: 'Aniversário Caixa', startDate: '2026-01-10', endDate: '2026-01-20', programs: ['Livelo'], expectedType: 'TRANSFER_BONUS' as const, historicalNote: 'Caixa card holders get exclusive bonuses via Livelo', isRecurring: true, recurrenceRule: 'YEARLY' },
  { title: 'Semana do Consumidor', startDate: '2026-03-09', endDate: '2026-03-15', programs: ['Smiles', 'Azul Fidelidade', 'Livelo', 'Esfera'], expectedType: 'TRANSFER_BONUS' as const, historicalNote: '2026: Azul+Livelo up to 133% bonus, Smiles bonus adesão', isRecurring: true, recurrenceRule: 'YEARLY' },
  { title: 'Aniversário Smiles', startDate: '2026-05-01', endDate: '2026-05-31', programs: ['Smiles'], expectedType: 'TRANSFER_BONUS' as const, historicalNote: '2025: up to 90% bonus transfers', isRecurring: true, recurrenceRule: 'YEARLY' },
  { title: 'Dia dos Namorados', startDate: '2026-06-08', endDate: '2026-06-12', programs: ['Livelo', 'Esfera'], expectedType: 'POINT_PURCHASE' as const, historicalNote: 'Shopping bonuses and discount campaigns', isRecurring: true, recurrenceRule: 'YEARLY' },
  { title: 'Aniversário LATAM', startDate: '2026-06-15', endDate: '2026-06-30', programs: ['Latam Pass'], expectedType: 'MIXED' as const, historicalNote: 'Award ticket discounts and transfer bonuses', isRecurring: true, recurrenceRule: 'YEARLY' },
  { title: 'Aniversário Melhores Destinos', startDate: '2026-07-14', endDate: '2026-07-20', programs: ['Smiles', 'Latam Pass', 'Azul Fidelidade', 'Livelo', 'Esfera'], expectedType: 'MIXED' as const, historicalNote: 'Week-long promotions across multiple programs', isRecurring: true, recurrenceRule: 'YEARLY' },
  { title: 'Aniversário Clube Livelo', startDate: '2026-09-01', endDate: '2026-09-30', programs: ['Livelo'], expectedType: 'TRANSFER_BONUS' as const, historicalNote: '2025: 40-50% bonus to partner airlines. BIGGEST month for bonuses.', isRecurring: true, recurrenceRule: 'YEARLY' },
  { title: 'Esfera → Iberia Club Promo', startDate: '2026-09-01', endDate: '2026-09-30', programs: ['Esfera'], expectedType: 'TRANSFER_BONUS' as const, historicalNote: 'Considered one of the best annual opportunities for Europe redemptions', isRecurring: true, recurrenceRule: 'YEARLY' },
  { title: 'Black Friday', startDate: '2026-11-23', endDate: '2026-11-30', programs: ['Smiles', 'Latam Pass', 'Azul Fidelidade', 'Livelo', 'Esfera'], expectedType: 'MIXED' as const, historicalNote: '2025: Azul 130% bonus, Smiles 100% bonus, Livelo point discounts. BEST DEALS OF THE YEAR.', isRecurring: true, recurrenceRule: 'YEARLY' },
  { title: 'Cyber Monday', startDate: '2026-11-30', endDate: '2026-12-01', programs: ['Livelo', 'Esfera'], expectedType: 'POINT_PURCHASE' as const, historicalNote: 'Extended Black Friday deals, new promos may appear', isRecurring: true, recurrenceRule: 'YEARLY' },
  { title: 'Aniversário Azul', startDate: '2026-12-01', endDate: '2026-12-15', programs: ['Azul Fidelidade'], expectedType: 'MIXED' as const, historicalNote: 'Note: Azul in judicial recovery, promos may be limited in 2026', isRecurring: true, recurrenceRule: 'YEARLY' },
];

async function seedPrograms() {
  console.log('Seeding programs...');
  for (const program of PROGRAMS) {
    await prisma.program.upsert({
      where: { name: program.name },
      update: {
        type: program.type,
        currency: program.currency,
        website: program.website,
        transferPartners: program.transferPartners,
      },
      create: {
        name: program.name,
        type: program.type,
        currency: program.currency,
        website: program.website,
        transferPartners: program.transferPartners,
      },
    });
  }
  console.log(`  Seeded ${PROGRAMS.length} programs`);
}

async function seedClubTiers() {
  console.log('Seeding club tiers...');
  let totalTiers = 0;

  for (const clubData of CLUB_TIERS) {
    const program = await prisma.program.findUnique({
      where: { name: clubData.program },
    });

    if (!program) {
      console.warn(`  Program ${clubData.program} not found, skipping tiers`);
      continue;
    }

    for (const tier of clubData.tiers) {
      await prisma.clubTier.upsert({
        where: {
          programId_name: {
            programId: program.id,
            name: tier.name,
          },
        },
        update: {
          monthlyPrice: tier.monthlyPrice,
          baseMonthlyMiles: tier.baseMonthlyMiles,
          minimumStayMonths: tier.minimumStayMonths,
        },
        create: {
          programId: program.id,
          name: tier.name,
          monthlyPrice: tier.monthlyPrice,
          baseMonthlyMiles: tier.baseMonthlyMiles,
          minimumStayMonths: tier.minimumStayMonths,
        },
      });
      totalTiers++;
    }
  }

  console.log(`  Seeded ${totalTiers} club tiers`);
}

async function seedCalendarEvents() {
  console.log('Seeding calendar events...');

  for (const event of CALENDAR_EVENTS) {
    const existing = await prisma.milesCalendarEvent.findFirst({
      where: { title: event.title },
    });

    if (existing) {
      await prisma.milesCalendarEvent.update({
        where: { id: existing.id },
        data: {
          startDate: new Date(event.startDate),
          endDate: event.endDate ? new Date(event.endDate) : null,
          programs: event.programs,
          expectedType: event.expectedType,
          historicalNote: event.historicalNote,
          isRecurring: event.isRecurring,
          recurrenceRule: event.recurrenceRule,
        },
      });
    } else {
      await prisma.milesCalendarEvent.create({
        data: {
          title: event.title,
          startDate: new Date(event.startDate),
          endDate: event.endDate ? new Date(event.endDate) : null,
          programs: event.programs,
          expectedType: event.expectedType,
          historicalNote: event.historicalNote,
          isRecurring: event.isRecurring,
          recurrenceRule: event.recurrenceRule,
        },
      });
    }
  }

  console.log(`  Seeded ${CALENDAR_EVENTS.length} calendar events`);
}

async function main() {
  console.log('Starting seed...\n');

  await seedPrograms();
  await seedClubTiers();
  await seedCalendarEvents();

  console.log('\nSeed completed successfully!');
}

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
