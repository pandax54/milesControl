import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import type { FlightWatchlist } from '@/generated/prisma/client';
import { searchFlights } from './flight-search.service';
import type {
  CreateWatchlistItemInput,
  UpdateWatchlistItemInput,
} from '@/lib/validators/watchlist.schema';

// Re-export the Prisma type as canonical watchlist item type
export type WatchlistItem = FlightWatchlist;

// ==================== Error classes ====================

export class WatchlistItemNotFoundError extends Error {
  constructor(watchlistId: string) {
    super(`Watchlist item not found: ${watchlistId}`);
    this.name = 'WatchlistItemNotFoundError';
  }
}

// ==================== Types ====================

export interface WatchlistCheckResult {
  readonly watchlistId: string;
  readonly userId: string;
  readonly alertsCreated: number;
  readonly milesAlertTriggered: boolean;
  readonly cashAlertTriggered: boolean;
}

// ==================== Queries ====================

export async function listWatchlistItems(userId: string): Promise<WatchlistItem[]> {
  return prisma.flightWatchlist.findMany({
    where: { userId },
    orderBy: [{ isActive: 'desc' }, { createdAt: 'desc' }],
  });
}

export async function listActiveWatchlistItems(): Promise<WatchlistItem[]> {
  return prisma.flightWatchlist.findMany({
    where: { isActive: true },
    orderBy: { lastCheckedAt: 'asc' },
  });
}

export async function getWatchlistItem(
  userId: string,
  watchlistId: string,
): Promise<WatchlistItem> {
  const item = await prisma.flightWatchlist.findFirst({
    where: { id: watchlistId, userId },
  });

  if (!item) {
    throw new WatchlistItemNotFoundError(watchlistId);
  }

  return item;
}

// ==================== Mutations ====================

export async function createWatchlistItem(
  userId: string,
  input: CreateWatchlistItemInput,
): Promise<WatchlistItem> {
  const item = await prisma.flightWatchlist.create({
    data: {
      userId,
      origin: input.origin,
      destination: input.destination,
      earliestDate: input.earliestDate ? new Date(input.earliestDate) : null,
      latestDate: input.latestDate ? new Date(input.latestDate) : null,
      cabinClass: input.cabinClass,
      passengers: input.passengers,
      targetMilesPrice: input.targetMilesPrice ?? null,
      targetCashPrice: input.targetCashPrice ?? null,
      preferredProgram: input.preferredProgram ?? null,
    },
  });

  logger.info(
    {
      userId,
      watchlistId: item.id,
      origin: item.origin,
      destination: item.destination,
    },
    'Watchlist item created',
  );

  return item;
}

export async function updateWatchlistItem(
  userId: string,
  input: UpdateWatchlistItemInput,
): Promise<WatchlistItem> {
  const existing = await prisma.flightWatchlist.findFirst({
    where: { id: input.watchlistId, userId },
  });

  if (!existing) {
    throw new WatchlistItemNotFoundError(input.watchlistId);
  }

  const updated = await prisma.flightWatchlist.update({
    where: { id: input.watchlistId },
    data: {
      ...(input.origin !== undefined && { origin: input.origin }),
      ...(input.destination !== undefined && { destination: input.destination }),
      ...(input.earliestDate !== undefined && {
        earliestDate: input.earliestDate ? new Date(input.earliestDate) : null,
      }),
      ...(input.latestDate !== undefined && {
        latestDate: input.latestDate ? new Date(input.latestDate) : null,
      }),
      ...(input.cabinClass !== undefined && { cabinClass: input.cabinClass }),
      ...(input.passengers !== undefined && { passengers: input.passengers }),
      ...(input.targetMilesPrice !== undefined && {
        targetMilesPrice: input.targetMilesPrice,
      }),
      ...(input.targetCashPrice !== undefined && {
        targetCashPrice: input.targetCashPrice,
      }),
      ...(input.preferredProgram !== undefined && {
        preferredProgram: input.preferredProgram,
      }),
    },
  });

  logger.info({ userId, watchlistId: input.watchlistId }, 'Watchlist item updated');

  return updated;
}

export async function toggleWatchlistItem(
  userId: string,
  watchlistId: string,
  isActive: boolean,
): Promise<WatchlistItem> {
  const existing = await prisma.flightWatchlist.findFirst({
    where: { id: watchlistId, userId },
  });

  if (!existing) {
    throw new WatchlistItemNotFoundError(watchlistId);
  }

  const updated = await prisma.flightWatchlist.update({
    where: { id: watchlistId },
    data: { isActive },
  });

  logger.info({ userId, watchlistId, isActive }, 'Watchlist item toggled');

  return updated;
}

export async function deleteWatchlistItem(
  userId: string,
  watchlistId: string,
): Promise<void> {
  const existing = await prisma.flightWatchlist.findFirst({
    where: { id: watchlistId, userId },
  });

  if (!existing) {
    throw new WatchlistItemNotFoundError(watchlistId);
  }

  await prisma.flightWatchlist.delete({
    where: { id: watchlistId },
  });

  logger.info({ userId, watchlistId }, 'Watchlist item deleted');
}

