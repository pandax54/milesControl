'use client';

import {
  LayoutDashboard,
  CreditCard,
  ArrowRightLeft,
  Calculator,
  Megaphone,
  CalendarDays,
  Plane,
  Bell,
  BellRing,
  Users,
  UsersRound,
  ClipboardList,
  Gift,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from '@/components/ui/sidebar';

const DASHBOARD_ITEMS = [
  { title: 'Dashboard', href: '/', icon: LayoutDashboard },
  { title: 'Programs', href: '/programs', icon: CreditCard },
  { title: 'Subscriptions', href: '/subscriptions', icon: ClipboardList },
  { title: 'Credit Cards', href: '/credit-cards', icon: CreditCard },
  { title: 'Transfers', href: '/transfers', icon: ArrowRightLeft },
  { title: 'Benefits', href: '/benefits', icon: Gift },
  { title: 'Family', href: '/family', icon: UsersRound },
  { title: 'Calculator', href: '/calculator', icon: Calculator },
];

const PROMO_ITEMS = [
  { title: 'Promotions', href: '/promotions', icon: Megaphone },
  { title: 'Miles Calendar', href: '/promotions/calendar', icon: CalendarDays },
];

const ALERT_ITEMS = [
  { title: 'Alert Rules', href: '/alerts', icon: BellRing },
];

const FLIGHT_ITEMS = [
  { title: 'Flight Search', href: '/flights/search', icon: Plane },
  { title: 'Watchlist', href: '/flights/watchlist', icon: Bell },
];

const ADMIN_ITEMS = [
  { title: 'Admin', href: '/admin', icon: Users },
  { title: 'Clients', href: '/admin/clients', icon: Users },
  { title: 'Audit Log', href: '/admin/audit', icon: ClipboardList },
];

interface NavGroupProps {
  label: string;
  items: Array<{ title: string; href: string; icon: React.ComponentType<{ className?: string }> }>;
  pathname: string;
}

function NavGroup({ label, items, pathname }: NavGroupProps) {
  return (
    <SidebarGroup>
      <SidebarGroupLabel>{label}</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton
                isActive={pathname === item.href}
                render={<Link href={item.href} />}
              >
                <item.icon className="h-4 w-4" />
                <span>{item.title}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

interface AppSidebarProps {
  userRole?: string;
}

export function AppSidebar({ userRole }: AppSidebarProps) {
  const pathname = usePathname();

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <Link href="/" className="flex items-center gap-2 font-bold text-lg">
          <Plane className="h-6 w-6" />
          <span>MilesControl</span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <NavGroup label="Dashboard" items={DASHBOARD_ITEMS} pathname={pathname} />
        <NavGroup label="Promotions" items={PROMO_ITEMS} pathname={pathname} />
        <NavGroup label="Alerts" items={ALERT_ITEMS} pathname={pathname} />
        <NavGroup label="Flights" items={FLIGHT_ITEMS} pathname={pathname} />
        {userRole === 'ADMIN' && (
          <NavGroup label="Admin" items={ADMIN_ITEMS} pathname={pathname} />
        )}
      </SidebarContent>
      <SidebarFooter />
    </Sidebar>
  );
}
