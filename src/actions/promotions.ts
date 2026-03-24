'use server';

import { logger } from '@/lib/logger';
import { listPromotions, listPromotionPrograms } from '@/lib/services/promotion.service';
import type { PromotionWithPrograms } from '@/lib/services/promotion.service';
import { promotionFeedFilterSchema } from '@/lib/validators/promotion-feed.schema';
import type { PromotionFeedFilter } from '@/lib/validators/promotion-feed.schema';

interface FetchPromotionsResult {
  success: boolean;
  data?: PromotionWithPrograms[];
  error?: string;
}

export async function fetchPromotionsAction(
  filters: PromotionFeedFilter,
): Promise<FetchPromotionsResult> {
  const parsed = promotionFeedFilterSchema.safeParse(filters);

  if (!parsed.success) {
    return { success: false, error: 'Invalid filter parameters' };
  }

  try {
    const promotions = await listPromotions(parsed.data);
    return { success: true, data: promotions };
  } catch (error) {
    logger.error({ err: error }, 'Failed to fetch promotions');
    return { success: false, error: 'Failed to fetch promotions' };
  }
}

interface FetchPromotionProgramsResult {
  success: boolean;
  data?: Array<{ id: string; name: string }>;
  error?: string;
}

export async function fetchPromotionProgramsAction(): Promise<FetchPromotionProgramsResult> {
  try {
    const programs = await listPromotionPrograms();
    return { success: true, data: programs };
  } catch (error) {
    logger.error({ err: error }, 'Failed to fetch promotion programs');
    return { success: false, error: 'Failed to fetch promotion programs' };
  }
}
