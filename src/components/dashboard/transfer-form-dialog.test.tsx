import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { TransferConversionResult } from '@/hooks/use-transfer-conversion';

vi.mock('@/actions/transfers', () => ({
  logTransfer: vi.fn(),
}));

vi.mock('@/hooks/use-transfer-conversion', () => ({
  useTransferConversion: vi.fn(),
}));

// Mock Base UI Select to use native <select> for reliable JSDOM interaction
vi.mock('@/components/ui/select', () => ({
  Select: ({ value, onValueChange, children }: { value: string; onValueChange: (v: string) => void; children: React.ReactNode }) => (
    <select value={value} onChange={(e) => onValueChange(e.target.value)}>
      {children}
    </select>
  ),
  SelectTrigger: ({ children, id }: { children: React.ReactNode; id?: string }) => (
    <div id={id}>{children}</div>
  ),
  SelectValue: ({ placeholder }: { placeholder?: string }) => <span>{placeholder}</span>,
  SelectContent: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SelectItem: ({ value, children }: { value: string; children: React.ReactNode }) => (
    <option value={value}>{children}</option>
  ),
}));

import { logTransfer } from '@/actions/transfers';
import { useTransferConversion } from '@/hooks/use-transfer-conversion';
import { TransferFormDialog } from './transfer-form-dialog';

const mockUseTransferConversion = vi.mocked(useTransferConversion);
const mockLogTransfer = vi.mocked(logTransfer);

const PROGRAMS = [
  { name: 'Livelo', type: 'POINTS' },
  { name: 'Smiles', type: 'MILES' },
];

const DEFAULT_CONVERSION: TransferConversionResult = {
  sourceBrl: null,
  destBrl: null,
  netValue: null,
  netValueType: null,
  sourceCpm: null,
  destCpm: null,
  activePromotion: null,
  isLoading: false,
  error: null,
};

function buildConversion(overrides: Partial<TransferConversionResult> = {}): TransferConversionResult {
  return { ...DEFAULT_CONVERSION, ...overrides };
}

function openDialog() {
  fireEvent.click(screen.getByRole('button', { name: /log transfer/i }));
}

function selectSourceProgram(value: string) {
  const select = document.querySelector('select') as HTMLSelectElement;
  fireEvent.change(select, { target: { value } });
}

function selectDestProgram(value: string) {
  const selects = document.querySelectorAll('select');
  const destSelect = selects[1] as HTMLSelectElement;
  fireEvent.change(destSelect, { target: { value } });
}

