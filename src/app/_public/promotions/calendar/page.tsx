import type { Metadata } from 'next';
import Link from 'next/link';
import { CalendarDays } from 'lucide-react';
import { MilesCalendarView } from '@/components/promotions/miles-calendar-view';
import { JsonLdScript } from '@/components/public/json-ld-script';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { listCalendarEvents } from '@/lib/services/miles-calendar.service';
import {
  buildBreadcrumbSchema,
  buildPublicPageMetadata,
  buildWebPageSchema,
} from '@/lib/seo/public-pages';

export const metadata: Metadata = buildPublicPageMetadata({
  title: 'Miles Calendar',
  description:
    'Review historical miles promo windows, expected bonus periods, and recurring transfer campaigns with the public MilesControl calendar.',
  path: '/_public/promotions/calendar',
  keywords: ['miles calendar', 'promo calendar', 'transfer bonus calendar'],
});

const MAX_CALENDAR_PAGE_EVENTS = 100;

export default async function PublicMilesCalendarPage() {
  const events = await listCalendarEvents({ limit: MAX_CALENDAR_PAGE_EVENTS });
  const schemas = [
    buildWebPageSchema({
      title: 'Miles calendar',
      description: 'Public calendar of expected and recurring miles promotions.',
      path: '/promotions/calendar',
    }),
    buildBreadcrumbSchema([
      { name: 'Home', path: '/' },
      { name: 'Promotions', path: '/promotions' },
      { name: 'Miles Calendar', path: '/promotions/calendar' },
    ]),
  ];

  return (
    <div className="space-y-8">
      <JsonLdScript data={schemas} />

      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm text-muted-foreground">
            <CalendarDays className="h-4 w-4" />
            Public miles calendar
          </div>
          <h1 className="text-4xl font-bold tracking-tight">Plan around the months that usually bring the best promos.</h1>
          <p className="max-w-3xl text-lg text-muted-foreground">
            MilesControl tracks recurring transfer, purchase, and club campaigns so you can avoid moving points too early.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Combine the calendar with alerts</CardTitle>
            <CardDescription>
              Free accounts can add program alerts and use the public calendar as a planning layer for upcoming campaigns.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" render={<Link href="/register" />}>
              Create alerts
            </Button>
          </CardContent>
        </Card>
      </section>

      <MilesCalendarView events={events} />
    </div>
  );
}
