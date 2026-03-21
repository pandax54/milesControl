'use client';

import { useRef, useState, useTransition } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Calculator, Plus, Trash2 } from 'lucide-react';
import { calculateCostPerMilheiroAction, compareScenariosAction } from '@/actions/calculator';
import { PRESET_SCENARIOS } from '@/lib/services/cost-calculator.service';
import type { CalculatorInput } from '@/lib/validators/cost-calculator.schema';
import { CalculatorResultCard } from './calculator-result-card';
import type { CostCalculation, ScenarioComparison } from '@/lib/services/cost-calculator.service';

interface FormValues {
  purchasePricePerPoint: string;
  quantity: string;
  transferBonusPercent: string;
  clubMonthlyCost: string;
  clubExclusiveBonusPercent: string;
}

const EMPTY_FORM: FormValues = {
  purchasePricePerPoint: '',
  quantity: '',
  transferBonusPercent: '0',
  clubMonthlyCost: '',
  clubExclusiveBonusPercent: '',
};

const MIN_SCENARIOS = 2;
const MAX_SCENARIOS = 3;

function parseFormToInput(form: FormValues): CalculatorInput {
  return {
    purchasePricePerPoint: Number(form.purchasePricePerPoint),
    quantity: Math.round(Number(form.quantity)),
    transferBonusPercent: Number(form.transferBonusPercent) || 0,
    ...(form.clubMonthlyCost ? { clubMonthlyCost: Number(form.clubMonthlyCost) } : {}),
    ...(form.clubExclusiveBonusPercent ? { clubExclusiveBonusPercent: Number(form.clubExclusiveBonusPercent) } : {}),
  };
}

function inputToForm(input: CalculatorInput): FormValues {
  return {
    purchasePricePerPoint: String(input.purchasePricePerPoint),
    quantity: String(input.quantity),
    transferBonusPercent: String(input.transferBonusPercent),
    clubMonthlyCost: input.clubMonthlyCost != null ? String(input.clubMonthlyCost) : '',
    clubExclusiveBonusPercent: input.clubExclusiveBonusPercent != null ? String(input.clubExclusiveBonusPercent) : '',
  };
}

interface CalculatorFieldsProps {
  form: FormValues;
  onChange: (field: keyof FormValues, value: string) => void;
  idPrefix?: string;
}

