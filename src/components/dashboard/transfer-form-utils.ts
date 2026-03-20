interface TransferFormFields {
  pointsTransferred: string;
  bonusPercent: string;
  milesReceived: string;
  totalCost: string;
}

interface ParsedTransferValues {
  points: number;
  miles: number;
  bonus: number;
  cost: number | null;
}

type ParseResult =
  | { success: true; data: ParsedTransferValues }
  | { success: false; error: string };

export function parseTransferFormValues(fields: TransferFormFields): ParseResult {
  const points = parseInt(fields.pointsTransferred, 10);
  if (Number.isNaN(points) || points < 1) {
    return { success: false, error: 'Points transferred must be a positive whole number' };
  }

  const miles = parseInt(fields.milesReceived, 10);
  if (Number.isNaN(miles) || miles < 1) {
    return { success: false, error: 'Miles received must be a positive whole number' };
  }

  const bonus = parseFloat(fields.bonusPercent);
  if (Number.isNaN(bonus) || bonus < 0) {
    return { success: false, error: 'Bonus percent must be non-negative' };
  }

  const cost = fields.totalCost.trim() ? parseFloat(fields.totalCost) : null;
  if (cost !== null && (Number.isNaN(cost) || cost < 0)) {
    return { success: false, error: 'Total cost must be non-negative' };
  }

  return { success: true, data: { points, miles, bonus, cost } };
}
