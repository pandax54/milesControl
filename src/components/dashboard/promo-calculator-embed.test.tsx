import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PromoCalculatorEmbed } from './promo-calculator-embed';
import { ANALYTICS_EVENTS } from '@/lib/analytics/events';

vi.mock('@/actions/calculator', () => ({
  calculateCostPerMilheiroAction: vi.fn(),
}));

vi.mock('@/lib/analytics/client', () => ({
  captureAnalyticsEvent: vi.fn(),
}));

import { calculateCostPerMilheiroAction } from '@/actions/calculator';
import { captureAnalyticsEvent } from '@/lib/analytics/client';

const mockCalculateCostPerMilheiroAction = vi.mocked(calculateCostPerMilheiroAction);
const mockCaptureAnalyticsEvent = vi.mocked(captureAnalyticsEvent);

describe('PromoCalculatorEmbed', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCalculateCostPerMilheiroAction.mockResolvedValue({
      success: true,
      data: {
        totalCost: 280,
        totalMiles: 19000,
        costPerMilheiro: 14.736842105263158,
        rating: 'GOOD',
      },
    });
  });

  it('should track successful calculator usage when promo analytics metadata is provided', async () => {
    render(
      <PromoCalculatorEmbed
        defaultInput={{
          purchasePricePerPoint: 0.028,
          quantity: 10000,
          transferBonusPercent: 90,
        }}
        analyticsContext={{
          promotionId: 'promo-1',
          promotionType: 'TRANSFER_BONUS',
          sourceSiteName: 'Passageiro de Primeira',
          isPersonalized: true,
        }}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Calculate' }));

    await waitFor(() => {
      expect(mockCalculateCostPerMilheiroAction).toHaveBeenCalledWith({
        purchasePricePerPoint: 0.028,
        quantity: 10000,
        transferBonusPercent: 90,
      });
      expect(mockCaptureAnalyticsEvent).toHaveBeenCalledWith(ANALYTICS_EVENTS.promoEngaged, {
        action: 'calculator_calculated',
        costPerMilheiro: 14.74,
        isPersonalized: true,
        promotionId: 'promo-1',
        promotionType: 'TRANSFER_BONUS',
        quantity: 10000,
        rating: 'GOOD',
        sourceSiteName: 'Passageiro de Primeira',
        transferBonusPercent: 90,
      });
    });
  });
});