function CalculatorFields({ form, onChange, idPrefix = '' }: CalculatorFieldsProps) {
  const prefix = idPrefix ? `${idPrefix}-` : '';

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-2">
        <Label htmlFor={`${prefix}purchasePricePerPoint`}>Price per Point (R$)</Label>
        <Input
          id={`${prefix}purchasePricePerPoint`}
          type="number"
          step="0.001"
          min="0"
          placeholder="0.028"
          value={form.purchasePricePerPoint}
          onChange={(e) => onChange('purchasePricePerPoint', e.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          e.g. 0.028 = R$28 per 1,000 points
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${prefix}quantity`}>Quantity (points)</Label>
        <Input
          id={`${prefix}quantity`}
          type="number"
          min="1"
          step="1000"
          placeholder="10000"
          value={form.quantity}
          onChange={(e) => onChange('quantity', e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${prefix}transferBonusPercent`}>Transfer Bonus (%)</Label>
        <Input
          id={`${prefix}transferBonusPercent`}
          type="number"
          min="0"
          step="5"
          placeholder="90"
          value={form.transferBonusPercent}
          onChange={(e) => onChange('transferBonusPercent', e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${prefix}clubMonthlyCost`}>Club Monthly Cost (R$)</Label>
        <Input
          id={`${prefix}clubMonthlyCost`}
          type="number"
          min="0"
          step="0.01"
          placeholder="42.90"
          value={form.clubMonthlyCost}
          onChange={(e) => onChange('clubMonthlyCost', e.target.value)}
        />
        <p className="text-xs text-muted-foreground">Optional</p>
      </div>
      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor={`${prefix}clubExclusiveBonusPercent`}>Club Exclusive Bonus (%)</Label>
        <Input
          id={`${prefix}clubExclusiveBonusPercent`}
          type="number"
          min="0"
          step="5"
          placeholder="10"
          value={form.clubExclusiveBonusPercent}
          onChange={(e) => onChange('clubExclusiveBonusPercent', e.target.value)}
        />
        <p className="text-xs text-muted-foreground">Optional — extra bonus for club members</p>
      </div>
    </div>
  );
}

export function CalculatorForm() {
  return (
    <Tabs defaultValue="single">
      <TabsList>
        <TabsTrigger value="single">Single Calculation</TabsTrigger>
        <TabsTrigger value="compare">Compare Scenarios</TabsTrigger>
      </TabsList>
      <TabsContent value="single">
        <SingleCalculator />
      </TabsContent>
      <TabsContent value="compare">
        <CompareCalculator />
      </TabsContent>
    </Tabs>
  );
}

function SingleCalculator() {
  const [form, setForm] = useState<FormValues>(EMPTY_FORM);
  const [result, setResult] = useState<CostCalculation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function updateField(field: keyof FormValues, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handlePreset(input: CalculatorInput) {
    setForm(inputToForm(input));
    setResult(null);
    setError(null);
  }

  function handleCalculate() {
    setError(null);
    startTransition(async () => {
      const input = parseFormToInput(form);
      const response = await calculateCostPerMilheiroAction(input);
      if (response.success && response.data) {
        setResult(response.data);
      } else {
        setError(response.error ?? 'Calculation failed');
        setResult(null);
      }
    });
  }

  function handleReset() {
    setForm(EMPTY_FORM);
    setResult(null);
    setError(null);
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Cost per Milheiro Calculator</CardTitle>
          <CardDescription>
            Calculate the effective cost of acquiring miles through point purchases and transfer bonuses.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Quick Presets</Label>
            <div className="flex flex-wrap gap-2">
              {PRESET_SCENARIOS.map((preset) => (
                <Button
                  key={preset.name}
                  variant="outline"
                  size="sm"
                  onClick={() => handlePreset(preset.input)}
                  title={preset.description}
                >
                  {preset.name}
                </Button>
              ))}
            </div>
          </div>

          <CalculatorFields form={form} onChange={updateField} />

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <div className="flex gap-2">
            <Button onClick={handleCalculate} disabled={isPending}>
              <Calculator className="mr-2 h-4 w-4" />
              {isPending ? 'Calculating...' : 'Calculate'}
            </Button>
            <Button variant="outline" onClick={handleReset}>
              Clear
            </Button>
          </div>
        </CardContent>
      </Card>

      {result && (
        <CalculatorResultCard result={result} label="Calculation Result" />
      )}
    </div>
  );
}

interface ScenarioForm {
  id: number;
  name: string;
  values: FormValues;
}

const INITIAL_COUNTER = 2;

function CompareCalculator() {
  const scenarioIdCounter = useRef(INITIAL_COUNTER);
  const [scenarios, setScenarios] = useState<ScenarioForm[]>([
    { id: 0, name: 'Scenario 1', values: EMPTY_FORM },
    { id: 1, name: 'Scenario 2', values: EMPTY_FORM },
  ]);
  const [comparison, setComparison] = useState<ScenarioComparison | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function updateScenarioField(scenarioId: number, field: keyof FormValues, value: string) {
    setScenarios((prev) =>
      prev.map((s) =>
        s.id === scenarioId ? { ...s, values: { ...s.values, [field]: value } } : s,
      ),
    );
  }

  function addScenario() {
    if (scenarios.length >= MAX_SCENARIOS) return;
    scenarioIdCounter.current += 1;
    setScenarios((prev) => [
      ...prev,
      {
        id: scenarioIdCounter.current,
        name: `Scenario ${prev.length + 1}`,
        values: EMPTY_FORM,
      },
    ]);
  }

  function removeScenario(scenarioId: number) {
    if (scenarios.length <= MIN_SCENARIOS) return;
    setScenarios((prev) => prev.filter((s) => s.id !== scenarioId));
    setComparison(null);
  }

  function applyPresetToScenario(scenarioId: number, input: CalculatorInput) {
    setScenarios((prev) =>
      prev.map((s) =>
        s.id === scenarioId ? { ...s, values: inputToForm(input) } : s,
      ),
    );
    setComparison(null);
  }

  function handleCompare() {
    setError(null);
    startTransition(async () => {
      const inputs = scenarios.map((s) => parseFormToInput(s.values));
      const response = await compareScenariosAction({ scenarios: inputs });
      if (response.success && response.data) {
        setComparison(response.data);
      } else {
        setError(response.error ?? 'Comparison failed');
        setComparison(null);
      }
    });
  }

  function handleReset() {
    setScenarios([
      { id: 0, name: 'Scenario 1', values: EMPTY_FORM },
      { id: 1, name: 'Scenario 2', values: EMPTY_FORM },
    ]);
    setComparison(null);
    setError(null);
    scenarioIdCounter.current = INITIAL_COUNTER;
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {scenarios.map((scenario, index) => (
          <Card key={scenario.id}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{scenario.name}</span>
                {scenarios.length > MIN_SCENARIOS && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeScenario(scenario.id)}
                    aria-label={`Remove ${scenario.name}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </CardTitle>
              <div className="flex flex-wrap gap-1">
                {PRESET_SCENARIOS.map((preset) => (
                  <Badge
                    key={preset.name}
                    variant="outline"
                    className="cursor-pointer hover:bg-accent"
                    onClick={() => applyPresetToScenario(scenario.id, preset.input)}
                  >
                    {preset.name}
                  </Badge>
                ))}
              </div>
            </CardHeader>
            <CardContent>
              <CalculatorFields
                form={scenario.values}
                onChange={(field, value) => updateScenarioField(scenario.id, field, value)}
                idPrefix={`scenario-${scenario.id}`}
              />
            </CardContent>
          </Card>
        ))}
      </div>

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      <div className="flex gap-2">
        {scenarios.length < MAX_SCENARIOS && (
          <Button variant="outline" onClick={addScenario}>
            <Plus className="mr-2 h-4 w-4" />
            Add Scenario
          </Button>
        )}
        <Button onClick={handleCompare} disabled={isPending}>
          <Calculator className="mr-2 h-4 w-4" />
          {isPending ? 'Comparing...' : 'Compare'}
        </Button>
        <Button variant="outline" onClick={handleReset}>
          Clear All
        </Button>
      </div>

      {comparison && (
        <div className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
            {comparison.scenarios.map((calc, index) => (
              <CalculatorResultCard
                key={scenarios[index]?.id ?? index}
                result={calc}
                label={scenarios[index]?.name ?? `Scenario ${index + 1}`}
                highlight={
                  index === comparison.bestIndex
                    ? 'best'
                    : index === comparison.worstIndex
                      ? 'worst'
                      : null
                }
              />
            ))}
          </div>
          {comparison.savingsVsWorst > 0 && (
            <Card>
              <CardContent className="py-4">
                <p className="text-sm">
                  <span className="font-semibold text-green-600">
                    {scenarios[comparison.bestIndex]?.name ?? 'Best scenario'}
                  </span>
                  {' '}saves you{' '}
                  <span className="font-bold">
                    R${comparison.savingsVsWorst.toFixed(2)}
                  </span>
                  {' '}compared to{' '}
                  <span className="font-semibold text-red-600">
                    {scenarios[comparison.worstIndex]?.name ?? 'worst scenario'}
                  </span>
                  {' '}for the same amount of miles.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
