'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarDays, ClipboardPlus, MessageSquareMore, Plus } from 'lucide-react';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@gleamops/ui';
import { useFeatureFlag } from '@/hooks/use-feature-flag';

type QuickAction = {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  href: string;
};

const ACTIONS: QuickAction[] = [
  {
    id: 'new-task',
    label: '+ New Task',
    description: 'Open the planning board and create same-day ticket assignments.',
    icon: <Plus className="h-4 w-4" aria-hidden="true" />,
    href: '/schedule?tab=planning',
  },
  {
    id: 'new-work-order',
    label: '+ Work Order',
    description: 'Create project cleaning work triggered by field needs.',
    icon: <ClipboardPlus className="h-4 w-4" aria-hidden="true" />,
    href: '/schedule?tab=work-orders&action=create-work-order',
  },
  {
    id: 'view-schedule',
    label: 'View Schedule',
    description: 'Review recurring assignments and open shift coverage.',
    icon: <CalendarDays className="h-4 w-4" aria-hidden="true" />,
    href: '/schedule',
  },
];

export function QuickActions() {
  const router = useRouter();
  const messagingEnabled = useFeatureFlag('messaging_v1');
  const actions = useMemo(() => {
    return [
      ...ACTIONS,
      {
        id: 'messages',
        label: 'Messages',
        description: messagingEnabled
          ? 'Open team communications for supervisors and field staff.'
          : 'Messaging tab is disabled for this tenant. Open Team module.',
        icon: <MessageSquareMore className="h-4 w-4" aria-hidden="true" />,
        href: messagingEnabled ? '/team?tab=messages' : '/team?tab=staff',
      },
    ] satisfies QuickAction[];
  }, [messagingEnabled]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Plus className="h-4 w-4 text-module-accent" aria-hidden="true" />
          Quick Actions
        </CardTitle>
        <CardDescription>Run high-frequency manager workflows</CardDescription>
      </CardHeader>

      <CardContent className="grid gap-2 sm:grid-cols-2">
        {actions.map((action) => (
          <Button
            key={action.id}
            type="button"
            variant="secondary"
            className="h-auto justify-start px-3 py-2 text-left"
            onClick={() => router.push(action.href)}
          >
            <span className="inline-flex items-start gap-2">
              <span className="mt-0.5 text-muted-foreground">{action.icon}</span>
              <span className="flex flex-col">
                <span className="text-sm font-medium text-foreground">{action.label}</span>
                <span className="text-xs text-muted-foreground">{action.description}</span>
              </span>
            </span>
          </Button>
        ))}
      </CardContent>
    </Card>
  );
}
