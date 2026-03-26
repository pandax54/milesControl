import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { FlightSearchPage } from '@/components/flights/flight-search-page';
import { canAccessPremiumFeature } from '@/lib/services/freemium.service';

export default async function FlightSearchRoute() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/login');
  }

  const canAccessAwardFlights = await canAccessPremiumFeature(session.user.id, 'awardFlights');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Flight Search</h1>
        <p className="text-muted-foreground">
          Compare cash prices and award availability. Use the Miles Value Advisor to make the smartest redemption decision.
        </p>
        {!canAccessAwardFlights && (
          <p className="mt-2 text-sm text-muted-foreground">
            Free plan includes cash flight search. Upgrade to unlock award flights and miles value analysis.
          </p>
        )}
      </div>

      <FlightSearchPage canAccessAwardFlights={canAccessAwardFlights} />
    </div>
  );
}
