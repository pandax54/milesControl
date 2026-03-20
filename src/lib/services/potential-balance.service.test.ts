import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ProgramEnrollment, ProgramType, Prisma } from '@/generated/prisma/client';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    programEnrollment: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

import { prisma } from '@/lib/prisma';
import {
  calculatePotentialBalances,
  parseTransferRatio,
  isValidTransferPartners,
} from './potential-balance.service';

const mockFindMany = vi.mocked(prisma.programEnrollment.findMany);

const MOCK_USER_ID = 'user-123';

type EnrollmentWithProgram = ProgramEnrollment & {
  program: {
    id: string;
    name: string;
    type: ProgramType;
    currency: string;
    transferPartners: Prisma.JsonValue;
  };
};

function buildEnrollment(overrides: {
  programName: string;
  programType: ProgramType;
  currentBalance: number;
  transferPartners?: Prisma.JsonValue;
  programId?: string;
  currency?: string;
}): EnrollmentWithProgram {
  const programId = overrides.programId ?? `prog-${overrides.programName.toLowerCase().replace(/\s+/g, '-')}`;
  return {
    id: `enr-${programId}`,
    userId: MOCK_USER_ID,
    programId,
    memberNumber: null,
    currentBalance: overrides.currentBalance,
    tier: null,
    balanceUpdatedAt: new Date('2026-03-15'),
    expirationDate: null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-03-15'),
    program: {
      id: programId,
      name: overrides.programName,
      type: overrides.programType,
      currency: overrides.currency ?? (overrides.programType === 'AIRLINE' ? 'miles' : 'points'),
      transferPartners: overrides.transferPartners ?? null,
    },
  };
}

describe('parseTransferRatio', () => {
  it('should parse 1:1 ratio', () => {
    expect(parseTransferRatio('1:1')).toBe(1);
  });

  it('should parse 2:1 ratio', () => {
    expect(parseTransferRatio('2:1')).toBe(2);
  });

  it('should parse 1:2 ratio', () => {
    expect(parseTransferRatio('1:2')).toBe(0.5);
  });

  it('should return default ratio for invalid format', () => {
    expect(parseTransferRatio('invalid')).toBe(1);
  });

  it('should return default ratio for empty string', () => {
    expect(parseTransferRatio('')).toBe(1);
  });

  it('should return default ratio when denominator is zero', () => {
    expect(parseTransferRatio('1:0')).toBe(1);
  });

  it('should return default ratio for non-numeric parts', () => {
    expect(parseTransferRatio('a:b')).toBe(1);
  });
});

describe('isValidTransferPartners', () => {
  it('should return true for valid transfer partners array', () => {
    expect(isValidTransferPartners([
      { name: 'Livelo', defaultRatio: '1:1' },
      { name: 'Esfera', defaultRatio: '1:1' },
    ])).toBe(true);
  });

  it('should return false for null', () => {
    expect(isValidTransferPartners(null)).toBe(false);
  });

  it('should return false for non-array', () => {
    expect(isValidTransferPartners('not an array')).toBe(false);
  });

  it('should return false for array with invalid entries', () => {
    expect(isValidTransferPartners([{ foo: 'bar' }])).toBe(false);
  });

  it('should return false for empty object entries', () => {
    expect(isValidTransferPartners([null])).toBe(false);
  });

  it('should return true for empty array', () => {
    expect(isValidTransferPartners([])).toBe(true);
  });
});

