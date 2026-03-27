'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useTransition,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import { addAlertConfig } from '@/actions/alerts';
import { enrollInProgram } from '@/actions/programs';
import { addSubscription } from '@/actions/subscriptions';
import { captureAnalyticsEvent } from '@/lib/analytics/client';
import { ANALYTICS_EVENTS } from '@/lib/analytics/events';
import {
  AlertConfigFormFields,
  parseAlertConfigForm,
  type AlertConfigFormValues,
} from '@/components/alerts/alert-config-form-fields';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatCurrency } from '@/lib/utils/format';
import {
  buildQuickAddSubscriptionInput,
  buildStarterAlertConfig,
  getDefaultStartDate,
  getOnboardingStatus,
  getRecommendedClubTiers,
  getRecommendedPrograms,
  getRemainingPrograms,
  getTierPriceNumber,
  type OnboardingClubTierOption,
  type OnboardingProgramOption,
  type OnboardingStepId,
} from './onboarding-wizard.helpers';

interface OnboardingWizardProps {
  readonly availablePrograms: readonly OnboardingProgramOption[];
  readonly clubTiers: readonly OnboardingClubTierOption[];
  readonly enrollmentCount: number;
  readonly activeSubscriptionCount: number;
  readonly alertConfigCount: number;
  readonly enrolledProgramNames: readonly string[];
}

interface ProgramFormValues {
  readonly programId: string;
  readonly memberNumber: string;
  readonly currentBalance: string;
  readonly tier: string;
  readonly expirationDate: string;
}

const STEP_IDS: readonly OnboardingStepId[] = ['programs', 'subscriptions', 'alerts'];

const EMPTY_PROGRAM_FORM: ProgramFormValues = {
  programId: '',
  memberNumber: '',
  currentBalance: '0',
  tier: '',
  expirationDate: '',
};

function buildInitialAlertFormValues(programNames: readonly string[]): AlertConfigFormValues {
  return {
    name: programNames.length > 0 ? `${programNames[0]} watchlist` : 'My promo watchlist',
    channels: ['IN_APP'],
    programNames: programNames.join(', '),
    promoTypes: ['TRANSFER_BONUS'],
    minBonusPercent: '80',
    maxCostPerMilheiro: '',
    telegramChatId: '',
  };
}

function parseNonNegativeInteger(value: string): number | null {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed < 0) {
    return null;
  }

  return parsed;
}

function StepStatusBadge({ complete }: { complete: boolean }) {
  return complete ? <Badge>Done</Badge> : <Badge variant="outline">Pending</Badge>;
}

function StepErrorMessage({
  id,
  message,
}: {
  readonly id: string;
  readonly message: string | null;
}) {
  if (!message) {
    return null;
  }

  return (
    <p id={id} role="alert" aria-live="polite" className="text-sm text-destructive">
      {message}
    </p>
  );
}

