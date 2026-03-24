import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/app-sidebar';
import { TopNav } from '@/components/top-nav';
import { TooltipProvider } from '@/components/ui/tooltip';
import { countUnreadNotifications } from '@/lib/services/notification.service';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  const unreadCount = session.user.id
    ? await countUnreadNotifications(session.user.id)
    : 0;

  return (
    <TooltipProvider>
      <SidebarProvider>
        <AppSidebar userRole={session.user.role} />
        <SidebarInset>
          <TopNav
            userName={session.user.name}
            userImage={session.user.image}
            userEmail={session.user.email}
            unreadCount={unreadCount}
          />
          <main className="flex-1 p-6">{children}</main>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}
