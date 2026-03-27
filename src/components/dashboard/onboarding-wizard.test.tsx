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

vi.mock('@/lib/analytics/client', () => ({
  captureAnalyticsEvent: vi.fn(),
}));

import { addAlertConfig } from '@/actions/alerts';
import { enrollInProgram } from '@/actions/programs';
import { addSubscription } from '@/actions/subscriptions';
import { captureAnalyticsEvent } from '@/lib/analytics/client';
import { ANALYTICS_EVENTS } from '@/lib/analytics/events';
import { OnboardingWizard } from './onboarding-wizard';

const mockEnrollInProgram = vi.mocked(enrollInProgram);
const mockAddSubscription = vi.mocked(addSubscription);
const mockAddAlertConfig = vi.mocked(addAlertConfig);
const mockCaptureAnalyticsEvent = vi.mocked(captureAnalyticsEvent);

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

  it('should support arrow-key navigation across onboarding steps', () => {
    render(
      <OnboardingWizard
        {...baseProps}
        enrollmentCount={0}
        activeSubscriptionCount={0}
        alertConfigCount={0}
        enrolledProgramNames={[]}
      />,
    );

    const programsTab = screen.getByRole('tab', { name: /Programs/i });

    fireEvent.keyDown(programsTab, { key: 'ArrowRight' });

    const subscriptionsTab = screen.getByRole('tab', { name: /Subscriptions/i });
    expect(subscriptionsTab).toHaveAttribute('aria-selected', 'true');
    expect(subscriptionsTab).toHaveFocus();
    expect(screen.getByText('Add a starter club subscription')).toBeInTheDocument();

    fireEvent.keyDown(subscriptionsTab, { key: 'End' });

    const alertsTab = screen.getByRole('tab', { name: /Alerts/i });
    expect(alertsTab).toHaveAttribute('aria-selected', 'true');
    expect(alertsTab).toHaveFocus();
    expect(screen.getByText('Set alerts before the first promo goes live')).toBeInTheDocument();

    fireEvent.keyDown(alertsTab, { key: 'Home' });

    expect(programsTab).toHaveAttribute('aria-selected', 'true');
    expect(programsTab).toHaveFocus();
    expect(screen.getByText('Quick-add the most common Brazilian programs')).toBeInTheDocument();
  });

  it('should expose advanced setup toggles with controlled sections', () => {
    render(
      <OnboardingWizard
        {...baseProps}
        enrollmentCount={1}
        activeSubscriptionCount={0}
        alertConfigCount={0}
      />,
    );

    const subscriptionToggle = screen.getByRole('button', { name: 'Customize subscription' });
    const subscriptionDetailsId = subscriptionToggle.getAttribute('aria-controls');

    expect(subscriptionToggle).toHaveAttribute('aria-expanded', 'false');
    expect(subscriptionDetailsId).not.toBeNull();

    fireEvent.click(subscriptionToggle);

    expect(subscriptionToggle).toHaveAttribute('aria-expanded', 'true');
    expect(document.getElementById(subscriptionDetailsId!)).toBeInTheDocument();

    const subscriptionsTab = screen.getByRole('tab', { name: /Subscriptions/i });
    fireEvent.keyDown(subscriptionsTab, { key: 'ArrowRight' });

    const alertToggle = screen.getByRole('button', { name: 'Customize alert rule' });
    const alertDetailsId = alertToggle.getAttribute('aria-controls');

    expect(alertToggle).toHaveAttribute('aria-expanded', 'false');
    expect(alertDetailsId).not.toBeNull();

    fireEvent.click(alertToggle);

    expect(alertToggle).toHaveAttribute('aria-expanded', 'true');
    expect(document.getElementById(alertDetailsId!)).toBeInTheDocument();
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

  it('should announce validation errors through alert live regions', () => {
    const { rerender } = render(
      <OnboardingWizard
        {...baseProps}
        enrollmentCount={0}
        activeSubscriptionCount={0}
        alertConfigCount={0}
        enrolledProgramNames={[]}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Customize program details' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save program' }));

    let alertMessage = screen.getByRole('alert');
    expect(alertMessage).toHaveTextContent('Choose a program to continue.');

    rerender(
      <OnboardingWizard
        {...baseProps}
        enrollmentCount={1}
        activeSubscriptionCount={0}
        alertConfigCount={0}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Customize subscription' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save subscription' }));

    alertMessage = screen.getByRole('alert');
    expect(alertMessage).toHaveTextContent('Choose a club tier to continue.');

    rerender(
      <OnboardingWizard
        {...baseProps}
        enrollmentCount={1}
        activeSubscriptionCount={1}
        alertConfigCount={0}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Customize alert rule' }));
    fireEvent.change(screen.getByLabelText('Rule Name'), { target: { value: ' ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save alert rule' }));

    alertMessage = screen.getByRole('alert');
    expect(alertMessage).toHaveTextContent('Rule name is required');
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

  it('should track onboarding completion after the final step is configured', () => {
    const { rerender } = render(
      <OnboardingWizard
        {...baseProps}
        enrollmentCount={1}
        activeSubscriptionCount={1}
        alertConfigCount={0}
      />,
    );

    expect(mockCaptureAnalyticsEvent).not.toHaveBeenCalled();

    rerender(
      <OnboardingWizard
        {...baseProps}
        enrollmentCount={1}
        activeSubscriptionCount={1}
        alertConfigCount={1}
      />,
    );

    expect(mockCaptureAnalyticsEvent).toHaveBeenCalledWith(ANALYTICS_EVENTS.onboardingCompleted, {
      activeSubscriptionCount: 1,
      alertConfigCount: 1,
      completedSteps: 3,
      enrollmentCount: 1,
      source: 'wizard',
    });
  });
});
