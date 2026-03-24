import { describe, it, expect } from 'vitest';
import type { Promotion, Program, PromoType, PromoStatus, ProgramType } from '@/generated/prisma/client';
import type { PromotionWithPrograms } from './promotion.service';
import type { EnrollmentSummary } from './promo-matcher.service';
import { matchPromotion, matchPromotions } from './promo-matcher.service';

// ==================== Factories ====================

function buildMockProgram(overrides: Partial<Program> = {}): Program {
  return {
    id: 'prog-default',
    name: 'Default Program',
    type: 'AIRLINE' as ProgramType,
    currency: 'miles',
    logoUrl: null,
    website: null,
    transferPartners: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function buildMockPromotion(overrides: Partial<Promotion> = {}): Promotion {
  return {
    id: 'promo-1',
    title: 'Test Promotion',
    type: 'TRANSFER_BONUS' as PromoType,
    status: 'ACTIVE' as PromoStatus,
    sourceProgramId: null,
    destProgramId: null,
    bonusPercent: null,
    purchaseDiscount: null,
    purchasePricePerK: null,
    minimumTransfer: null,
    maxBonusCap: null,
    deadline: null,
    sourceUrl: 'https://example.com/promo',
    sourceSiteName: 'Test Blog',
    rawContent: null,
    costPerMilheiro: null,
    rating: null,
    isVerified: false,
    requiresClub: false,
    clubExtraBonus: null,
    detectedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function buildPromotionWithPrograms(
  overrides: Partial<Promotion> = {},
  sourceProgram: Program | null = null,
  destProgram: Program | null = null,
): PromotionWithPrograms {
  return {
    ...buildMockPromotion(overrides),
    sourceProgram,
    destProgram,
  };
}

function buildEnrollment(overrides: Partial<EnrollmentSummary> = {}): EnrollmentSummary {
  return {
    programId: 'prog-default',
    programName: 'Default',
    currentBalance: 10000,
    ...overrides,
  };
}

// ==================== Tests ====================

describe('matchPromotion', () => {
  it('should return null when enrollments are empty', () => {
    const promo = buildPromotionWithPrograms(
      { sourceProgramId: 'prog-livelo', destProgramId: 'prog-smiles' },
      buildMockProgram({ id: 'prog-livelo', name: 'Livelo' }),
      buildMockProgram({ id: 'prog-smiles', name: 'Smiles' }),
    );

    expect(matchPromotion(promo, [])).toBeNull();
  });

  it('should return null when promotion programs do not match any enrollment', () => {
    const promo = buildPromotionWithPrograms(
      { sourceProgramId: 'prog-livelo', destProgramId: 'prog-smiles' },
      buildMockProgram({ id: 'prog-livelo', name: 'Livelo' }),
      buildMockProgram({ id: 'prog-smiles', name: 'Smiles' }),
    );

    const enrollments = [
      buildEnrollment({ programId: 'prog-azul', programName: 'Azul Fidelidade', currentBalance: 5000 }),
    ];

    expect(matchPromotion(promo, enrollments)).toBeNull();
  });

  it('should return null when promotion has no source or destination program', () => {
    const promo = buildPromotionWithPrograms(
      { sourceProgramId: null, destProgramId: null },
      null,
      null,
    );

    const enrollments = [
      buildEnrollment({ programId: 'prog-livelo', programName: 'Livelo' }),
    ];

    expect(matchPromotion(promo, enrollments)).toBeNull();
  });

  it('should match SOURCE when user is enrolled in the source program', () => {
    const promo = buildPromotionWithPrograms(
      { sourceProgramId: 'prog-livelo', destProgramId: 'prog-smiles', bonusPercent: 90 },
      buildMockProgram({ id: 'prog-livelo', name: 'Livelo' }),
      buildMockProgram({ id: 'prog-smiles', name: 'Smiles' }),
    );

    const enrollments = [
      buildEnrollment({ programId: 'prog-livelo', programName: 'Livelo', currentBalance: 15000 }),
    ];

    const match = matchPromotion(promo, enrollments);

    expect(match).not.toBeNull();
    expect(match!.matchType).toBe('SOURCE');
    expect(match!.promotionId).toBe('promo-1');
    expect(match!.relevanceScore).toBe(10);
    expect(match!.reason).toContain('15.000');
    expect(match!.reason).toContain('Livelo');
    expect(match!.reason).toContain('90%');
  });

  it('should match SOURCE without bonus info for non-transfer promotions', () => {
    const promo = buildPromotionWithPrograms(
      { sourceProgramId: 'prog-livelo', destProgramId: null, type: 'POINT_PURCHASE' as PromoType, bonusPercent: null },
      buildMockProgram({ id: 'prog-livelo', name: 'Livelo' }),
      null,
    );

    const enrollments = [
      buildEnrollment({ programId: 'prog-livelo', programName: 'Livelo', currentBalance: 8000 }),
    ];

    const match = matchPromotion(promo, enrollments);

    expect(match).not.toBeNull();
    expect(match!.matchType).toBe('SOURCE');
    expect(match!.reason).toBe('You have 8.000 Livelo points');
  });

  it('should match DESTINATION when user is enrolled only in the destination program', () => {
    const promo = buildPromotionWithPrograms(
      { sourceProgramId: 'prog-esfera', destProgramId: 'prog-smiles' },
      buildMockProgram({ id: 'prog-esfera', name: 'Esfera' }),
      buildMockProgram({ id: 'prog-smiles', name: 'Smiles' }),
    );

    const enrollments = [
      buildEnrollment({ programId: 'prog-smiles', programName: 'Smiles', currentBalance: 20000 }),
    ];

    const match = matchPromotion(promo, enrollments);

    expect(match).not.toBeNull();
    expect(match!.matchType).toBe('DESTINATION');
    expect(match!.relevanceScore).toBe(5);
    expect(match!.reason).toBe("You're enrolled in Smiles");
  });

  it('should match BOTH when user is enrolled in source and destination', () => {
    const promo = buildPromotionWithPrograms(
      { sourceProgramId: 'prog-livelo', destProgramId: 'prog-smiles' },
      buildMockProgram({ id: 'prog-livelo', name: 'Livelo' }),
      buildMockProgram({ id: 'prog-smiles', name: 'Smiles' }),
    );

    const enrollments = [
      buildEnrollment({ programId: 'prog-livelo', programName: 'Livelo', currentBalance: 15000 }),
      buildEnrollment({ programId: 'prog-smiles', programName: 'Smiles', currentBalance: 50000 }),
    ];

    const match = matchPromotion(promo, enrollments);

    expect(match).not.toBeNull();
    expect(match!.matchType).toBe('BOTH');
    expect(match!.relevanceScore).toBe(15);
    expect(match!.reason).toContain('15.000');
    expect(match!.reason).toContain('Livelo');
    expect(match!.reason).toContain('Smiles');
  });

  it('should handle zero balance correctly', () => {
    const promo = buildPromotionWithPrograms(
      { sourceProgramId: 'prog-livelo', destProgramId: null },
      buildMockProgram({ id: 'prog-livelo', name: 'Livelo' }),
      null,
    );

    const enrollments = [
      buildEnrollment({ programId: 'prog-livelo', programName: 'Livelo', currentBalance: 0 }),
    ];

    const match = matchPromotion(promo, enrollments);

    expect(match).not.toBeNull();
    expect(match!.matchType).toBe('SOURCE');
    expect(match!.reason).toContain('0');
  });

  it('should handle promotion with only destination program', () => {
    const promo = buildPromotionWithPrograms(
      { sourceProgramId: null, destProgramId: 'prog-smiles' },
      null,
      buildMockProgram({ id: 'prog-smiles', name: 'Smiles' }),
    );

    const enrollments = [
      buildEnrollment({ programId: 'prog-smiles', programName: 'Smiles', currentBalance: 30000 }),
    ];

    const match = matchPromotion(promo, enrollments);

    expect(match).not.toBeNull();
    expect(match!.matchType).toBe('DESTINATION');
    expect(match!.reason).toBe("You're enrolled in Smiles");
  });

  it('should handle transfer bonus with null bonusPercent as source match without bonus text', () => {
    const promo = buildPromotionWithPrograms(
      { sourceProgramId: 'prog-livelo', destProgramId: null, type: 'TRANSFER_BONUS' as PromoType, bonusPercent: null },
      buildMockProgram({ id: 'prog-livelo', name: 'Livelo' }),
      null,
    );

    const enrollments = [
      buildEnrollment({ programId: 'prog-livelo', programName: 'Livelo', currentBalance: 5000 }),
    ];

    const match = matchPromotion(promo, enrollments);

    expect(match).not.toBeNull();
    expect(match!.reason).toBe('You have 5.000 Livelo points');
  });
});

describe('matchPromotions', () => {
  it('should return empty map when enrollments are empty', () => {
    const promos = [
      buildPromotionWithPrograms(
        { id: 'p1', sourceProgramId: 'prog-livelo' },
        buildMockProgram({ id: 'prog-livelo', name: 'Livelo' }),
        null,
      ),
    ];

    const result = matchPromotions(promos, []);

    expect(result.size).toBe(0);
  });

  it('should return empty map when no promotions match', () => {
    const promos = [
      buildPromotionWithPrograms(
        { id: 'p1', sourceProgramId: 'prog-esfera', destProgramId: 'prog-azul' },
        buildMockProgram({ id: 'prog-esfera', name: 'Esfera' }),
        buildMockProgram({ id: 'prog-azul', name: 'Azul Fidelidade' }),
      ),
    ];

    const enrollments = [
      buildEnrollment({ programId: 'prog-livelo', programName: 'Livelo' }),
    ];

    const result = matchPromotions(promos, enrollments);

    expect(result.size).toBe(0);
  });

  it('should match multiple promotions', () => {
    const promos = [
      buildPromotionWithPrograms(
        { id: 'p1', sourceProgramId: 'prog-livelo', destProgramId: 'prog-smiles', bonusPercent: 90 },
        buildMockProgram({ id: 'prog-livelo', name: 'Livelo' }),
        buildMockProgram({ id: 'prog-smiles', name: 'Smiles' }),
      ),
      buildPromotionWithPrograms(
        { id: 'p2', sourceProgramId: 'prog-esfera', destProgramId: 'prog-azul' },
        buildMockProgram({ id: 'prog-esfera', name: 'Esfera' }),
        buildMockProgram({ id: 'prog-azul', name: 'Azul Fidelidade' }),
      ),
      buildPromotionWithPrograms(
        { id: 'p3', sourceProgramId: 'prog-livelo', destProgramId: null, type: 'POINT_PURCHASE' as PromoType },
        buildMockProgram({ id: 'prog-livelo', name: 'Livelo' }),
        null,
      ),
    ];

    const enrollments = [
      buildEnrollment({ programId: 'prog-livelo', programName: 'Livelo', currentBalance: 15000 }),
    ];

    const result = matchPromotions(promos, enrollments);

    expect(result.size).toBe(2);
    expect(result.has('p1')).toBe(true);
    expect(result.has('p2')).toBe(false);
    expect(result.has('p3')).toBe(true);
    expect(result.get('p1')!.matchType).toBe('SOURCE');
    expect(result.get('p3')!.matchType).toBe('SOURCE');
  });

  it('should return matches keyed by promotion ID for O(1) lookup', () => {
    const promos = [
      buildPromotionWithPrograms(
        { id: 'p1', sourceProgramId: 'prog-livelo', destProgramId: 'prog-smiles' },
        buildMockProgram({ id: 'prog-livelo', name: 'Livelo' }),
        buildMockProgram({ id: 'prog-smiles', name: 'Smiles' }),
      ),
    ];

    const enrollments = [
      buildEnrollment({ programId: 'prog-livelo', programName: 'Livelo', currentBalance: 10000 }),
      buildEnrollment({ programId: 'prog-smiles', programName: 'Smiles', currentBalance: 5000 }),
    ];

    const result = matchPromotions(promos, enrollments);
    const match = result.get('p1');

    expect(match).toBeDefined();
    expect(match!.matchType).toBe('BOTH');
    expect(match!.promotionId).toBe('p1');
  });

  it('should handle mix of matching and non-matching promotions', () => {
    const promos = [
      buildPromotionWithPrograms(
        { id: 'p1', sourceProgramId: 'prog-livelo', destProgramId: 'prog-smiles', bonusPercent: 80 },
        buildMockProgram({ id: 'prog-livelo', name: 'Livelo' }),
        buildMockProgram({ id: 'prog-smiles', name: 'Smiles' }),
      ),
      buildPromotionWithPrograms(
        { id: 'p2', sourceProgramId: null, destProgramId: null },
        null,
        null,
      ),
      buildPromotionWithPrograms(
        { id: 'p3', sourceProgramId: 'prog-iupp', destProgramId: 'prog-latam' },
        buildMockProgram({ id: 'prog-iupp', name: 'iupp' }),
        buildMockProgram({ id: 'prog-latam', name: 'Latam Pass' }),
      ),
    ];

    const enrollments = [
      buildEnrollment({ programId: 'prog-livelo', programName: 'Livelo', currentBalance: 12000 }),
      buildEnrollment({ programId: 'prog-latam', programName: 'Latam Pass', currentBalance: 30000 }),
    ];

    const result = matchPromotions(promos, enrollments);

    expect(result.size).toBe(2);
    expect(result.get('p1')!.matchType).toBe('SOURCE');
    expect(result.get('p3')!.matchType).toBe('DESTINATION');
  });

  it('should handle empty promotions list', () => {
    const enrollments = [
      buildEnrollment({ programId: 'prog-livelo', programName: 'Livelo' }),
    ];

    const result = matchPromotions([], enrollments);

    expect(result.size).toBe(0);
  });
});
