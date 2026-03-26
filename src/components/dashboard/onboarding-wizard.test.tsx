import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/link', () => ({
  default: ({ children, href }: React.PropsWithChildren<{ href: string }>) => <a href={href}>{children}</a>,
}));

const mockRefresh = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mockRefresh }),
}));

vi.mock('@/actions/programs', () => ({
  enrollInProgram: vi.fn(),
}));

vi.mock('@/actions/subscriptions', () => ({
  addSubscription: vi.fn(),
}));

vi.mock('@/actions/alerts', () => ({
  addAlertConfig: vi.fn(),
}));

import { addAlertConfig } from '@/actions/alerts';
import { enrollInProgram } from '@/actions/programs';
import { addSubscription } from '@/actions/subscriptions';
import { OnboardingWizard } from './onboarding-wizard';

const mockEnrollInProgram = vi.mocked(enrollInProgram);
const mockAddSubscription = vi.mocked(addSubscription);
const mockAddAlertConfig = vi.mocked(addAlertConfig);

const baseProps = {
  availablePrograms: [
    { id: 'smiles', name: 'Smiles', type: 'AIRLINE', currency: 'miles' },
    { id: 'livelo', name: 'Livelo', type: 'BANKING', currency: 'points' },
    { id: 'latam', name: 'Latam Pass', type: 'AIRLINE', currency: 'miles' },
    { id: 'azul', name: 'Azul Fidelidade', type: 'AIRLINE', currency: 'points' },
  ],
  clubTiers: [
    {
      id: 'smiles-tier',
      name: 'Clube Smiles 1.000',
      monthlyPrice: 42,
      baseMonthlyMiles: 1000,
      minimumStayMonths: 6,
      program: { id: 'smiles', name: 'Smiles', type: 'AIRLINE' },
    },
    {
      id: 'livelo-tier',
      name: 'Clube Livelo 200',
      monthlyPrice: 15.9,
      baseMonthlyMiles: 200,
      minimumStayMonths: 0,
      program: { id: 'livelo', name: 'Livelo', type: 'BANKING' },
    },
  ],
  enrolledProgramNames: ['Smiles'],
};

describe('OnboardingWizard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEnrollInProgram.mockResolvedValue({ success: true });
    mockAddSubscription.mockResolvedValue({ success: true });
    mockAddAlertConfig.mockResolvedValue({ success: true });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should quick-add a recommended program and refresh the dashboard', async () => {
    render(
      <OnboardingWizard
        {...baseProps}
        enrollmentCount={0}
        activeSubscriptionCount={0}
        alertConfigCount={0}
        enrolledProgramNames={[]}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Add Smiles' }));

    await waitFor(() => {
      expect(mockEnrollInProgram).toHaveBeenCalledWith({ programId: 'smiles', currentBalance: 0 });
      expect(mockRefresh).toHaveBeenCalled();
    });
  });

  it('should start on subscriptions after programs are already configured', async () => {
    render(
      <OnboardingWizard
        {...baseProps}
        enrollmentCount={1}
        activeSubscriptionCount={0}
        alertConfigCount={0}
      />,
    );

    expect(screen.getByText('Add a starter club subscription')).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole('button', { name: 'Use this starter tier' })[0]);

    await waitFor(() => {
      expect(mockAddSubscription).toHaveBeenCalledWith({
        clubTierId: 'smiles-tier',
        startDate: expect.any(String),
        monthlyCost: 42,
        accrualSchedule: [{ fromMonth: 1, toMonth: null, milesPerMonth: 1000 }],
      });
    });
  });

  it('should create the starter alert for the current programs', async () => {
    render(
      <OnboardingWizard
        {...baseProps}
        enrollmentCount={1}
        activeSubscriptionCount={1}
        alertConfigCount={0}
      />,
    );

    expect(screen.getByText('Set alerts before the first promo goes live')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Create starter alert' }));

    await waitFor(() => {
      expect(mockAddAlertConfig).toHaveBeenCalledWith({
        name: 'Smiles 80%+ transfer alert',
        channels: ['IN_APP'],
        programNames: ['Smiles'],
        promoTypes: ['TRANSFER_BONUS'],
        minBonusPercent: 80,
        maxCostPerMilheiro: null,
        telegramChatId: null,
      });
      expect(mockRefresh).toHaveBeenCalled();
    });
  });
});