// ==================== Price checking ====================

/**
 * Checks a single watchlist item against current flight prices.
 * Creates IN_APP notifications when prices are at or below the targets.
 * Updates lastCheckedAt regardless of whether alerts were triggered.
 *
 * PRD F4.6: System monitors watchlist routes and alerts when prices drop below target.
 */
export async function checkWatchlistItemPrices(
  item: WatchlistItem,
): Promise<WatchlistCheckResult> {
  const departureDate = resolveDepartureDate(item);

  if (!departureDate) {
    logger.warn(
      { watchlistId: item.id, userId: item.userId },
      'No valid future date for watchlist check — skipping',
    );
    await prisma.flightWatchlist.update({
      where: { id: item.id },
      data: { lastCheckedAt: new Date() },
    });
    return {
      watchlistId: item.id,
      userId: item.userId,
      alertsCreated: 0,
      milesAlertTriggered: false,
      cashAlertTriggered: false,
    };
  }

  let milesAlertTriggered = false;
  let cashAlertTriggered = false;
  let alertsCreated = 0;

  try {
    const result = await searchFlights({
      origin: item.origin,
      destination: item.destination,
      departureDate,
      passengers: item.passengers,
      cabinClass: item.cabinClass as 'ECONOMY' | 'PREMIUM_ECONOMY' | 'BUSINESS' | 'FIRST',
    });

    // Check miles target
    if (item.targetMilesPrice != null) {
      const targetMiles = item.targetMilesPrice;
      const matchingAwardFlight = result.awardFlights.find((flight) => {
        if (item.preferredProgram != null) {
          return (
            flight.milesRequired <= targetMiles &&
            flight.program.toLowerCase().includes(item.preferredProgram.toLowerCase())
          );
        }
        return flight.milesRequired <= targetMiles;
      });

      if (matchingAwardFlight) {
        milesAlertTriggered = true;
        await createWatchlistNotification({
          userId: item.userId,
          origin: item.origin,
          destination: item.destination,
          alertType: 'miles',
          value: matchingAwardFlight.milesRequired,
          target: targetMiles,
          program: matchingAwardFlight.program,
        });
        alertsCreated++;
      }
    }

    // Check cash price target
    if (item.targetCashPrice != null) {
      const targetCash = Number(item.targetCashPrice);
      const matchingCashFlight = result.cashFlights.find(
        (flight) => flight.price <= targetCash,
      );

      if (matchingCashFlight) {
        cashAlertTriggered = true;
        await createWatchlistNotification({
          userId: item.userId,
          origin: item.origin,
          destination: item.destination,
          alertType: 'cash',
          value: matchingCashFlight.price,
          target: targetCash,
        });
        alertsCreated++;
      }
    }

    logger.info(
      {
        watchlistId: item.id,
        userId: item.userId,
        alertsCreated,
        milesAlertTriggered,
        cashAlertTriggered,
      },
      'Watchlist item price check completed',
    );
  } catch (error) {
    logger.error({ err: error, watchlistId: item.id, userId: item.userId }, 'Watchlist price check failed');
  }

  await prisma.flightWatchlist.update({
    where: { id: item.id },
    data: { lastCheckedAt: new Date() },
  });

  return {
    watchlistId: item.id,
    userId: item.userId,
    alertsCreated,
    milesAlertTriggered,
    cashAlertTriggered,
  };
}

// ==================== Helpers ====================

function resolveDepartureDate(item: WatchlistItem): string | null {
  const today = new Date().toISOString().split('T')[0];

  if (item.earliestDate) {
    const earliest = item.earliestDate.toISOString().split('T')[0];
    if (earliest >= today) {
      return earliest;
    }
  }

  if (item.latestDate) {
    const latest = item.latestDate.toISOString().split('T')[0];
    if (latest >= today) {
      return latest;
    }
  }

  return null;
}

interface WatchlistNotificationParams {
  readonly userId: string;
  readonly origin: string;
  readonly destination: string;
  readonly alertType: 'miles' | 'cash';
  readonly value: number;
  readonly target: number;
  readonly program?: string;
}

async function createWatchlistNotification(
  params: WatchlistNotificationParams,
): Promise<void> {
  const { userId, origin, destination, alertType, value, target, program } = params;

  const title =
    alertType === 'miles'
      ? `Miles price alert: ${origin} → ${destination}`
      : `Cash price alert: ${origin} → ${destination}`;

  const body =
    alertType === 'miles'
      ? `${program ? `[${program}] ` : ''}${value.toLocaleString('pt-BR')} miles — below your target of ${target.toLocaleString('pt-BR')} miles`
      : `R$${value.toFixed(2)} — below your target of R$${target.toFixed(2)}`;

  await prisma.notification.create({
    data: {
      userId,
      title,
      body,
      channel: 'IN_APP',
    },
  });

  logger.info({ userId, origin, destination, alertType, value, target }, 'Watchlist price alert created');
}