export function OnboardingWizard({
  availablePrograms,
  clubTiers,
  enrollmentCount,
  activeSubscriptionCount,
  alertConfigCount,
  enrolledProgramNames,
}: OnboardingWizardProps) {
  const router = useRouter();
  const wizardId = useId();
  const [isPending, startTransition] = useTransition();
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const onboardingStatus = useMemo(
    () =>
      getOnboardingStatus({
        enrollmentCount,
        activeSubscriptionCount,
        alertConfigCount,
      }),
    [enrollmentCount, activeSubscriptionCount, alertConfigCount],
  );

  const recommendedPrograms = useMemo(
    () => getRecommendedPrograms(availablePrograms),
    [availablePrograms],
  );
  const remainingPrograms = useMemo(
    () => getRemainingPrograms(availablePrograms, recommendedPrograms),
    [availablePrograms, recommendedPrograms],
  );
  const recommendedClubTiers = useMemo(
    () => getRecommendedClubTiers(clubTiers),
    [clubTiers],
  );

  const [currentStep, setCurrentStep] = useState<OnboardingStepId>(
    onboardingStatus.firstIncompleteStep ?? 'alerts',
  );
  const wasOnboardingCompleteRef = useRef(onboardingStatus.firstIncompleteStep === null);
  const [showProgramDetails, setShowProgramDetails] = useState(false);
  const [showSubscriptionDetails, setShowSubscriptionDetails] = useState(false);
  const [showAlertDetails, setShowAlertDetails] = useState(false);
  const [programError, setProgramError] = useState<string | null>(null);
  const [subscriptionError, setSubscriptionError] = useState<string | null>(null);
  const [alertError, setAlertError] = useState<string | null>(null);
  const [programForm, setProgramForm] = useState<ProgramFormValues>(EMPTY_PROGRAM_FORM);
  const [selectedTierId, setSelectedTierId] = useState<string>('');
  const [subscriptionStartDate, setSubscriptionStartDate] = useState(() => getDefaultStartDate());
  const [nextBillingDate, setNextBillingDate] = useState('');
  const [customMonthlyCost, setCustomMonthlyCost] = useState('');
  const [customMilesPerMonth, setCustomMilesPerMonth] = useState('');
  const [alertFormValues, setAlertFormValues] = useState<AlertConfigFormValues>(() =>
    buildInitialAlertFormValues(enrolledProgramNames),
  );
  const stepButtonRefs = useRef<Record<OnboardingStepId, HTMLButtonElement | null>>({
    programs: null,
    subscriptions: null,
    alerts: null,
  });
  const stepDomIds = useMemo(
    () => ({
      programs: {
        tabId: `${wizardId}-tab-programs`,
        panelId: `${wizardId}-panel-programs`,
      },
      subscriptions: {
        tabId: `${wizardId}-tab-subscriptions`,
        panelId: `${wizardId}-panel-subscriptions`,
      },
      alerts: {
        tabId: `${wizardId}-tab-alerts`,
        panelId: `${wizardId}-panel-alerts`,
      },
    }),
    [wizardId],
  );
  const stepKeyboardHintId = `${wizardId}-step-keyboard-hint`;
  const programDetailsId = `${wizardId}-program-details`;
  const subscriptionDetailsId = `${wizardId}-subscription-details`;
  const alertDetailsId = `${wizardId}-alert-details`;
  const programErrorId = `${wizardId}-program-error`;
  const subscriptionErrorId = `${wizardId}-subscription-error`;
  const alertErrorId = `${wizardId}-alert-error`;

  useEffect(() => {
    if (onboardingStatus.firstIncompleteStep) {
      setCurrentStep(onboardingStatus.firstIncompleteStep);
    }
  }, [onboardingStatus.firstIncompleteStep]);

  useEffect(() => {
    setAlertFormValues(buildInitialAlertFormValues(enrolledProgramNames));
  }, [enrolledProgramNames]);

  useEffect(() => {
    const isOnboardingComplete = onboardingStatus.firstIncompleteStep === null;

    if (isOnboardingComplete && !wasOnboardingCompleteRef.current) {
      captureAnalyticsEvent(ANALYTICS_EVENTS.onboardingCompleted, {
        activeSubscriptionCount,
        alertConfigCount,
        completedSteps: 3,
        enrollmentCount,
        source: 'wizard',
      });
    }

    wasOnboardingCompleteRef.current = isOnboardingComplete;
  }, [
    activeSubscriptionCount,
    alertConfigCount,
    enrollmentCount,
    onboardingStatus.firstIncompleteStep,
  ]);

  const selectedTier = clubTiers.find((tier) => tier.id === selectedTierId) ?? null;
  const completedSteps = [
    onboardingStatus.hasPrograms,
    onboardingStatus.hasSubscriptions,
    onboardingStatus.hasAlerts,
  ].filter(Boolean).length;

  function runAction(
    actionKey: string,
    onError: (error: string) => void,
    callback: () => Promise<{ success: boolean; error?: string }>,
  ) {
    setPendingAction(actionKey);

    startTransition(async () => {
      const result = await callback();
      setPendingAction(null);

      if (result.success) {
        onError('');
        router.refresh();
        return;
      }

      onError(result.error ?? 'Something went wrong. Please try again.');
    });
  }

  function setProgramErrorMessage(message: string) {
    setProgramError(message || null);
  }

  function setSubscriptionErrorMessage(message: string) {
    setSubscriptionError(message || null);
  }

  function setAlertErrorMessage(message: string) {
    setAlertError(message || null);
  }

  function handleQuickProgramAdd(programId: string) {
    setProgramError(null);
    runAction(`program:${programId}`, setProgramErrorMessage, () =>
      enrollInProgram({
        programId,
        currentBalance: 0,
      }),
    );
  }

  function handleProgramFormSubmit() {
    setProgramError(null);

    if (!programForm.programId) {
      setProgramError('Choose a program to continue.');
      return;
    }

    const currentBalance = parseNonNegativeInteger(programForm.currentBalance);
    if (currentBalance === null) {
      setProgramError('Balance must be a non-negative whole number.');
      return;
    }

    runAction(`program-form:${programForm.programId}`, setProgramErrorMessage, () =>
      enrollInProgram({
        programId: programForm.programId,
        memberNumber: programForm.memberNumber || undefined,
        currentBalance,
        tier: programForm.tier || undefined,
        expirationDate: programForm.expirationDate
          ? new Date(programForm.expirationDate).toISOString()
          : undefined,
      }),
    );
  }

  function selectTier(tierId: string) {
    setSelectedTierId(tierId);

    const tier = clubTiers.find((clubTier) => clubTier.id === tierId);
    if (!tier) {
      return;
    }

    setCustomMonthlyCost(String(getTierPriceNumber(tier.monthlyPrice)));
    setCustomMilesPerMonth(String(tier.baseMonthlyMiles));
  }

  function handleQuickSubscriptionAdd(tier: OnboardingClubTierOption) {
    setSubscriptionError(null);
    runAction(`subscription:${tier.id}`, setSubscriptionErrorMessage, () =>
      addSubscription(buildQuickAddSubscriptionInput(tier)),
    );
  }

  function handleSubscriptionFormSubmit() {
    setSubscriptionError(null);

    if (!selectedTier) {
      setSubscriptionError('Choose a club tier to continue.');
      return;
    }

    if (!subscriptionStartDate) {
      setSubscriptionError('Start date is required.');
      return;
    }

    const monthlyCost = Number.parseFloat(customMonthlyCost);
    if (Number.isNaN(monthlyCost) || monthlyCost <= 0) {
      setSubscriptionError('Monthly cost must be a positive number.');
      return;
    }

    const milesPerMonth = parseNonNegativeInteger(customMilesPerMonth);
    if (milesPerMonth === null) {
      setSubscriptionError('Miles per month must be a non-negative whole number.');
      return;
    }

    runAction(`subscription-form:${selectedTier.id}`, setSubscriptionErrorMessage, () =>
      addSubscription({
        clubTierId: selectedTier.id,
        startDate: subscriptionStartDate,
        monthlyCost,
        accrualSchedule: [{ fromMonth: 1, toMonth: null, milesPerMonth }],
        nextBillingDate: nextBillingDate || undefined,
      }),
    );
  }

  function handleQuickAlertAdd(payload: ReturnType<typeof buildStarterAlertConfig>) {
    setAlertError(null);
    runAction(`alert:${payload.name}`, setAlertErrorMessage, () => addAlertConfig(payload));
  }

  function handleAlertFormSubmit() {
    setAlertError(null);
    const parsed = parseAlertConfigForm(alertFormValues);

    if (!parsed.valid) {
      setAlertError(parsed.error);
      return;
    }

    runAction(`alert-form:${parsed.data.name}`, setAlertErrorMessage, () => addAlertConfig(parsed.data));
  }

  function focusStep(stepId: OnboardingStepId) {
    setCurrentStep(stepId);
    stepButtonRefs.current[stepId]?.focus();
  }

  function handleStepKeyDown(event: ReactKeyboardEvent<HTMLButtonElement>, stepId: OnboardingStepId) {
    const currentIndex = STEP_IDS.indexOf(stepId);

    if (currentIndex === -1) {
      return;
    }

    if (event.key === 'Home') {
      const firstStepId = STEP_IDS[0];
      if (!firstStepId) {
        return;
      }

      event.preventDefault();
      focusStep(firstStepId);
      return;
    }

    if (event.key === 'End') {
      const lastStepId = STEP_IDS[STEP_IDS.length - 1];
      if (!lastStepId) {
        return;
      }

      event.preventDefault();
      focusStep(lastStepId);
      return;
    }

    const offset =
      event.key === 'ArrowRight' || event.key === 'ArrowDown'
        ? 1
        : event.key === 'ArrowLeft' || event.key === 'ArrowUp'
          ? -1
          : 0;

    if (offset === 0) {
      return;
    }

    event.preventDefault();
    const nextIndex = (currentIndex + offset + STEP_IDS.length) % STEP_IDS.length;
    const nextStepId = STEP_IDS[nextIndex];
    if (!nextStepId) {
      return;
    }

    focusStep(nextStepId);
  }

  const steps = [
    {
      id: 'programs' as const,
      title: 'Programs',
      description: 'Start with the programs you already use the most.',
      complete: onboardingStatus.hasPrograms,
    },
    {
      id: 'subscriptions' as const,
      title: 'Subscriptions',
      description: 'Track club accruals without opening the full manager yet.',
      complete: onboardingStatus.hasSubscriptions,
    },
    {
      id: 'alerts' as const,
      title: 'Alerts',
      description: 'Turn promotions into something actionable from day one.',
      complete: onboardingStatus.hasAlerts,
    },
  ];

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <Badge variant="secondary">Onboarding wizard</Badge>
            <CardTitle>Set up MilesControl in three quick steps</CardTitle>
            <CardDescription>
              Casual users can tap through the starter options. Power users can open the extra
              fields and fine-tune every step.
            </CardDescription>
          </div>
          <div className="text-sm text-muted-foreground">{completedSteps}/3 completed</div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <p id={stepKeyboardHintId} className="sr-only">
          Use arrow keys, Home, or End to move between onboarding steps.
        </p>
        <div
          role="tablist"
          aria-label="Onboarding steps"
          aria-describedby={stepKeyboardHintId}
          className="grid gap-3 md:grid-cols-3"
        >
          {steps.map((step, index) => (
            <button
              key={step.id}
              id={stepDomIds[step.id].tabId}
              ref={(element) => {
                stepButtonRefs.current[step.id] = element;
              }}
              type="button"
              role="tab"
              tabIndex={currentStep === step.id ? 0 : -1}
              aria-selected={currentStep === step.id}
              aria-controls={stepDomIds[step.id].panelId}
              onClick={() => setCurrentStep(step.id)}
              onKeyDown={(event) => handleStepKeyDown(event, step.id)}
              className={`rounded-lg border p-4 text-left transition-colors ${
                currentStep === step.id ? 'border-primary bg-primary/5' : 'border-border'
              }`}
            >
              <div className="mb-2 flex items-center justify-between gap-3">
                <div className="text-sm font-medium">
                  {index + 1}. {step.title}
                </div>
                <StepStatusBadge complete={step.complete} />
              </div>
              <p className="text-sm text-muted-foreground">{step.description}</p>
            </button>
          ))}
        </div>

        {currentStep === 'programs' && (
          <div
            id={stepDomIds.programs.panelId}
            role="tabpanel"
            aria-labelledby={stepDomIds.programs.tabId}
            className="space-y-4"
          >
            <div className="space-y-1">
              <h2 className="text-lg font-semibold">Quick-add the most common Brazilian programs</h2>
              <p className="text-sm text-muted-foreground">
                No search box needed. Start with the programs most Brazilian travelers already use.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              {recommendedPrograms.map((entry) => (
                <Button
                  key={entry.program.id}
                  type="button"
                  variant="outline"
                  onClick={() => handleQuickProgramAdd(entry.program.id)}
                  disabled={isPending}
                >
                  {pendingAction === `program:${entry.program.id}` ? 'Adding...' : `Add ${entry.displayName}`}
                </Button>
              ))}
            </div>

            <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
              Quick add uses a zero balance so you can start fast and update the details later.
            </div>

            <div className="flex flex-wrap gap-3">
              <Button
                type="button"
                variant="secondary"
                aria-expanded={showProgramDetails}
                aria-controls={programDetailsId}
                onClick={() => setShowProgramDetails((current) => !current)}
              >
                {showProgramDetails ? 'Hide advanced program fields' : 'Customize program details'}
              </Button>
              <Link href="/programs" className="inline-flex">
                <Button type="button" variant="link">
                  Open full program manager
                </Button>
              </Link>
            </div>

            {showProgramDetails && (
              <div id={programDetailsId} className="grid gap-4 rounded-lg border p-4 md:grid-cols-2">
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="onboarding-program-id">Program</Label>
                  <div className="flex flex-wrap gap-2">
                    {[...recommendedPrograms.map((entry) => entry.program), ...remainingPrograms].map((program) => (
                      <Button
                        key={program.id}
                        type="button"
                        variant={programForm.programId === program.id ? 'default' : 'outline'}
                        onClick={() => setProgramForm((current) => ({ ...current, programId: program.id }))}
                      >
                        {program.name}
                      </Button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="onboarding-member-number">Member number</Label>
                  <Input
                    id="onboarding-member-number"
                    value={programForm.memberNumber}
                    onChange={(event) =>
                      setProgramForm((current) => ({ ...current, memberNumber: event.target.value }))
                    }
                    placeholder="Optional"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="onboarding-current-balance">Current balance</Label>
                  <Input
                    id="onboarding-current-balance"
                    type="number"
                    min="0"
                    value={programForm.currentBalance}
                    onChange={(event) =>
                      setProgramForm((current) => ({ ...current, currentBalance: event.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="onboarding-tier">Tier</Label>
                  <Input
                    id="onboarding-tier"
                    value={programForm.tier}
                    onChange={(event) =>
                      setProgramForm((current) => ({ ...current, tier: event.target.value }))
                    }
                    placeholder="Optional"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="onboarding-expiration-date">Earliest expiration</Label>
                  <Input
                    id="onboarding-expiration-date"
                    type="date"
                    value={programForm.expirationDate}
                    onChange={(event) =>
                      setProgramForm((current) => ({ ...current, expirationDate: event.target.value }))
                    }
                  />
                </div>
                <div className="md:col-span-2 flex items-center justify-between gap-3">
                  <p className="text-sm text-muted-foreground">
                    Need more controls? You can still edit balances, tiers, and expirations later.
                  </p>
                  <Button type="button" onClick={handleProgramFormSubmit} disabled={isPending}>
                    {pendingAction?.startsWith('program-form:') ? 'Saving...' : 'Save program'}
                  </Button>
                </div>
              </div>
            )}

            <StepErrorMessage id={programErrorId} message={programError} />
          </div>
        )}

        {currentStep === 'subscriptions' && (
          <div
            id={stepDomIds.subscriptions.panelId}
            role="tabpanel"
            aria-labelledby={stepDomIds.subscriptions.tabId}
            className="space-y-4"
          >
            <div className="space-y-1">
              <h2 className="text-lg font-semibold">Add a starter club subscription</h2>
              <p className="text-sm text-muted-foreground">
                The quick picks use today as the start date and the lowest commonly used tier for each
                program.
              </p>
            </div>

            <div className="grid gap-3 lg:grid-cols-2">
              {recommendedClubTiers.map((entry) => (
                <div key={entry.tier.id} className="rounded-lg border p-4">
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{entry.displayName}</p>
                      <p className="text-sm text-muted-foreground">{entry.tier.name}</p>
                    </div>
                    <Badge variant="outline">{formatCurrency(getTierPriceNumber(entry.tier.monthlyPrice))}/mo</Badge>
                  </div>
                  <p className="mb-3 text-sm text-muted-foreground">
                    {entry.tier.baseMonthlyMiles.toLocaleString('pt-BR')} miles/points per month
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleQuickSubscriptionAdd(entry.tier)}
                    disabled={isPending}
                  >
                    {pendingAction === `subscription:${entry.tier.id}` ? 'Adding...' : 'Use this starter tier'}
                  </Button>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-3">
              <Button
                type="button"
                variant="secondary"
                aria-expanded={showSubscriptionDetails}
                aria-controls={subscriptionDetailsId}
                onClick={() => setShowSubscriptionDetails((current) => !current)}
              >
                {showSubscriptionDetails ? 'Hide subscription details' : 'Customize subscription'}
              </Button>
              <Link href="/subscriptions" className="inline-flex">
                <Button type="button" variant="link">
                  Need multi-phase schedules? Open the full manager
                </Button>
              </Link>
            </div>

            {showSubscriptionDetails && (
              <div id={subscriptionDetailsId} className="space-y-4 rounded-lg border p-4">
                <div className="space-y-2">
                  <Label>Club tier</Label>
                  <div className="flex flex-wrap gap-2">
                    {clubTiers.map((tier) => (
                      <Button
                        key={tier.id}
                        type="button"
                        variant={selectedTierId === tier.id ? 'default' : 'outline'}
                        onClick={() => selectTier(tier.id)}
                      >
                        {tier.name}
                      </Button>
                    ))}
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="onboarding-subscription-start-date">Start date</Label>
                    <Input
                      id="onboarding-subscription-start-date"
                      type="date"
                      value={subscriptionStartDate}
                      onChange={(event) => setSubscriptionStartDate(event.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="onboarding-subscription-next-billing">Next billing date</Label>
                    <Input
                      id="onboarding-subscription-next-billing"
                      type="date"
                      value={nextBillingDate}
                      onChange={(event) => setNextBillingDate(event.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="onboarding-subscription-monthly-cost">Monthly cost</Label>
                    <Input
                      id="onboarding-subscription-monthly-cost"
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={customMonthlyCost}
                      onChange={(event) => setCustomMonthlyCost(event.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="onboarding-subscription-miles">Miles/points per month</Label>
                    <Input
                      id="onboarding-subscription-miles"
                      type="number"
                      min="0"
                      value={customMilesPerMonth}
                      onChange={(event) => setCustomMilesPerMonth(event.target.value)}
                    />
                  </div>
                </div>
                {selectedTier && selectedTier.minimumStayMonths > 0 && (
                  <p className="text-sm text-muted-foreground">
                    Minimum stay: {selectedTier.minimumStayMonths} months.
                  </p>
                )}
                <div className="flex justify-end">
                  <Button type="button" onClick={handleSubscriptionFormSubmit} disabled={isPending}>
                    {pendingAction?.startsWith('subscription-form:') ? 'Saving...' : 'Save subscription'}
                  </Button>
                </div>
              </div>
            )}

            <StepErrorMessage id={subscriptionErrorId} message={subscriptionError} />
          </div>
        )}

        {currentStep === 'alerts' && (
          <div
            id={stepDomIds.alerts.panelId}
            role="tabpanel"
            aria-labelledby={stepDomIds.alerts.tabId}
            className="space-y-4"
          >
            <div className="space-y-1">
              <h2 className="text-lg font-semibold">Set alerts before the first promo goes live</h2>
              <p className="text-sm text-muted-foreground">
                Start with ready-made rules, or expand the fields if you want tighter filters and more
                channels.
              </p>
            </div>

            <div className="grid gap-3 lg:grid-cols-2">
              <div className="rounded-lg border p-4">
                <p className="font-medium">80%+ transfer bonuses</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Tracks high-value transfer campaigns for the programs you already added.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  className="mt-4"
                  onClick={() => handleQuickAlertAdd(buildStarterAlertConfig(enrolledProgramNames))}
                  disabled={isPending}
                >
                  {pendingAction?.startsWith('alert:') ? 'Creating...' : 'Create starter alert'}
                </Button>
              </div>
              <div className="rounded-lg border p-4">
                <p className="font-medium">All relevant promos</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Leaves promo types open so you can see club, purchase, and mixed opportunities.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  className="mt-4"
                  onClick={() =>
                    handleQuickAlertAdd({
                      ...buildStarterAlertConfig(enrolledProgramNames),
                      name: 'All relevant promos',
                      promoTypes: [],
                      minBonusPercent: null,
                    })
                  }
                  disabled={isPending}
                >
                  {pendingAction?.startsWith('alert:') ? 'Creating...' : 'Create broad alert'}
                </Button>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button
                type="button"
                variant="secondary"
                aria-expanded={showAlertDetails}
                aria-controls={alertDetailsId}
                onClick={() => setShowAlertDetails((current) => !current)}
              >
                {showAlertDetails ? 'Hide advanced alert fields' : 'Customize alert rule'}
              </Button>
              <Link href="/alerts" className="inline-flex">
                <Button type="button" variant="link">
                  Open the full alerts page
                </Button>
              </Link>
            </div>

            {showAlertDetails && (
              <div id={alertDetailsId} className="space-y-4 rounded-lg border p-4">
                <AlertConfigFormFields values={alertFormValues} onChange={setAlertFormValues} idPrefix="onboarding-" />
                <div className="flex justify-end">
                  <Button type="button" onClick={handleAlertFormSubmit} disabled={isPending}>
                    {pendingAction?.startsWith('alert-form:') ? 'Saving...' : 'Save alert rule'}
                  </Button>
                </div>
              </div>
            )}

            <StepErrorMessage id={alertErrorId} message={alertError} />
          </div>
        )}
      </CardContent>
      <CardFooter className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <p className="text-sm text-muted-foreground">
          You can leave the wizard anytime and continue from the dedicated pages without losing
          progress.
        </p>
        {onboardingStatus.firstIncompleteStep && currentStep !== onboardingStatus.firstIncompleteStep && (
          <Button
            type="button"
            variant="outline"
            onClick={() => setCurrentStep(onboardingStatus.firstIncompleteStep ?? 'alerts')}
          >
            Jump to next recommended step
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
