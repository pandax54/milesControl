import { describe, it, expect } from 'vitest';
import { promotionFeedFilterSchema } from './promotion-feed.schema';

describe('promotionFeedFilterSchema', () => {
  it('should accept empty filter object', () => {
    const result = promotionFeedFilterSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('should accept valid status filter', () => {
    const result = promotionFeedFilterSchema.safeParse({ status: 'ACTIVE' });
    expect(result.success).toBe(true);
    expect(result.data?.status).toBe('ACTIVE');
  });

  it('should accept EXPIRED status', () => {
    const result = promotionFeedFilterSchema.safeParse({ status: 'EXPIRED' });
    expect(result.success).toBe(true);
  });

  it('should reject invalid status', () => {
    const result = promotionFeedFilterSchema.safeParse({ status: 'INVALID' });
    expect(result.success).toBe(false);
  });

  it('should accept valid type filter', () => {
    const result = promotionFeedFilterSchema.safeParse({ type: 'TRANSFER_BONUS' });
    expect(result.success).toBe(true);
  });

  it('should accept all valid types', () => {
    const types = ['TRANSFER_BONUS', 'POINT_PURCHASE', 'CLUB_SIGNUP', 'MIXED'];
    for (const type of types) {
      const result = promotionFeedFilterSchema.safeParse({ type });
      expect(result.success).toBe(true);
    }
  });

  it('should reject invalid type', () => {
    const result = promotionFeedFilterSchema.safeParse({ type: 'UNKNOWN' });
    expect(result.success).toBe(false);
  });

  it('should accept valid sortBy options', () => {
    const sortOptions = ['detectedAt', 'costPerMilheiro', 'deadline', 'bonusPercent'];
    for (const sortBy of sortOptions) {
      const result = promotionFeedFilterSchema.safeParse({ sortBy });
      expect(result.success).toBe(true);
    }
  });

  it('should reject invalid sortBy', () => {
    const result = promotionFeedFilterSchema.safeParse({ sortBy: 'invalid' });
    expect(result.success).toBe(false);
  });

  it('should accept valid sortOrder', () => {
    expect(promotionFeedFilterSchema.safeParse({ sortOrder: 'asc' }).success).toBe(true);
    expect(promotionFeedFilterSchema.safeParse({ sortOrder: 'desc' }).success).toBe(true);
  });

  it('should reject invalid sortOrder', () => {
    const result = promotionFeedFilterSchema.safeParse({ sortOrder: 'random' });
    expect(result.success).toBe(false);
  });

  it('should accept valid limit', () => {
    const result = promotionFeedFilterSchema.safeParse({ limit: 25 });
    expect(result.success).toBe(true);
  });

  it('should reject limit below 1', () => {
    const result = promotionFeedFilterSchema.safeParse({ limit: 0 });
    expect(result.success).toBe(false);
  });

  it('should reject limit above 100', () => {
    const result = promotionFeedFilterSchema.safeParse({ limit: 101 });
    expect(result.success).toBe(false);
  });

  it('should accept programId string', () => {
    const result = promotionFeedFilterSchema.safeParse({ programId: 'prog-smiles' });
    expect(result.success).toBe(true);
  });

  it('should accept all filters combined', () => {
    const result = promotionFeedFilterSchema.safeParse({
      status: 'ACTIVE',
      type: 'TRANSFER_BONUS',
      programId: 'prog-smiles',
      sortBy: 'costPerMilheiro',
      sortOrder: 'asc',
      limit: 50,
    });
    expect(result.success).toBe(true);
    expect(result.data).toEqual({
      status: 'ACTIVE',
      type: 'TRANSFER_BONUS',
      programId: 'prog-smiles',
      sortBy: 'costPerMilheiro',
      sortOrder: 'asc',
      limit: 50,
    });
  });
});
