'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  ALERT_CHANNELS,
  ALERT_CHANNEL_LABELS,
  PROMO_TYPES,
  PROMO_TYPE_LABELS,
  type AlertChannelValue,
  type PromoTypeValue,
} from '@/lib/validators/alert-config.schema';

export interface AlertConfigFormValues {
  name: string;
  channels: AlertChannelValue[];
  programNames: string;
  promoTypes: PromoTypeValue[];
  minBonusPercent: string;
  maxCostPerMilheiro: string;
  telegramChatId: string;
}

export const EMPTY_FORM_VALUES: AlertConfigFormValues = {
  name: '',
  channels: ['IN_APP'],
  programNames: '',
  promoTypes: [],
  minBonusPercent: '',
  maxCostPerMilheiro: '',
  telegramChatId: '',
};

interface AlertConfigFormFieldsProps {
  values: AlertConfigFormValues;
  onChange: (values: AlertConfigFormValues) => void;
  idPrefix?: string;
  canUseTelegram?: boolean;
}

function toggleArrayItem<T>(arr: T[], item: T): T[] {
  return arr.includes(item) ? arr.filter((x) => x !== item) : [...arr, item];
}

export function AlertConfigFormFields({
  values,
  onChange,
  idPrefix = '',
  canUseTelegram = true,
}: AlertConfigFormFieldsProps) {
  const availableChannels = canUseTelegram
    ? ALERT_CHANNELS
    : ALERT_CHANNELS.filter((channel) => channel !== 'TELEGRAM');

  return (
    <>
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}name`}>Rule Name</Label>
        <Input
          id={`${idPrefix}name`}
          value={values.name}
          onChange={(e) => onChange({ ...values, name: e.target.value })}
          placeholder="e.g., Smiles transfer > 80%"
        />
      </div>

      <div className="space-y-2">
        <Label>Notification Channels</Label>
        <div className="grid grid-cols-2 gap-2">
          {availableChannels.map((channel) => (
            <div key={channel} className="flex items-center gap-2">
              <Checkbox
                id={`${idPrefix}channel-${channel}`}
                checked={values.channels.includes(channel)}
                onCheckedChange={() =>
                  onChange({ ...values, channels: toggleArrayItem(values.channels, channel) })
                }
              />
              <Label
                htmlFor={`${idPrefix}channel-${channel}`}
                className="font-normal cursor-pointer"
              >
                {ALERT_CHANNEL_LABELS[channel]}
              </Label>
            </div>
          ))}
        </div>
        {!canUseTelegram && (
          <p className="text-xs text-muted-foreground">
            Telegram notifications are available on MilesControl Premium.
          </p>
        )}
      </div>

      {values.channels.includes('TELEGRAM') && (
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}telegramChatId`}>Telegram Chat ID</Label>
          <Input
            id={`${idPrefix}telegramChatId`}
            value={values.telegramChatId}
            onChange={(e) => onChange({ ...values, telegramChatId: e.target.value })}
            placeholder="e.g., 123456789"
          />
          <p className="text-xs text-muted-foreground">
            Start a chat with the bot and run /start to get your chat ID.
          </p>
        </div>
      )}

      <div className="space-y-2">
        <Label>Promotion Types (leave empty for all types)</Label>
        <div className="grid grid-cols-2 gap-2">
          {PROMO_TYPES.map((type) => (
            <div key={type} className="flex items-center gap-2">
              <Checkbox
                id={`${idPrefix}type-${type}`}
                checked={values.promoTypes.includes(type)}
                onCheckedChange={() =>
                  onChange({ ...values, promoTypes: toggleArrayItem(values.promoTypes, type) })
                }
              />
              <Label
                htmlFor={`${idPrefix}type-${type}`}
                className="font-normal cursor-pointer"
              >
                {PROMO_TYPE_LABELS[type]}
              </Label>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}programNames`}>
          Programs (optional, comma-separated)
        </Label>
        <Input
          id={`${idPrefix}programNames`}
          value={values.programNames}
          onChange={(e) => onChange({ ...values, programNames: e.target.value })}
          placeholder="e.g., Smiles, Latam Pass (leave empty for all)"
        />
        <p className="text-xs text-muted-foreground">
          Leave empty to receive alerts for all programs.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}minBonusPercent`}>Min Bonus % (optional)</Label>
          <Input
            id={`${idPrefix}minBonusPercent`}
            type="number"
            min="0"
            max="1000"
            step="1"
            value={values.minBonusPercent}
            onChange={(e) => onChange({ ...values, minBonusPercent: e.target.value })}
            placeholder="e.g., 80"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}maxCostPerMilheiro`}>
            Max Cost/milheiro R$ (optional)
          </Label>
          <Input
            id={`${idPrefix}maxCostPerMilheiro`}
            type="number"
            min="0"
            max="1000"
            step="0.01"
            value={values.maxCostPerMilheiro}
            onChange={(e) => onChange({ ...values, maxCostPerMilheiro: e.target.value })}
            placeholder="e.g., 15"
          />
        </div>
      </div>
    </>
  );
}

export function parseAlertConfigForm(
  values: AlertConfigFormValues,
  options: { canUseTelegram?: boolean } = {},
):
  | {
      valid: true;
      data: {
        name: string;
        channels: AlertChannelValue[];
        programNames: string[];
        promoTypes: PromoTypeValue[];
        minBonusPercent: number | null;
        maxCostPerMilheiro: number | null;
        telegramChatId: string | null;
      };
    }
  | { valid: false; error: string } {
  const canUseTelegram = options.canUseTelegram ?? true;

  if (!values.name.trim()) {
    return { valid: false, error: 'Rule name is required' };
  }

  if (values.channels.length === 0) {
    return { valid: false, error: 'At least one notification channel is required' };
  }

  if (!canUseTelegram && values.channels.includes('TELEGRAM')) {
    return { valid: false, error: 'Telegram alerts are available on MilesControl Premium.' };
  }

  if (values.channels.includes('TELEGRAM') && !values.telegramChatId.trim()) {
    return { valid: false, error: 'Telegram Chat ID is required when Telegram channel is selected' };
  }

  const minBonus = values.minBonusPercent
    ? parseFloat(values.minBonusPercent)
    : null;

  if (minBonus !== null && Number.isNaN(minBonus)) {
    return { valid: false, error: 'Min bonus % must be a valid number' };
  }

  const maxCost = values.maxCostPerMilheiro
    ? parseFloat(values.maxCostPerMilheiro)
    : null;

  if (maxCost !== null && Number.isNaN(maxCost)) {
    return { valid: false, error: 'Max cost/milheiro must be a valid number' };
  }

  const programNames = values.programNames
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  return {
    valid: true,
    data: {
      name: values.name.trim(),
      channels: values.channels,
      programNames,
      promoTypes: values.promoTypes,
      minBonusPercent: minBonus,
      maxCostPerMilheiro: maxCost,
      telegramChatId: values.telegramChatId.trim() || null,
    },
  };
}

export function isAlertConfigFormComplete(values: AlertConfigFormValues): boolean {
  return !!(values.name.trim() && values.channels.length > 0);
}
