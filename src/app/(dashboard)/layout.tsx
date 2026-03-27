import { Suspense } from 'react';
import { AnalyticsIdentity } from '@/components/analytics/analytics-identity';
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

  return (
    <TooltipProvider>
      <AnalyticsIdentity
        userId={session.user.id}
        email={session.user.email}
        role={session.user.role}
        name={session.user.name}
      />
      <SidebarProvider>
        <AppSidebar userRole={session.user.role} />
        <SidebarInset>
          <Suspense
            fallback={
              <TopNav
                userName={session.user.name}
                userImage={session.user.image}
                userEmail={session.user.email}
              />
            }
          >
            <DashboardTopNav
              userId={session.user.id}
              userName={session.user.name}
              userImage={session.user.image}
              userEmail={session.user.email}
            />
          </Suspense>
          <main className="flex-1 p-6">{children}</main>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}

async function DashboardTopNav({
  userId,
  userName,
  userImage,
  userEmail,
}: {
  userId?: string;
  userName?: string | null;
  userImage?: string | null;
  userEmail?: string | null;
}) {
  const unreadCount = userId ? await countUnreadNotifications(userId) : 0;

  return (
    <TopNav
      userName={userName}
      userImage={userImage}
      userEmail={userEmail ?? undefined}
      unreadCount={unreadCount}
    />
  );
}
