import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { Separator } from '@/components/ui/separator';
import { CalculatorForm } from '@/components/dashboard/calculator-form';
import { RedemptionAdvisorForm } from '@/components/dashboard/redemption-advisor-form';

export default async function CalculatorPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/login');
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Cost Calculator</h1>
        <p className="text-muted-foreground">
          Calculate the effective cost per milheiro for any miles acquisition scenario, or compare up to 3 scenarios side-by-side.
        </p>
      </div>
      <CalculatorForm />

      <Separator />

      <div>
        <h2 className="text-2xl font-bold tracking-tight">Miles Value Advisor</h2>
        <p className="text-muted-foreground">
          Should you use miles or pay cash? Get a personalized recommendation based on your actual cost history.
        </p>
      </div>
      <RedemptionAdvisorForm />
    </div>
  );
}
