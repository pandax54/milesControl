import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { listWatchlistItems } from '@/lib/services/flight-watchlist.service';
import { WatchlistPage } from '@/components/flights/watchlist-page';

export default async function FlightWatchlistRoute() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/login');
  }

  const items = await listWatchlistItems(session.user.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Flight Watchlist</h1>
        <p className="text-muted-foreground">
          Monitor routes and get alerted when cash or miles prices drop below your targets.
        </p>
      </div>

      <WatchlistPage initialItems={items} />
    </div>
  );
}
