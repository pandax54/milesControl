import { render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Session } from 'next-auth';

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  redirect: vi.fn().mockImplementation((url: string) => {
    throw new Error(`NEXT_REDIRECT: ${url}`);
  }),
}));

vi.mock('@/lib/services/transfer.service', () => ({
  listTransfers: vi.fn(),
  getUserAverageCostPerMilheiro: vi.fn(),
}));

vi.mock('@/lib/services/program-enrollment.service', () => ({
  listPrograms: vi.fn(),
}));

vi.mock('@/components/dashboard/transfer-form-dialog', () => ({
  TransferFormDialog: () => <button>Log Transfer</button>,
}));

vi.mock('@/components/dashboard/edit-transfer-dialog', () => ({
  EditTransferDialog: () => <button>Edit</button>,
}));

vi.mock('@/components/dashboard/delete-transfer-button', () => ({
  DeleteTransferButton: () => <button>Delete</button>,
}));

import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { listTransfers, getUserAverageCostPerMilheiro } from '@/lib/services/transfer.service';
import { listPrograms } from '@/lib/services/program-enrollment.service';
import TransfersPage from './page';

const mockAuth = auth as unknown as ReturnType<typeof vi.fn<() => Promise<Session | null>>>;
const mockRedirect = vi.mocked(redirect);
const mockListTransfers = vi.mocked(listTransfers);
const mockGetUserAverageCostPerMilheiro = vi.mocked(getUserAverageCostPerMilheiro);
const mockListPrograms = vi.mocked(listPrograms);

const MOCK_SESSION: Session = {
  user: { id: 'user-123', email: 'test@example.com', role: 'USER' },
  expires: '2026-12-31',
};

const MOCK_PROGRAMS = [
  { id: 'prog-1', name: 'Livelo', type: 'POINTS', currency: 'BRL', logoUrl: null, website: null },
  { id: 'prog-2', name: 'Smiles', type: 'MILES', currency: 'BRL', logoUrl: null, website: null },
] as unknown as Awaited<ReturnType<typeof listPrograms>>;

function buildMockTransfer(
  overrides: Partial<{
    id: string;
    sourceProgramName: string;
    destProgramName: string;
    pointsTransferred: number;
    bonusPercent: number;
    milesReceived: number;
    totalCost: number | null;
    costPerMilheiro: number | null;
    promotionId: string | null;
    notes: string | null;
    transferDate: Date;
    userId: string;
    createdAt: Date;
    updatedAt: Date;
  }> = {},
) {
  const base = {
    id: 'transfer-1',
    sourceProgramName: 'Livelo',
    destProgramName: 'Smiles',
    pointsTransferred: 10000,
    bonusPercent: 0,
    milesReceived: 10000,
    totalCost: null,
    costPerMilheiro: null,
    promotionId: null,
    notes: null,
    transferDate: new Date('2026-01-15'),
    userId: 'user-123',
    createdAt: new Date('2026-01-15'),
    updatedAt: new Date('2026-01-15'),
    ...overrides,
  };

  return {
    ...base,
    totalCost: base.totalCost !== null ? { toNumber: () => base.totalCost as number, toString: () => String(base.totalCost) } : null,
    costPerMilheiro: base.costPerMilheiro !== null ? { toNumber: () => base.costPerMilheiro as number, toString: () => String(base.costPerMilheiro) } : null,
  } as unknown as Awaited<ReturnType<typeof listTransfers>>[number];
}

async function renderPage() {
  const jsx = await TransfersPage();
  return render(jsx);
}

