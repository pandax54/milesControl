import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  FREE_TIER_FEATURES,
  PREMIUM_TIER_FEATURES,
  getUserFreemiumAccessState,
} from '@/lib/services/freemium.service';

function FeatureList({
  title,
  items,
}: {
  title: string;
  items: readonly string[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2 text-sm text-muted-foreground">
          {items.map((item) => (
            <li key={item}>• {item}</li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

export default async function UpgradePage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/login');
  }

  const accessState = await getUserFreemiumAccessState(session.user.id);
  const isPremium = accessState.tier === 'PREMIUM';

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <h1 className="text-3xl font-bold tracking-tight">Plans</h1>
          <Badge variant={isPremium ? 'default' : 'secondary'}>
            {isPremium ? 'Premium' : 'Free'}
          </Badge>
        </div>
        <p className="text-muted-foreground">
          Free keeps the essentials simple. Premium unlocks unlimited tracking, award search,
          Telegram, and advanced analysis.
        </p>
        {!isPremium && accessState.remainingProgramSlots !== null && (
          <p className="text-sm text-muted-foreground">
            You are using {accessState.programCount} of {accessState.programLimit} free program
            slots.
          </p>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <FeatureList title="Free" items={FREE_TIER_FEATURES} />
        <FeatureList title="Premium" items={PREMIUM_TIER_FEATURES} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{isPremium ? 'You are already on Premium' : 'Ready to upgrade?'}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            {isPremium
              ? 'Your account already has access to every Premium feature in MilesControl.'
              : 'Premium unlocks award flights, Explore Destinations, Telegram, benefits tracking, and unlimited programs.'}
          </p>
          <Button
            variant={isPremium ? 'outline' : 'default'}
            render={<Link href={isPremium ? '/programs' : '/calculator'} />}
          >
            {isPremium ? 'Back to app' : 'Explore Premium features'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
