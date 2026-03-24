import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { listAlertConfigs } from '@/lib/services/alert-config.service';
import { AlertConfigFormDialog } from '@/components/alerts/alert-config-form-dialog';
import { AlertConfigCard } from '@/components/alerts/alert-config-card';
import type { AlertChannelValue, PromoTypeValue } from '@/lib/validators/alert-config.schema';

function decimalToNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return value;
  const num = Number(value);
  return Number.isNaN(num) ? null : num;
}

export default async function AlertsPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/login');
  }

  const alertConfigs = await listAlertConfigs(session.user.id);

  const activeConfigs = alertConfigs.filter((c) => c.isActive);
  const pausedConfigs = alertConfigs.filter((c) => !c.isActive);
  const hasConfigs = alertConfigs.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Alert Rules</h1>
          <p className="text-muted-foreground">
            Configure when and how you receive promotion alerts.
          </p>
        </div>
        {hasConfigs && <AlertConfigFormDialog />}
      </div>

      {!hasConfigs ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12">
          <p className="text-lg font-medium">No alert rules configured</p>
          <p className="text-sm text-muted-foreground">
            Create your first rule to receive notifications when promotions match your criteria.
          </p>
          <div className="mt-4">
            <AlertConfigFormDialog />
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          {activeConfigs.length > 0 && (
            <section>
              <h2 className="mb-4 text-xl font-semibold">Active Rules</h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {activeConfigs.map((config) => (
                  <AlertConfigCard
                    key={config.id}
                    alertConfig={{
                      id: config.id,
                      name: config.name,
                      isActive: config.isActive,
                      channels: config.channels as AlertChannelValue[],
                      programNames: config.programNames,
                      promoTypes: config.promoTypes as PromoTypeValue[],
                      minBonusPercent: config.minBonusPercent,
                      maxCostPerMilheiro: decimalToNumber(config.maxCostPerMilheiro),
                      telegramChatId: config.telegramChatId,
                    }}
                  />
                ))}
              </div>
            </section>
          )}

          {pausedConfigs.length > 0 && (
            <section>
              <h2 className="mb-4 text-xl font-semibold text-muted-foreground">Paused Rules</h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {pausedConfigs.map((config) => (
                  <AlertConfigCard
                    key={config.id}
                    alertConfig={{
                      id: config.id,
                      name: config.name,
                      isActive: config.isActive,
                      channels: config.channels as AlertChannelValue[],
                      programNames: config.programNames,
                      promoTypes: config.promoTypes as PromoTypeValue[],
                      minBonusPercent: config.minBonusPercent,
                      maxCostPerMilheiro: decimalToNumber(config.maxCostPerMilheiro),
                      telegramChatId: config.telegramChatId,
                    }}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
