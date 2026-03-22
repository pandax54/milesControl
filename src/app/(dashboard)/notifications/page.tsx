import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { Bell } from 'lucide-react';
import { listNotifications, countUnreadNotifications } from '@/lib/services/notification.service';
import { NotificationItem } from '@/components/alerts/notification-item';
import { MarkAllReadButton } from '@/components/alerts/mark-all-read-button';

export default async function NotificationsPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/login');
  }

  const [notifications, unreadCount] = await Promise.all([
    listNotifications(session.user.id),
    countUnreadNotifications(session.user.id),
  ]);

  const hasNotifications = notifications.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Notifications</h1>
          <p className="text-muted-foreground">
            {unreadCount > 0
              ? `${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}`
              : 'All caught up'}
          </p>
        </div>
        {unreadCount > 0 && <MarkAllReadButton />}
      </div>

      {!hasNotifications ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
          <Bell className="mb-4 h-10 w-10 text-muted-foreground" />
          <p className="text-lg font-medium">No notifications yet</p>
          <p className="text-sm text-muted-foreground">
            You will receive notifications here when promotions match your alert rules.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((notification) => (
            <NotificationItem key={notification.id} notification={notification} />
          ))}
        </div>
      )}
    </div>
  );
}
