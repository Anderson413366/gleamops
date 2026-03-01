'use client';

import { useState, useEffect } from 'react';
import { MessageSquare, Plus, Clock as ClockIcon, Users, CalendarDays, AlertTriangle, FileText, Gift, Star } from 'lucide-react';
import { Button, Card, CardContent, CollapsibleCard } from '@gleamops/ui';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

interface Announcement {
  id: string;
  author_name: string;
  author_avatar: string | null;
  title: string;
  body: string;
  created_at: string;
  comment_count: number;
}

function formatTimestamp(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  if (diffHours < 1) return 'Just now';
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// Sample announcements (in real implementation, these come from a messages table)
const SAMPLE_ANNOUNCEMENTS: Announcement[] = [
  {
    id: '1',
    author_name: 'System',
    author_avatar: null,
    title: 'Welcome to GleamOps',
    body: 'Your schedule management platform is ready. Start by adding your team members and creating your first schedule.',
    created_at: new Date().toISOString(),
    comment_count: 0,
  },
];

export function MessageWall() {
  const [announcements] = useState<Announcement[]>(SAMPLE_ANNOUNCEMENTS);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-muted-foreground" />
          Message Wall
        </h3>
        <Button size="sm" variant="ghost">
          <Plus className="h-3.5 w-3.5" /> New Message
        </Button>
      </div>

      <div className="space-y-2 max-h-96 overflow-y-auto">
        {announcements.map((msg) => (
          <Card key={msg.id} className="hover:shadow-md transition-shadow">
            <CardContent className="py-3">
              <div className="flex items-start gap-2">
                <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium text-muted-foreground shrink-0">
                  {msg.author_name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-foreground">{msg.author_name}</span>
                    <span className="text-[11px] text-muted-foreground">{formatTimestamp(msg.created_at)}</span>
                  </div>
                  <p className="text-sm font-medium text-foreground mt-0.5">{msg.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{msg.body}</p>
                  {msg.comment_count > 0 && (
                    <button type="button" className="text-[11px] text-module-accent hover:underline mt-1">
                      {msg.comment_count} comment{msg.comment_count !== 1 ? 's' : ''}
                    </button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <button type="button" className="w-full text-xs text-muted-foreground hover:text-foreground text-center py-1">
        Load More
      </button>
    </div>
  );
}

export function DashboardWidgets() {
  const [clockedInCount, setClockedInCount] = useState(0);
  const [onLeaveCount, setOnLeaveCount] = useState(0);

  useEffect(() => {
    async function fetchCounts() {
      const supabase = getSupabaseBrowserClient();
      const { count: clockedIn } = await supabase
        .from('time_entries')
        .select('id', { count: 'exact', head: true })
        .is('end_at', null);

      const { count: onLeave } = await supabase
        .from('staff')
        .select('id', { count: 'exact', head: true })
        .eq('staff_status', 'ON_LEAVE')
        .is('archived_at', null);

      setClockedInCount(clockedIn ?? 0);
      setOnLeaveCount(onLeave ?? 0);
    }
    fetchCounts();
  }, []);

  return (
    <div className="space-y-3">
      <CollapsibleCard id="widget-time-clock" title="Time Clock" icon={<ClockIcon className="h-4 w-4" />}>
        <div className="text-center py-2">
          <p className="text-lg font-bold text-foreground">{new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</p>
          <p className="text-xs text-muted-foreground">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</p>
          <Button size="sm" className="mt-3">Clock In</Button>
        </div>
      </CollapsibleCard>

      <CollapsibleCard id="widget-whos-on" title={`Who's On Now (${clockedInCount})`} icon={<Users className="h-4 w-4" />}>
        <p className="text-xs text-muted-foreground">{clockedInCount} staff member{clockedInCount !== 1 ? 's' : ''} currently clocked in.</p>
      </CollapsibleCard>

      <CollapsibleCard id="widget-on-leave" title={`On Leave (${onLeaveCount})`} icon={<CalendarDays className="h-4 w-4" />}>
        <p className="text-xs text-muted-foreground">{onLeaveCount} staff member{onLeaveCount !== 1 ? 's' : ''} on leave today.</p>
      </CollapsibleCard>

      <CollapsibleCard id="widget-late" title="Late for Work (0)" icon={<AlertTriangle className="h-4 w-4" />} defaultCollapsed>
        <p className="text-xs text-muted-foreground">No late arrivals today.</p>
      </CollapsibleCard>

      <CollapsibleCard id="widget-shared-files" title="Shared Files" icon={<FileText className="h-4 w-4" />} defaultCollapsed>
        <p className="text-xs text-muted-foreground">No shared files pinned.</p>
      </CollapsibleCard>

      <CollapsibleCard id="widget-anniversaries" title="Annual Anniversaries" icon={<Star className="h-4 w-4" />} defaultCollapsed>
        <p className="text-xs text-muted-foreground">No anniversaries this week.</p>
      </CollapsibleCard>

      <CollapsibleCard id="widget-birthdays" title="Birthdays" icon={<Gift className="h-4 w-4" />} defaultCollapsed>
        <p className="text-xs text-muted-foreground">No birthdays this week.</p>
      </CollapsibleCard>
    </div>
  );
}
