import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PromotionFeedSkeleton, PromotionsPageSkeleton } from './promotion-feed-skeleton';

describe('PromotionFeedSkeleton', () => {
  it('should render filter placeholders by default', () => {
    render(<PromotionFeedSkeleton />);

    expect(screen.getByTestId('promotion-feed-skeleton-filters')).toBeInTheDocument();
    expect(screen.getAllByTestId('promotion-skeleton-card')).toHaveLength(6);
  });

  it('should allow rendering only card placeholders', () => {
    render(<PromotionFeedSkeleton showFilters={false} cardCount={3} />);

    expect(screen.queryByTestId('promotion-feed-skeleton-filters')).not.toBeInTheDocument();
    expect(screen.getAllByTestId('promotion-skeleton-card')).toHaveLength(3);
  });
});

describe('PromotionsPageSkeleton', () => {
  it('should render a full-page loading state', () => {
    render(<PromotionsPageSkeleton />);

    expect(screen.getByTestId('promotion-feed-skeleton-filters')).toBeInTheDocument();
    expect(screen.getAllByTestId('promotion-skeleton-card')).toHaveLength(6);
  });
});
