import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { FlightSearchPage } from '@/components/flights/flight-search-page';

export default async function FlightSearchRoute() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/login');
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Flight Search</h1>
        <p className="text-muted-foreground">
          Compare cash prices and award availability. Use the Miles Value Advisor to make the smartest redemption decision.
        </p>
      </div>

      <FlightSearchPage />
    </div>
  );
}
