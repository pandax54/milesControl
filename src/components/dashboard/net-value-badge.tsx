import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils/format";

type NetValueType = "positive" | "negative" | "neutral";

export interface NetValueBadgeProps {
  netValue: number | null;
  netValueType: NetValueType | null;
}

const NET_VALUE_BADGE_CONFIG: Record<
  NetValueType,
  {
    ariaLabel: string;
    className: string;
    prefix: string;
    variant: "destructive" | "outline" | "secondary";
  }
> = {
  positive: {
    ariaLabel: "positive",
    className:
      "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-300",
    prefix: "+",
    variant: "outline",
  },
  negative: {
    ariaLabel: "negative",
    className: "border-destructive/30",
    prefix: "-",
    variant: "destructive",
  },
  neutral: {
    ariaLabel: "neutral",
    className: "bg-muted text-muted-foreground",
    prefix: "~",
    variant: "secondary",
  },
};

export function NetValueBadge({ netValue, netValueType }: NetValueBadgeProps) {
  if (netValue === null || netValueType === null) {
    return null;
  }

  const { ariaLabel, className, prefix, variant } = NET_VALUE_BADGE_CONFIG[netValueType];
  const formattedValue = formatCurrency(Math.abs(netValue));

  return (
    <Badge
      aria-label={`Transfer net value: ${ariaLabel} ${formattedValue}`}
      className={className}
      variant={variant}
    >
      {prefix}
      {formattedValue}
    </Badge>
  );
}
