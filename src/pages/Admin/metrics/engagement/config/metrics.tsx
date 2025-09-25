import { BarChart3, Monitor, MousePointer, Wallet } from 'lucide-react';

export const engagementMetrics = [
    {
        id: 'sessions',
        title: 'Sessions',
        value: '—',
        icon: <BarChart3 className="w-4 h-4 text-white" />,
        color: 'bg-purple-500',
        category: 'Engagement',
        description: 'Avg sessions per user'
    },
    {
        id: 'screens_opened',
        title: 'Screens Opened',
        value: '—',
        icon: <Monitor className="w-4 h-4 text-white" />,
        color: 'bg-violet-500',
        category: 'Engagement',
        description: 'Avg screens per session'
    },
    {
        id: 'trades_per_user',
        title: 'Trades',
        value: '—',
        icon: <MousePointer className="w-4 h-4 text-white" />,
        color: 'bg-cyan-500',
        category: 'Engagement',
        description: 'All users trades'
    },
    {
        id: 'avg_virtual_balance',
        title: 'Virtual Balance',
        value: '—',
        icon: <Wallet className="w-4 h-4 text-white" />,
        color: 'bg-teal-500',
        category: 'Engagement',
        description: 'Avg virtual money balance'
    },
];
