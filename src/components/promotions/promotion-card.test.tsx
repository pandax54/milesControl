import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Prisma } from '@/generated/prisma/client';
import type { Program, ProgramType, Promotion, PromoStatus, PromoType } from '@/generated/prisma/client';
import { PromotionCard } from './promotion-card';
import { ANALYTICS_EVENTS } from '@/lib/analytics/events';
import type { PromotionWithPrograms } from '@/lib/services/promotion.service';

vi.mock('@/lib/analytics/client', () => ({
  captureAnalyticsEvent: vi.fn(),
}));

vi.mock('@/components/dashboard/promo-calculator-embed', () => ({
  PromoCalculatorEmbed: ({ promoLabel }: { promoLabel?: string }) => <div>{promoLabel ?? 'Quick Calculator'}</div>,
}));

import { captureAnalyticsEvent } from '@/lib/analytics/client';

const mockCaptureAnalyticsEvent = vi.mocked(captureAnalyticsEvent);

function buildMockProgram(overrides: Partial<Program> = {}): Program {
  return {
    id: 'program-default',
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
    title: 'Livelo to Smiles 90% bonus',
    type: 'TRANSFER_BONUS' as PromoType,
    status: 'ACTIVE' as PromoStatus,
    sourceProgramId: 'livelo',
    destProgramId: 'smiles',
    bonusPercent: 90,
    purchaseDiscount: null,
    purchasePricePerK: null,
    minimumTransfer: 10000,
    maxBonusCap: 300000,
    deadline: null,
    sourceUrl: 'https://example.com/promo',
    sourceSiteName: 'Passageiro de Primeira',
    rawContent: null,
    costPerMilheiro: new Prisma.Decimal(12.5),
    rating: 'EXCELLENT',
    isVerified: true,
    requiresClub: false,
    clubExtraBonus: null,
    detectedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function buildPromotionWithPrograms(): PromotionWithPrograms {
  return {
    ...buildMockPromotion(),
    sourceProgram: buildMockProgram({
      id: 'livelo',
      name: 'Livelo',
      type: 'BANKING' as ProgramType,
      currency: 'points',
    }),
    destProgram: buildMockProgram({
      id: 'smiles',
      name: 'Smiles',
    }),
  };
}

describe('PromotionCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should track clicks on the promotion source link', () => {
    render(<PromotionCard promotion={buildPromotionWithPrograms()} />);

    fireEvent.click(screen.getByRole('link', { name: /Passageiro de Primeira/i }));

    expect(mockCaptureAnalyticsEvent).toHaveBeenCalledWith(ANALYTICS_EVENTS.promoEngaged, {
      action: 'source_link_clicked',
      hasCalculator: true,
      isPersonalized: false,
      promotionId: 'promo-1',
      promotionType: 'TRANSFER_BONUS',
      sourceSiteName: 'Passageiro de Primeira',
    });
  });

  it('should track when the quick calculator is opened from a promotion card', () => {
    render(<PromotionCard promotion={buildPromotionWithPrograms()} />);

    fireEvent.click(screen.getByRole('button', { name: /Quick Calculator/i }));

    expect(mockCaptureAnalyticsEvent).toHaveBeenCalledWith(ANALYTICS_EVENTS.promoEngaged, {
      action: 'calculator_opened',
      hasCalculator: true,
      isPersonalized: false,
      promotionId: 'promo-1',
      promotionType: 'TRANSFER_BONUS',
      sourceSiteName: 'Passageiro de Primeira',
    });
    expect(screen.getByText('Calculate: Livelo to Smiles 90% bonus')).toBeInTheDocument();
  });
});
