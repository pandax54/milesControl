import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { CalculatorForm } from '@/components/dashboard/calculator-form';

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
    </div>
  );
}
