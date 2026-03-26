// PRD F4.8: Explore destinations page — entry point for browse-by-region flight discovery
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { ExploreDestinationsPage } from '@/components/flights/explore-destinations-page';
import { canAccessPremiumFeature } from '@/lib/services/freemium.service';
import { PremiumFeatureCard } from '@/components/freemium/premium-feature-card';

export default async function FlightsExploreRoute() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/login');
  }

  const canAccessExplore = await canAccessPremiumFeature(session.user.id, 'exploreDestinations');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Explore Destinations</h1>
        <p className="text-muted-foreground">
          Browse flights by region and date. Compare cash prices and award availability to find the best value redemptions.
        </p>
      </div>

      {canAccessExplore ? (
        <ExploreDestinationsPage />
      ) : (
        <PremiumFeatureCard feature="exploreDestinations" />
      )}
    </div>
  );
}
