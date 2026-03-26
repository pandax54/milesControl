import Link from 'next/link';
import { Lock, Sparkles } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  PREMIUM_FEATURE_METADATA,
  type PremiumFeatureKey,
} from '@/lib/freemium';

interface PremiumFeatureCardProps {
  readonly feature: PremiumFeatureKey;
  readonly title?: string;
  readonly description?: string;
}

export function PremiumFeatureCard({
  feature,
  title,
  description,
}: PremiumFeatureCardProps) {
  const metadata = PREMIUM_FEATURE_METADATA[feature];

  return (
    <Card className="border-dashed">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lock className="h-5 w-5" />
          {title ?? `${metadata.title} is Premium`}
        </CardTitle>
        <CardDescription>
          {description ?? metadata.description}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          Upgrade to MilesControl Premium to unlock this feature.
        </p>
        <Button
          render={
            <Link href="/upgrade" />
          }
        >
          <Sparkles className="mr-2 h-4 w-4" />
          View Premium
        </Button>
      </CardContent>
    </Card>
  );
}
