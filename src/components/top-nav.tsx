'use client';

import { Bell, LogOut } from 'lucide-react';
import Link from 'next/link';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { DarkModeToggle } from '@/components/dark-mode-toggle';
import { Separator } from '@/components/ui/separator';

const MAX_BADGE_COUNT = 99;

interface TopNavProps {
  userName?: string | null;
  userImage?: string | null;
  userEmail?: string;
  unreadCount?: number;
}

function getInitials(name?: string | null): string {
  if (!name) return '?';
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function TopNav({ userName, userImage, userEmail, unreadCount = 0 }: TopNavProps) {
  const badgeCount = Math.min(unreadCount, MAX_BADGE_COUNT);
  const badgeLabel = badgeCount > MAX_BADGE_COUNT ? `${MAX_BADGE_COUNT}+` : String(badgeCount);

  return (
    <header className="flex h-14 items-center gap-2 border-b px-4">
      <SidebarTrigger />
      <Separator orientation="vertical" className="h-6" />

      <div className="flex-1" />

      <DarkModeToggle />

      <Link
        href="/notifications"
        className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }), 'relative')}
        aria-label="Notifications"
      >
        <Bell className="h-4 w-4" />
        {badgeCount > 0 && (
          <span
            className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground"
            aria-label={`${badgeCount} unread notifications`}
          >
            {badgeLabel}
          </span>
        )}
      </Link>

      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="ghost" size="icon" className="rounded-full">
              <Avatar className="h-8 w-8">
                <AvatarImage src={userImage ?? undefined} alt={userName ?? 'User'} />
                <AvatarFallback>{getInitials(userName)}</AvatarFallback>
              </Avatar>
            </Button>
          }
        />
        <DropdownMenuContent align="end">
          <div className="px-2 py-1.5 text-sm font-medium">{userName ?? 'User'}</div>
          {userEmail && (
            <div className="px-2 pb-1.5 text-xs text-muted-foreground">{userEmail}</div>
          )}
          <DropdownMenuItem>
            <form action="/api/auth/signout" method="POST">
              <button type="submit" className="flex w-full items-center">
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </button>
            </form>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
