import type { Metadata } from 'next';
import Link from 'next/link';
import { Megaphone } from 'lucide-react';
import { PromotionFeed } from '@/components/promotions/promotion-feed';
import { JsonLdScript } from '@/components/public/json-ld-script';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { listPromotionPrograms, listPromotions } from '@/lib/services/promotion.service';
import {
  buildBreadcrumbSchema,
  buildPublicPageMetadata,
  buildWebPageSchema,
} from '@/lib/seo/public-pages';

export const metadata: Metadata = buildPublicPageMetadata({
  title: 'Active Miles Promotions',
  description:
    'Browse active transfer bonus and point purchase promotions, filter by program, and estimate promo value with MilesControl.',
  path: '/_public/promotions',
  keywords: ['miles promotions', 'transfer bonus', 'active promotions', 'points purchase'],
});

export default async function PublicPromotionsPage() {
  const [promotions, programs] = await Promise.all([
    listPromotions({ status: 'ACTIVE', sortBy: 'detectedAt', sortOrder: 'desc' }),
    listPromotionPrograms(),
  ]);

  const schemas = [
    buildWebPageSchema({
      title: 'Active miles promotions',
      description: 'Public promotions feed with active transfer bonus and point purchase offers.',
      path: '/promotions',
    }),
    buildBreadcrumbSchema([
      { name: 'Home', path: '/' },
      { name: 'Promotions', path: '/promotions' },
    ]),
  ];

  return (
    <div className="space-y-8">
      <JsonLdScript data={schemas} />

      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm text-muted-foreground">
            <Megaphone className="h-4 w-4" />
            Public active promos feed
          </div>
          <h1 className="text-4xl font-bold tracking-tight">Stay on top of live transfer bonus and purchase deals.</h1>
          <p className="max-w-3xl text-lg text-muted-foreground">
            Filter public promotions by type and program, then open the embedded calculator to estimate value in seconds.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Sign in to personalize this feed</CardTitle>
            <CardDescription>
              MilesControl can highlight the promotions that match your programs and show how relevant each one is for your balances.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" render={<Link href="/register" />}>
              Get personalized promo matching
            </Button>
          </CardContent>
        </Card>
      </section>

      <PromotionFeed initialPromotions={promotions} programs={programs} />
    </div>
  );
}