describe('TransfersPage — BRL values and net value badges', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue(MOCK_SESSION);
    mockListPrograms.mockResolvedValue(MOCK_PROGRAMS);
    mockListTransfers.mockResolvedValue([]);
    mockGetUserAverageCostPerMilheiro.mockResolvedValue(null);
  });

  it('should redirect to login when not authenticated', async () => {
    mockAuth.mockResolvedValue(null);

    await expect(TransfersPage()).rejects.toThrow('NEXT_REDIRECT: /login');
    expect(mockRedirect).toHaveBeenCalledWith('/login');
  });

  it('should render empty state when there are no transfers', async () => {
    mockListTransfers.mockResolvedValue([]);

    await renderPage();

    expect(screen.getByText('No transfers yet')).toBeInTheDocument();
    expect(mockGetUserAverageCostPerMilheiro).not.toHaveBeenCalled();
  });

  it('should display BRL value for source miles when source CPM is available', async () => {
    mockListTransfers.mockResolvedValue([
      buildMockTransfer({ sourceProgramName: 'Livelo', destProgramName: 'Smiles', pointsTransferred: 10000 }),
    ]);
    mockGetUserAverageCostPerMilheiro.mockImplementation(async (_userId, program) => {
      if (program === 'Livelo') return 15;
      return null;
    });

    await renderPage();

    // 10000 miles × R$15/k / 1000 = R$150
    const sourceCell = screen.getByLabelText('Source BRL value');
    expect(sourceCell).toBeInTheDocument();
    expect(sourceCell.textContent).toMatch(/~R\$.*150/);
  });

  it('should display BRL value for destination miles when destination CPM is available', async () => {
    mockListTransfers.mockResolvedValue([
      buildMockTransfer({ sourceProgramName: 'Livelo', destProgramName: 'Smiles', milesReceived: 19000 }),
    ]);
    mockGetUserAverageCostPerMilheiro.mockImplementation(async (_userId, program) => {
      if (program === 'Smiles') return 12;
      return null;
    });

    await renderPage();

    // 19000 miles × R$12/k / 1000 = R$228
    const destCell = screen.getByLabelText('Destination BRL value');
    expect(destCell).toBeInTheDocument();
    expect(destCell.textContent).toMatch(/~R\$.*228/);
  });

  it('should show "Sem dados" placeholder when source program has no CPM', async () => {
    mockListTransfers.mockResolvedValue([
      buildMockTransfer({ sourceProgramName: 'Livelo', destProgramName: 'Smiles' }),
    ]);
    mockGetUserAverageCostPerMilheiro.mockImplementation(async (_userId, program) => {
      if (program === 'Smiles') return 12;
      return null;
    });

    await renderPage();

    expect(screen.getByLabelText('Source BRL value')).toHaveTextContent('Sem dados');
  });

  it('should show "Sem dados" placeholder when destination program has no CPM', async () => {
    mockListTransfers.mockResolvedValue([
      buildMockTransfer({ sourceProgramName: 'Livelo', destProgramName: 'Smiles' }),
    ]);
    mockGetUserAverageCostPerMilheiro.mockImplementation(async (_userId, program) => {
      if (program === 'Livelo') return 15;
      return null;
    });

    await renderPage();

    expect(screen.getByLabelText('Destination BRL value')).toHaveTextContent('Sem dados');
  });

  it('should display a positive net value badge when destination BRL is >5% greater than source', async () => {
    // sourceBrl = 10000 * 10 / 1000 = 100, destBrl = 10000 * 12 / 1000 = 120 → +20% → positive
    mockListTransfers.mockResolvedValue([
      buildMockTransfer({
        sourceProgramName: 'Livelo',
        destProgramName: 'Smiles',
        pointsTransferred: 10000,
        milesReceived: 10000,
      }),
    ]);
    mockGetUserAverageCostPerMilheiro.mockImplementation(async (_userId, program) => {
      if (program === 'Livelo') return 10;
      if (program === 'Smiles') return 12;
      return null;
    });

    await renderPage();

    const badge = screen.getByLabelText(/transfer net value: positive/i);
    expect(badge).toBeInTheDocument();
  });

  it('should display a negative net value badge when destination BRL is >5% less than source', async () => {
    // sourceBrl = 10000 * 15 / 1000 = 150, destBrl = 10000 * 12 / 1000 = 120 → -20% → negative
    mockListTransfers.mockResolvedValue([
      buildMockTransfer({
        sourceProgramName: 'Livelo',
        destProgramName: 'Smiles',
        pointsTransferred: 10000,
        milesReceived: 10000,
      }),
    ]);
    mockGetUserAverageCostPerMilheiro.mockImplementation(async (_userId, program) => {
      if (program === 'Livelo') return 15;
      if (program === 'Smiles') return 12;
      return null;
    });

    await renderPage();

    const badge = screen.getByLabelText(/transfer net value: negative/i);
    expect(badge).toBeInTheDocument();
  });

  it('should display a neutral net value badge when difference is within ±5%', async () => {
    // sourceBrl = 10000 * 10 / 1000 = 100, destBrl = 10000 * 10.2 / 1000 = 102 → +2% → neutral
    mockListTransfers.mockResolvedValue([
      buildMockTransfer({
        sourceProgramName: 'Livelo',
        destProgramName: 'Smiles',
        pointsTransferred: 10000,
        milesReceived: 10000,
      }),
    ]);
    mockGetUserAverageCostPerMilheiro.mockImplementation(async (_userId, program) => {
      if (program === 'Livelo') return 10;
      if (program === 'Smiles') return 10.2;
      return null;
    });

    await renderPage();

    const badge = screen.getByLabelText(/transfer net value: neutral/i);
    expect(badge).toBeInTheDocument();
  });

  it('should not display a net value badge when either CPM is null', async () => {
    mockListTransfers.mockResolvedValue([
      buildMockTransfer({ sourceProgramName: 'Livelo', destProgramName: 'Smiles' }),
    ]);
    mockGetUserAverageCostPerMilheiro.mockImplementation(async (_userId, program) => {
      if (program === 'Livelo') return 15;
      return null;
    });

    await renderPage();

    expect(screen.queryByLabelText(/transfer net value/i)).not.toBeInTheDocument();
  });

  it('should fetch CPM once per unique program (deduplicated)', async () => {
    mockListTransfers.mockResolvedValue([
      buildMockTransfer({ id: 't-1', sourceProgramName: 'Livelo', destProgramName: 'Smiles' }),
      buildMockTransfer({ id: 't-2', sourceProgramName: 'Livelo', destProgramName: 'Smiles' }),
      buildMockTransfer({ id: 't-3', sourceProgramName: 'Smiles', destProgramName: 'Livelo' }),
    ]);
    mockGetUserAverageCostPerMilheiro.mockResolvedValue(15);

    await renderPage();

    // 2 unique programs: Livelo and Smiles → exactly 2 CPM calls
    expect(mockGetUserAverageCostPerMilheiro).toHaveBeenCalledTimes(2);
    expect(mockGetUserAverageCostPerMilheiro).toHaveBeenCalledWith('user-123', 'Livelo');
    expect(mockGetUserAverageCostPerMilheiro).toHaveBeenCalledWith('user-123', 'Smiles');
  });

  it('should display BRL values for multiple rows using the same CPM per program', async () => {
    mockListTransfers.mockResolvedValue([
      buildMockTransfer({
        id: 't-1',
        sourceProgramName: 'Livelo',
        destProgramName: 'Smiles',
        pointsTransferred: 5000,
        milesReceived: 5000,
      }),
      buildMockTransfer({
        id: 't-2',
        sourceProgramName: 'Livelo',
        destProgramName: 'Smiles',
        pointsTransferred: 10000,
        milesReceived: 10000,
      }),
    ]);
    mockGetUserAverageCostPerMilheiro.mockImplementation(async (_userId, program) => {
      if (program === 'Livelo') return 10;
      if (program === 'Smiles') return 12;
      return null;
    });

    await renderPage();

    // Row 1: source = 5000*10/1000 = R$50, dest = 5000*12/1000 = R$60
    // Row 2: source = 10000*10/1000 = R$100, dest = 10000*12/1000 = R$120
    const sourceBrlCells = screen.getAllByLabelText('Source BRL value');
    const destBrlCells = screen.getAllByLabelText('Destination BRL value');

    expect(sourceBrlCells).toHaveLength(2);
    expect(destBrlCells).toHaveLength(2);
    expect(sourceBrlCells[0].textContent).toMatch(/~R\$.*50/);
    expect(sourceBrlCells[1].textContent).toMatch(/~R\$.*100/);
    expect(destBrlCells[0].textContent).toMatch(/~R\$.*60/);
    expect(destBrlCells[1].textContent).toMatch(/~R\$.*120/);
  });

  it('should show the Net Value column header in the table', async () => {
    mockListTransfers.mockResolvedValue([buildMockTransfer()]);
    mockGetUserAverageCostPerMilheiro.mockResolvedValue(15);

    await renderPage();

    expect(screen.getByRole('columnheader', { name: 'Net Value' })).toBeInTheDocument();
  });

  it('should preserve existing table columns', async () => {
    mockListTransfers.mockResolvedValue([buildMockTransfer()]);
    mockGetUserAverageCostPerMilheiro.mockResolvedValue(15);

    await renderPage();

    expect(screen.getByRole('columnheader', { name: 'Transfer' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Points' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Received' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Bonus' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Cost' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'R$/k' })).toBeInTheDocument();
  });

  it('should display source and destination program names in each row', async () => {
    mockListTransfers.mockResolvedValue([
      buildMockTransfer({ sourceProgramName: 'Livelo', destProgramName: 'Smiles' }),
    ]);
    mockGetUserAverageCostPerMilheiro.mockResolvedValue(null);

    await renderPage();

    expect(screen.getByText('Livelo')).toBeInTheDocument();
    expect(screen.getByText('Smiles')).toBeInTheDocument();
  });

  it('should render correctly with zero miles transferred', async () => {
    mockListTransfers.mockResolvedValue([
      buildMockTransfer({ pointsTransferred: 0, milesReceived: 0 }),
    ]);
    mockGetUserAverageCostPerMilheiro.mockResolvedValue(15);

    await renderPage();

    expect(screen.getByLabelText('Source BRL value').textContent).toMatch(/~R\$.*0/);
    expect(screen.getByLabelText('Destination BRL value').textContent).toMatch(/~R\$.*0/);
  });
});