describe('TransferFormDialog — BRL display integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseTransferConversion.mockReturnValue(DEFAULT_CONVERSION);
    mockLogTransfer.mockResolvedValue({ success: true });
  });

  it('should render BRL value below source miles input when CPM is available', () => {
    mockUseTransferConversion.mockReturnValue(
      buildConversion({ sourceBrl: 150, sourceCpm: 15, destCpm: 12 }),
    );

    render(<TransferFormDialog programs={PROGRAMS} />);
    openDialog();
    selectSourceProgram('Livelo');

    const sourceBrl = screen.getByLabelText('Source value in BRL');
    expect(sourceBrl).toBeInTheDocument();
    expect(sourceBrl.textContent).toContain('150');
    expect(sourceBrl).toHaveClass('text-sm', 'text-muted-foreground');
  });

  it('should render BRL value below destination miles input when CPM is available', () => {
    mockUseTransferConversion.mockReturnValue(
      buildConversion({ destBrl: 120, sourceCpm: 15, destCpm: 12 }),
    );

    render(<TransferFormDialog programs={PROGRAMS} />);
    openDialog();
    selectDestProgram('Smiles');

    const destBrl = screen.getByLabelText('Destination value in BRL');
    expect(destBrl).toBeInTheDocument();
    expect(destBrl.textContent).toContain('120');
    expect(destBrl).toHaveClass('text-sm', 'text-muted-foreground');
  });

  it('should call useTransferConversion with parsed numeric values', () => {
    render(<TransferFormDialog programs={PROGRAMS} />);
    openDialog();

    fireEvent.change(screen.getByLabelText('Points Transferred'), { target: { value: '10000' } });
    fireEvent.change(screen.getByLabelText('Miles Received'), { target: { value: '19000' } });

    const lastCall = mockUseTransferConversion.mock.calls.at(-1);
    expect(lastCall?.[2]).toBe(10000);
    expect(lastCall?.[3]).toBe(19000);
  });

  it('should show "no data" placeholder when source CPM is null and program is selected', () => {
    mockUseTransferConversion.mockReturnValue(
      buildConversion({ sourceCpm: null, destCpm: 12 }),
    );

    render(<TransferFormDialog programs={PROGRAMS} />);
    openDialog();
    selectSourceProgram('Livelo');

    expect(screen.getByText('Sem dados de custo')).toBeInTheDocument();
  });

  it('should show "no data" placeholder when destination CPM is null and program is selected', () => {
    mockUseTransferConversion.mockReturnValue(
      buildConversion({ sourceCpm: 15, destCpm: null }),
    );

    render(<TransferFormDialog programs={PROGRAMS} />);
    openDialog();
    selectDestProgram('Smiles');

    expect(screen.getByText('Sem dados de custo')).toBeInTheDocument();
  });

  it('should render NetValueBadge when both programs are selected and netValue is available', () => {
    mockUseTransferConversion.mockReturnValue(
      buildConversion({ netValue: -30, netValueType: 'negative', sourceCpm: 15, destCpm: 12 }),
    );

    render(<TransferFormDialog programs={PROGRAMS} />);
    openDialog();
    selectSourceProgram('Livelo');
    selectDestProgram('Smiles');

    const badge = screen.getByLabelText(/transfer net value/i);
    expect(badge).toBeInTheDocument();
  });

  it('should not render NetValueBadge container when no programs are selected', () => {
    render(<TransferFormDialog programs={PROGRAMS} />);
    openDialog();

    expect(screen.queryByTestId('net-value-badge-container')).not.toBeInTheDocument();
  });

  it('should not render NetValueBadge content when either CPM is null', () => {
    mockUseTransferConversion.mockReturnValue(
      buildConversion({ netValue: null, netValueType: null, sourceCpm: null, destCpm: 12 }),
    );

    render(<TransferFormDialog programs={PROGRAMS} />);
    openDialog();
    selectSourceProgram('Livelo');
    selectDestProgram('Smiles');

    expect(screen.getByTestId('net-value-badge-container')).toBeInTheDocument();
    expect(screen.queryByLabelText(/transfer net value/i)).not.toBeInTheDocument();
  });

  it('should show loading skeleton while conversion data is loading', () => {
    mockUseTransferConversion.mockReturnValue(
      buildConversion({ isLoading: true }),
    );

    render(<TransferFormDialog programs={PROGRAMS} />);
    openDialog();
    selectSourceProgram('Livelo');

    expect(screen.getByTestId('brl-loading')).toBeInTheDocument();
  });

  it('should auto-fill bonus field when active promotion exists for destination program', async () => {
    mockUseTransferConversion.mockReturnValue(
      buildConversion({
        activePromotion: { id: 'promo-1', bonusPercent: 100, title: 'Smiles Duplo' },
      }),
    );

    render(<TransferFormDialog programs={PROGRAMS} />);
    openDialog();
    selectDestProgram('Smiles');

    await waitFor(() => {
      const bonusInput = screen.getByLabelText('Bonus %') as HTMLInputElement;
      expect(bonusInput.value).toBe('100');
    });
  });

  it('should show promotion indicator when bonus is auto-filled', async () => {
    mockUseTransferConversion.mockReturnValue(
      buildConversion({
        activePromotion: { id: 'promo-1', bonusPercent: 100, title: 'Smiles Duplo' },
      }),
    );

    render(<TransferFormDialog programs={PROGRAMS} />);
    openDialog();
    selectDestProgram('Smiles');

    await waitFor(() => {
      expect(screen.getByTestId('promotion-indicator')).toBeInTheDocument();
      expect(screen.getByTestId('promotion-indicator')).toHaveTextContent('Smiles Duplo');
      expect(screen.getByTestId('promotion-indicator')).toHaveTextContent('100%');
    });
  });

  it('should not change bonus field when no active promotion exists', async () => {
    mockUseTransferConversion.mockReturnValue(
      buildConversion({ activePromotion: null }),
    );

    render(<TransferFormDialog programs={PROGRAMS} />);
    openDialog();
    selectDestProgram('Smiles');

    const bonusInput = screen.getByLabelText('Bonus %') as HTMLInputElement;
    expect(bonusInput.value).toBe('0');
    expect(screen.queryByTestId('promotion-indicator')).not.toBeInTheDocument();
  });

  it('should allow user to manually override auto-filled bonus', async () => {
    mockUseTransferConversion.mockReturnValue(
      buildConversion({
        activePromotion: { id: 'promo-1', bonusPercent: 100, title: 'Smiles Duplo' },
      }),
    );

    render(<TransferFormDialog programs={PROGRAMS} />);
    openDialog();
    selectDestProgram('Smiles');

    await waitFor(() => {
      const bonusInput = screen.getByLabelText('Bonus %') as HTMLInputElement;
      expect(bonusInput.value).toBe('100');
    });

    fireEvent.change(screen.getByLabelText('Bonus %'), { target: { value: '50' } });

    const bonusInput = screen.getByLabelText('Bonus %') as HTMLInputElement;
    expect(bonusInput.value).toBe('50');
  });

  it('should auto-fill with new promotion when destination program changes', async () => {
    mockUseTransferConversion
      .mockReturnValueOnce(buildConversion({ activePromotion: null }))
      .mockReturnValue(
        buildConversion({
          activePromotion: { id: 'promo-2', bonusPercent: 80, title: 'Livelo Bônus' },
        }),
      );

    render(<TransferFormDialog programs={PROGRAMS} />);
    openDialog();
    selectDestProgram('Smiles');

    // Re-render with new promotion data (destination changed)
    selectDestProgram('Livelo');

    await waitFor(() => {
      const bonusInput = screen.getByLabelText('Bonus %') as HTMLInputElement;
      expect(bonusInput.value).toBe('80');
    });
  });

  it('should update destination BRL when bonus is auto-filled', async () => {
    mockUseTransferConversion.mockReturnValue(
      buildConversion({
        destBrl: 200,
        destCpm: 10,
        activePromotion: { id: 'promo-1', bonusPercent: 100, title: 'Smiles Duplo' },
      }),
    );

    render(<TransferFormDialog programs={PROGRAMS} />);
    openDialog();
    selectDestProgram('Smiles');

    const destBrl = screen.getByLabelText('Destination value in BRL');
    expect(destBrl.textContent).toContain('200');
  });

  it('should update destination BRL when user overrides bonus', async () => {
    mockUseTransferConversion.mockReturnValue(
      buildConversion({
        destBrl: 120,
        destCpm: 12,
        activePromotion: { id: 'promo-1', bonusPercent: 100, title: 'Smiles Duplo' },
      }),
    );

    render(<TransferFormDialog programs={PROGRAMS} />);
    openDialog();
    selectDestProgram('Smiles');
    fireEvent.change(screen.getByLabelText('Miles Received'), { target: { value: '10000' } });

    const lastCall = mockUseTransferConversion.mock.calls.at(-1);
    expect(lastCall?.[3]).toBe(10000);
  });

  it('should still allow form submission with BRL display active', async () => {
    mockUseTransferConversion.mockReturnValue(
      buildConversion({ sourceBrl: 150, destBrl: 120, sourceCpm: 15, destCpm: 12 }),
    );
    mockLogTransfer.mockResolvedValue({ success: true });

    render(<TransferFormDialog programs={PROGRAMS} />);
    openDialog();
    selectSourceProgram('Livelo');
    selectDestProgram('Smiles');
    fireEvent.change(screen.getByLabelText('Points Transferred'), { target: { value: '10000' } });
    fireEvent.change(screen.getByLabelText('Miles Received'), { target: { value: '19000' } });

    const submitBtn = document.querySelector('button[type="submit"]');
    expect(submitBtn).not.toBeNull();

    await act(async () => {
      fireEvent.click(submitBtn!);
    });

    expect(mockLogTransfer).toHaveBeenCalled();
  });
});
