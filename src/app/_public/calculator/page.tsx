import type { Metadata } from 'next';
import Link from 'next/link';
import { Calculator, Sparkles } from 'lucide-react';
import { CalculatorForm } from '@/components/dashboard/calculator-form';
import { JsonLdScript } from '@/components/public/json-ld-script';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  buildBreadcrumbSchema,
  buildPublicPageMetadata,
  buildSoftwareApplicationSchema,
  buildWebPageSchema,
} from '@/lib/seo/public-pages';

export const metadata: Metadata = buildPublicPageMetadata({
  title: 'Miles Calculator',
  description:
    'Calculate the effective cost per milheiro for point purchase and transfer bonus scenarios with the public MilesControl calculator.',
  path: '/_public/calculator',
  keywords: ['miles calculator', 'cost per milheiro', 'transfer bonus calculator'],
});

export default function PublicCalculatorPage() {
  const schemas = [
    buildWebPageSchema({
      title: 'Miles calculator',
      description: 'Public cost per milheiro calculator for transfer and point purchase scenarios.',
      path: '/calculator',
    }),
    buildSoftwareApplicationSchema(),
    buildBreadcrumbSchema([
      { name: 'Home', path: '/' },
      { name: 'Calculator', path: '/calculator' },
    ]),
  ];

  return (
    <div className="space-y-8">
      <JsonLdScript data={schemas} />

      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm text-muted-foreground">
            <Calculator className="h-4 w-4" />
            Public calculator tool
          </div>
          <h1 className="text-4xl font-bold tracking-tight">Calculate your cost per milheiro before you transfer.</h1>
          <p className="max-w-3xl text-lg text-muted-foreground">
            Test purchase prices, transfer bonuses, and club-only perks to see when a promo is actually worth it.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Upgrade to personalized value analysis</CardTitle>
            <CardDescription>
              Signed-in users can compare public calculations with their own transfer history and premium recommendations.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3 rounded-lg border p-4">
              <Sparkles className="mt-0.5 h-4 w-4 text-primary" />
              <p className="text-sm text-muted-foreground">
                Save scenarios, unlock Miles Value Advisor, and match public promotions to your enrolled programs.
              </p>
            </div>
            <Button className="w-full" render={<Link href="/register" />}>
              Start free
            </Button>
          </CardContent>
        </Card>
      </section>

      <CalculatorForm />
    </div>
  );
}
