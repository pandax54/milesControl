import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, CalendarDays, Calculator, Megaphone } from 'lucide-react';
import { PromotionCard } from '@/components/promotions/promotion-card';
import { MilesCalendarEventCard } from '@/components/promotions/miles-calendar-event-card';
import { JsonLdScript } from '@/components/public/json-ld-script';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { listUpcomingCalendarEvents } from '@/lib/services/miles-calendar.service';
import { listPromotions } from '@/lib/services/promotion.service';
import {
  buildBreadcrumbSchema,
  buildPublicPageMetadata,
  buildSoftwareApplicationSchema,
  buildWebPageSchema,
} from '@/lib/seo/public-pages';

export const metadata: Metadata = buildPublicPageMetadata({
  title: 'Miles & Points Tools',
  description:
    'Explore public miles tools: compare cost per milheiro, track active transfer promotions, and plan upcoming promo windows with MilesControl.',
  path: '/_public',
  keywords: ['miles tools', 'miles promotions', 'cost per milheiro', 'miles calendar'],
});

const FEATURE_CARDS = [
  {
    href: '/calculator',
    icon: Calculator,
    title: 'Calculator tool',
    description:
      'Run purchase and transfer scenarios instantly to understand the real cost per milheiro before you move points.',
  },
  {
    href: '/promotions',
    icon: Megaphone,
    title: 'Active promos feed',
    description:
      'See current transfer bonus and point purchase opportunities in one place, with filters and quick calculators.',
  },
  {
    href: '/promotions/calendar',
    icon: CalendarDays,
    title: 'Miles calendar',
    description:
      'Track recurring promo windows so you can plan club signups, purchases, and transfers ahead of time.',
  },
] as const;

export default async function PublicLandingPage() {
  const [featuredPromotions, upcomingEvents] = await Promise.all([
    listPromotions({ status: 'ACTIVE', sortBy: 'detectedAt', sortOrder: 'desc', limit: 3 }),
    listUpcomingCalendarEvents(3),
  ]);

  const schemas = [
    buildWebPageSchema({
      title: 'MilesControl public landing page',
      description: 'Organic entry point for calculators, promotions, and the miles calendar.',
      path: '/',
    }),
    buildSoftwareApplicationSchema(),
    buildBreadcrumbSchema([{ name: 'Home', path: '/' }]),
  ];

  return (
    <div className="space-y-14">
      <JsonLdScript data={schemas} />

      <section className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
        <div className="space-y-6">
          <span className="inline-flex rounded-full border px-3 py-1 text-sm text-muted-foreground">
            Public tools for Brazilian miles strategies
          </span>
          <div className="space-y-4">
            <h1 className="max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl">
              Compare promo value, plan transfers, and time your next miles move.
            </h1>
            <p className="max-w-2xl text-lg text-muted-foreground">
              MilesControl turns scattered promo articles into searchable tools. Use the calculator,
              browse active promotions, and review the miles calendar before you transfer points.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button size="lg" render={<Link href="/calculator" />}>
              Try the calculator
            </Button>
            <Button size="lg" variant="outline" render={<Link href="/promotions" />}>
              Browse promotions
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>What you can do without an account</CardTitle>
            <CardDescription>
              Public SEO pages surface the tools that help travelers discover MilesControl organically.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {FEATURE_CARDS.map((feature) => (
              <Link
                key={feature.href}
                href={feature.href}
                className="flex items-start justify-between gap-3 rounded-lg border p-4 transition-colors hover:bg-muted/50"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 font-medium">
                    <feature.icon className="h-4 w-4" />
                    <span>{feature.title}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </div>
                <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
              </Link>
            ))}
          </CardContent>
        </Card>
      </section>

      <section className="space-y-5">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold tracking-tight">Latest active promotions</h2>
          <p className="text-muted-foreground">
            Recent promos stay visible to search engines and give visitors a clear reason to keep exploring.
          </p>
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          {featuredPromotions.map((promotion) => (
            <PromotionCard key={promotion.id} promotion={promotion} />
          ))}
        </div>
      </section>

      <section className="space-y-5">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold tracking-tight">Upcoming calendar windows</h2>
          <p className="text-muted-foreground">
            Historical promo timing helps travelers decide whether to buy now or wait for a stronger campaign.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {upcomingEvents.map((event) => (
            <MilesCalendarEventCard key={event.id} event={event} />
          ))}
        </div>
      </section>

      <section>
        <Card className="bg-muted/30">
          <CardContent className="flex flex-col gap-4 py-8 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold tracking-tight">Want personalized guidance?</h2>
              <p className="text-muted-foreground">
                Sign in to save enrollments, unlock personalization, and compare promo value against your own transfer history.
              </p>
            </div>
            <Button size="lg" render={<Link href="/register" />}>
              Create a free account
            </Button>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