describe('calculatePotentialBalances', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should return empty array when user has no enrollments', async () => {
    mockFindMany.mockResolvedValue([]);

    const result = await calculatePotentialBalances(MOCK_USER_ID);

    expect(result).toEqual([]);
  });

  it('should return empty array when user has only airline enrollments', async () => {
    mockFindMany.mockResolvedValue([
      buildEnrollment({
        programName: 'Smiles',
        programType: 'AIRLINE',
        currentBalance: 10000,
        transferPartners: [{ name: 'Livelo', defaultRatio: '1:1' }],
      }),
    ]);

    const result = await calculatePotentialBalances(MOCK_USER_ID);

    expect(result).toEqual([]);
  });

  it('should return empty array when user has only banking enrollments', async () => {
    mockFindMany.mockResolvedValue([
      buildEnrollment({
        programName: 'Livelo',
        programType: 'BANKING',
        currentBalance: 5000,
      }),
    ]);

    const result = await calculatePotentialBalances(MOCK_USER_ID);

    expect(result).toEqual([]);
  });

  it('should calculate potential balance for single airline with one banking source', async () => {
    mockFindMany.mockResolvedValue([
      buildEnrollment({
        programName: 'Smiles',
        programType: 'AIRLINE',
        currentBalance: 10000,
        transferPartners: [{ name: 'Livelo', defaultRatio: '1:1' }],
      }),
      buildEnrollment({
        programName: 'Livelo',
        programType: 'BANKING',
        currentBalance: 5000,
      }),
    ]);

    const result = await calculatePotentialBalances(MOCK_USER_ID);

    expect(result).toHaveLength(1);
    expect(result[0].targetProgramName).toBe('Smiles');
    expect(result[0].currentBalance).toBe(10000);
    expect(result[0].sources).toHaveLength(1);
    expect(result[0].sources[0].programName).toBe('Livelo');
    expect(result[0].sources[0].currentBalance).toBe(5000);
    expect(result[0].sources[0].potentialMiles).toBe(5000);
    expect(result[0].totalPotentialMiles).toBe(15000);
  });

  it('should calculate potential balance with multiple banking sources', async () => {
    mockFindMany.mockResolvedValue([
      buildEnrollment({
        programName: 'Smiles',
        programType: 'AIRLINE',
        currentBalance: 10000,
        transferPartners: [
          { name: 'Livelo', defaultRatio: '1:1' },
          { name: 'Esfera', defaultRatio: '1:1' },
        ],
      }),
      buildEnrollment({
        programName: 'Livelo',
        programType: 'BANKING',
        currentBalance: 5000,
      }),
      buildEnrollment({
        programName: 'Esfera',
        programType: 'BANKING',
        currentBalance: 3000,
      }),
    ]);

    const result = await calculatePotentialBalances(MOCK_USER_ID);

    expect(result).toHaveLength(1);
    expect(result[0].sources).toHaveLength(2);
    expect(result[0].totalPotentialMiles).toBe(18000);
  });

  it('should calculate potential balances for multiple airline programs', async () => {
    mockFindMany.mockResolvedValue([
      buildEnrollment({
        programName: 'Smiles',
        programType: 'AIRLINE',
        currentBalance: 10000,
        transferPartners: [{ name: 'Livelo', defaultRatio: '1:1' }],
      }),
      buildEnrollment({
        programName: 'Latam Pass',
        programType: 'AIRLINE',
        currentBalance: 8000,
        transferPartners: [{ name: 'Livelo', defaultRatio: '1:1' }],
      }),
      buildEnrollment({
        programName: 'Livelo',
        programType: 'BANKING',
        currentBalance: 5000,
      }),
    ]);

    const result = await calculatePotentialBalances(MOCK_USER_ID);

    expect(result).toHaveLength(2);
    expect(result[0].targetProgramName).toBe('Smiles');
    expect(result[0].totalPotentialMiles).toBe(15000);
    expect(result[1].targetProgramName).toBe('Latam Pass');
    expect(result[1].totalPotentialMiles).toBe(13000);
  });

  it('should skip banking programs with zero balance', async () => {
    mockFindMany.mockResolvedValue([
      buildEnrollment({
        programName: 'Smiles',
        programType: 'AIRLINE',
        currentBalance: 10000,
        transferPartners: [
          { name: 'Livelo', defaultRatio: '1:1' },
          { name: 'Esfera', defaultRatio: '1:1' },
        ],
      }),
      buildEnrollment({
        programName: 'Livelo',
        programType: 'BANKING',
        currentBalance: 5000,
      }),
      buildEnrollment({
        programName: 'Esfera',
        programType: 'BANKING',
        currentBalance: 0,
      }),
    ]);

    const result = await calculatePotentialBalances(MOCK_USER_ID);

    expect(result).toHaveLength(1);
    expect(result[0].sources).toHaveLength(1);
    expect(result[0].sources[0].programName).toBe('Livelo');
    expect(result[0].totalPotentialMiles).toBe(15000);
  });

  it('should skip airline programs without valid transfer partners', async () => {
    mockFindMany.mockResolvedValue([
      buildEnrollment({
        programName: 'Smiles',
        programType: 'AIRLINE',
        currentBalance: 10000,
        transferPartners: null,
      }),
      buildEnrollment({
        programName: 'Livelo',
        programType: 'BANKING',
        currentBalance: 5000,
      }),
    ]);

    const result = await calculatePotentialBalances(MOCK_USER_ID);

    expect(result).toEqual([]);
  });

  it('should skip banking programs user is not enrolled in', async () => {
    mockFindMany.mockResolvedValue([
      buildEnrollment({
        programName: 'Smiles',
        programType: 'AIRLINE',
        currentBalance: 10000,
        transferPartners: [
          { name: 'Livelo', defaultRatio: '1:1' },
          { name: 'Esfera', defaultRatio: '1:1' },
        ],
      }),
      buildEnrollment({
        programName: 'Livelo',
        programType: 'BANKING',
        currentBalance: 5000,
      }),
    ]);

    const result = await calculatePotentialBalances(MOCK_USER_ID);

    expect(result).toHaveLength(1);
    expect(result[0].sources).toHaveLength(1);
    expect(result[0].sources[0].programName).toBe('Livelo');
  });

  it('should handle non-1:1 transfer ratios', async () => {
    mockFindMany.mockResolvedValue([
      buildEnrollment({
        programName: 'Smiles',
        programType: 'AIRLINE',
        currentBalance: 10000,
        transferPartners: [{ name: 'Livelo', defaultRatio: '2:1' }],
      }),
      buildEnrollment({
        programName: 'Livelo',
        programType: 'BANKING',
        currentBalance: 5000,
      }),
    ]);

    const result = await calculatePotentialBalances(MOCK_USER_ID);

    expect(result).toHaveLength(1);
    expect(result[0].sources[0].transferRatio).toBe(2);
    expect(result[0].sources[0].potentialMiles).toBe(10000);
    expect(result[0].totalPotentialMiles).toBe(20000);
  });

  it('should floor potential miles for non-integer results', async () => {
    mockFindMany.mockResolvedValue([
      buildEnrollment({
        programName: 'Smiles',
        programType: 'AIRLINE',
        currentBalance: 0,
        transferPartners: [{ name: 'Livelo', defaultRatio: '1:2' }],
      }),
      buildEnrollment({
        programName: 'Livelo',
        programType: 'BANKING',
        currentBalance: 5001,
      }),
    ]);

    const result = await calculatePotentialBalances(MOCK_USER_ID);

    expect(result[0].sources[0].potentialMiles).toBe(2500);
    expect(result[0].totalPotentialMiles).toBe(2500);
  });

  it('should include target program currency in result', async () => {
    mockFindMany.mockResolvedValue([
      buildEnrollment({
        programName: 'Azul Fidelidade',
        programType: 'AIRLINE',
        currentBalance: 1000,
        transferPartners: [{ name: 'Livelo', defaultRatio: '1:1' }],
        currency: 'points',
      }),
      buildEnrollment({
        programName: 'Livelo',
        programType: 'BANKING',
        currentBalance: 2000,
      }),
    ]);

    const result = await calculatePotentialBalances(MOCK_USER_ID);

    expect(result[0].targetProgramCurrency).toBe('points');
  });

  it('should skip airline when all matching banking enrollments have zero balance', async () => {
    mockFindMany.mockResolvedValue([
      buildEnrollment({
        programName: 'Smiles',
        programType: 'AIRLINE',
        currentBalance: 10000,
        transferPartners: [{ name: 'Livelo', defaultRatio: '1:1' }],
      }),
      buildEnrollment({
        programName: 'Livelo',
        programType: 'BANKING',
        currentBalance: 0,
      }),
    ]);

    const result = await calculatePotentialBalances(MOCK_USER_ID);

    expect(result).toEqual([]);
  });
});
