import Link from 'next/link';
import { CalendarDays, Calculator, Megaphone, Plane } from 'lucide-react';
import { DarkModeToggle } from '@/components/dark-mode-toggle';
import { Button } from '@/components/ui/button';

const PUBLIC_NAV_ITEMS = [
  { href: '/calculator', label: 'Calculator', icon: Calculator },
  { href: '/promotions', label: 'Promotions', icon: Megaphone },
  { href: '/promotions/calendar', label: 'Miles Calendar', icon: CalendarDays },
] as const;

export function PublicShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2 text-lg font-semibold">
            <Plane className="h-5 w-5" />
            <span>MilesControl</span>
          </Link>

          <nav className="hidden items-center gap-6 md:flex">
            {PUBLIC_NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <DarkModeToggle />
            <Button variant="ghost" render={<Link href="/login" />}>
              Sign in
            </Button>
            <Button render={<Link href="/register" />}>Start free</Button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">{children}</main>

      <footer className="border-t">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-4 py-6 text-sm text-muted-foreground sm:px-6 lg:px-8 md:flex-row md:items-center md:justify-between">
          <p>
            Public tools for Brazilian miles and points planning.
          </p>
          <div className="flex flex-wrap items-center gap-4">
            {PUBLIC_NAV_ITEMS.map((item) => (
              <Link key={item.href} href={item.href} className="hover:text-foreground">
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
