import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { formatCurrency } from "@/lib/utils/format";
import { NetValueBadge } from "./net-value-badge";

function removeWhitespace(value: string) {
  return value.replace(/\s+/g, "");
}

describe("NetValueBadge", () => {
  it("should render a green badge with a plus prefix for positive net value", () => {
    render(<NetValueBadge netValue={12.5} netValueType="positive" />);

    const badge = screen.getByText((_, element) => {
      return element?.getAttribute("aria-label") === `Transfer net value: positive ${formatCurrency(12.5)}`;
    });

    expect(badge).toBeInTheDocument();
    expect(badge).toHaveAttribute("aria-label", `Transfer net value: positive ${formatCurrency(12.5)}`);
    expect(removeWhitespace(badge.textContent ?? "")).toBe(removeWhitespace(`+${formatCurrency(12.5)}`));
    expect(badge).toHaveClass("bg-emerald-50", "text-emerald-700");
  });

  it("should render a red badge with a minus prefix for negative net value", () => {
    render(<NetValueBadge netValue={-8} netValueType="negative" />);

    const badge = screen.getByText((_, element) => {
      return element?.getAttribute("aria-label") === `Transfer net value: negative ${formatCurrency(8)}`;
    });

    expect(badge).toBeInTheDocument();
    expect(badge).toHaveAttribute("aria-label", `Transfer net value: negative ${formatCurrency(8)}`);
    expect(removeWhitespace(badge.textContent ?? "")).toBe(removeWhitespace(`-${formatCurrency(8)}`));
    expect(badge).toHaveClass("text-destructive");
  });

  it("should render a gray badge with a tilde prefix for neutral net value", () => {
    render(<NetValueBadge netValue={0.5} netValueType="neutral" />);

    const badge = screen.getByText((_, element) => {
      return element?.getAttribute("aria-label") === `Transfer net value: neutral ${formatCurrency(0.5)}`;
    });

    expect(badge).toBeInTheDocument();
    expect(badge).toHaveAttribute("aria-label", `Transfer net value: neutral ${formatCurrency(0.5)}`);
    expect(removeWhitespace(badge.textContent ?? "")).toBe(removeWhitespace(`~${formatCurrency(0.5)}`));
    expect(badge).toHaveClass("bg-muted", "text-muted-foreground");
  });

  it("should render nothing when netValue is null", () => {
    const { container } = render(<NetValueBadge netValue={null} netValueType="positive" />);

    expect(container).toBeEmptyDOMElement();
  });

  it("should render nothing when netValueType is null", () => {
    const { container } = render(<NetValueBadge netValue={10} netValueType={null} />);

    expect(container).toBeEmptyDOMElement();
  });

  it("should render nothing when both values are null", () => {
    const { container } = render(<NetValueBadge netValue={null} netValueType={null} />);

    expect(container).toBeEmptyDOMElement();
  });
});
