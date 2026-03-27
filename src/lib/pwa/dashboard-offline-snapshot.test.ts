import { describe, expect, it } from 'vitest';
import {
  createDashboardOfflineSnapshot,
  parseDashboardOfflineSnapshot,
  serializeDashboardOfflineSnapshot,
} from './dashboard-offline-snapshot';

describe('dashboard-offline-snapshot', () => {
  it('should create a serializable offline snapshot from dashboard data', () => {
    const snapshot = createDashboardOfflineSnapshot(
      {
        totalMiles: 32000,
        totalPoints: 18000,
        activeSubscriptionCount: 2,
        staleEnrollmentCount: 1,
        projection: {
          months: [],
          totalProjectedMiles: 12000,
          balanceAt3Months: 38000,
          balanceAt6Months: 44000,
          balanceAt12Months: 56000,
        },
        enrollments: [
          {
            id: 'enr-1',
            currentBalance: 32000,
            balanceUpdatedAt: new Date('2026-03-20T12:00:00.000Z'),
            expirationDate: new Date('2026-12-01T00:00:00.000Z'),
            tier: 'Gold',
            memberNumber: '123',
            stalenessLevel: 'warning',
            program: {
              id: 'smiles',
              name: 'Smiles',
              type: 'AIRLINE',
              currency: 'miles',
              website: 'https://smiles.com.br',
            },
          },
        ],
        activeSubscriptions: [
          {
            id: 'sub-1',
            status: 'ACTIVE',
            monthlyCost: 42.9,
            nextBillingDate: new Date('2026-04-01T00:00:00.000Z'),
            clubTier: {
              name: 'Clube Smiles 1.000',
              program: {
                name: 'Smiles',
                currency: 'miles',
              },
            },
          },
        ],
        recentTransfers: [
          {
            id: 'tx-1',
            sourceProgramName: 'Livelo',
            destProgramName: 'Smiles',
            pointsTransferred: 10000,
            bonusPercent: 80,
            milesReceived: 18000,
            totalCost: 250,
            costPerMilheiro: 13.89,
            transferDate: new Date('2026-03-18T09:00:00.000Z'),
          },
        ],
      },
      new Date('2026-03-27T00:00:00.000Z'),
    );

    expect(snapshot).toEqual({
      capturedAt: '2026-03-27T00:00:00.000Z',
      totalMiles: 32000,
      totalPoints: 18000,
      activeSubscriptionCount: 2,
      staleEnrollmentCount: 1,
      enrollments: [
        {
          id: 'enr-1',
          currentBalance: 32000,
          balanceUpdatedAt: '2026-03-20T12:00:00.000Z',
          expirationDate: '2026-12-01T00:00:00.000Z',
          tier: 'Gold',
          stalenessLevel: 'warning',
          program: {
            id: 'smiles',
            name: 'Smiles',
            type: 'AIRLINE',
            currency: 'miles',
            website: 'https://smiles.com.br',
          },
        },
      ],
      subscriptions: [
        {
          id: 'sub-1',
          status: 'ACTIVE',
          monthlyCost: 42.9,
          nextBillingDate: '2026-04-01T00:00:00.000Z',
          clubTier: {
            name: 'Clube Smiles 1.000',
            program: {
              name: 'Smiles',
              currency: 'miles',
            },
          },
        },
      ],
      transfers: [
        {
          id: 'tx-1',
          sourceProgramName: 'Livelo',
          destProgramName: 'Smiles',
          pointsTransferred: 10000,
          bonusPercent: 80,
          milesReceived: 18000,
          totalCost: 250,
          costPerMilheiro: 13.89,
          transferDate: '2026-03-18T09:00:00.000Z',
        },
      ],
      projection: {
        totalProjectedMiles: 12000,
        balanceAt3Months: 38000,
        balanceAt6Months: 44000,
        balanceAt12Months: 56000,
      },
    });
  });

  it('should parse a serialized offline snapshot', () => {
    const serialized = JSON.stringify({
      capturedAt: '2026-03-27T00:00:00.000Z',
      totalMiles: 32000,
      totalPoints: 18000,
      activeSubscriptionCount: 2,
      staleEnrollmentCount: 1,
      enrollments: [],
      subscriptions: [],
      transfers: [],
      projection: {
        totalProjectedMiles: 12000,
        balanceAt3Months: 38000,
        balanceAt6Months: 44000,
        balanceAt12Months: 56000,
      },
    });

    expect(parseDashboardOfflineSnapshot(serialized)).toEqual({
      capturedAt: '2026-03-27T00:00:00.000Z',
      totalMiles: 32000,
      totalPoints: 18000,
      activeSubscriptionCount: 2,
      staleEnrollmentCount: 1,
      enrollments: [],
      subscriptions: [],
      transfers: [],
      projection: {
        totalProjectedMiles: 12000,
        balanceAt3Months: 38000,
        balanceAt6Months: 44000,
        balanceAt12Months: 56000,
      },
    });
  });

  it('should return null when the serialized snapshot is invalid', () => {
    expect(parseDashboardOfflineSnapshot('not-json')).toBeNull();
    expect(
      serializeDashboardOfflineSnapshot(
        createDashboardOfflineSnapshot({
          totalMiles: 0,
          totalPoints: 0,
          activeSubscriptionCount: 0,
          staleEnrollmentCount: 0,
          projection: {
            months: [],
            totalProjectedMiles: 0,
            balanceAt3Months: 0,
            balanceAt6Months: 0,
            balanceAt12Months: 0,
          },
          enrollments: [],
          activeSubscriptions: [],
          recentTransfers: [],
        }),
      ),
    ).toContain('"capturedAt"');
  });
});
