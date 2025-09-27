import React from 'react';
import {
  Download,
  Eye,
  Users,
  UserCheck,
  TrendingUp,
  BarChart3,
  Monitor,
  MousePointer,
  Wallet,
  RotateCcw,
  UserMinus,
  GraduationCap,
  CheckCircle,
  SkipForward,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Hand,
  Gift,
  Play,
  Shield,
  DollarSign,
  Clock,
  AlertCircle,
  Zap,
  Globe,
  Smartphone,
  Maximize,
  ArrowDown,
  XCircle,
  Navigation,
  FileText,
  Repeat,
  Link,
  Target
} from 'lucide-react';

// Engagement метрики теперь встроены

export type Metric = {
  id: string;
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  category: string;
  description: string;
};

export type MetricRowProps = {
  metric: Metric;
  isSelected: boolean;
  onClick: () => void;
};

// Все метрики приложения - перекомбинированы для чередования цветов
export const allMetrics: Metric[] = [
  // Acquisition
  { id: 'sign_up_rate', title: 'Signup Rate', value: '—', icon: <UserCheck className="w-4 h-4 text-white" />, color: 'bg-emerald-500', category: 'Acquisition', description: 'Conversion from visitor to user' },
  { id: 'page_visits', title: 'Page Visits', value: '—', icon: <Eye className="w-4 h-4 text-white" />, color: 'bg-blue-500', category: 'Acquisition', description: 'Avg page visits per user' },
  
  // Tutorial
  { id: 'tutorial_start', title: 'Tutorial Start', value: '—', icon: <GraduationCap className="w-4 h-4 text-white" />, color: 'bg-blue-500', category: 'Tutorial', description: 'Users who started tutorial' },
  { id: 'tutorial_complete', title: 'Tutorial Complete', value: '—', icon: <CheckCircle className="w-4 h-4 text-white" />, color: 'bg-emerald-500', category: 'Tutorial', description: 'Users who completed tutorial' },
  { id: 'pro_tutorial_start', title: 'Pro Tutorial Start', value: '—', icon: <GraduationCap className="w-4 h-4 text-white" />, color: 'bg-blue-500', category: 'Tutorial', description: 'Premium users who started pro tutorial' },
  { id: 'pro_tutorial_complete', title: 'Pro Tutorial Complete', value: '—', icon: <CheckCircle className="w-4 h-4 text-white" />, color: 'bg-emerald-500', category: 'Tutorial', description: 'Premium users who completed pro tutorial' },

  // Engagement
  { id: 'sessions', title: 'Sessions', value: '—', icon: <BarChart3 className="w-4 h-4 text-white" />, color: 'bg-blue-500', category: 'Engagement', description: 'Avg sessions per user' },
  { id: 'avg_virtual_balance', title: 'Virtual Balance', value: '—', icon: <Wallet className="w-4 h-4 text-white" />, color: 'bg-violet-500', category: 'Engagement', description: 'Avg virtual balance' },
  { id: 'screens_opened', title: 'Screens Opened', value: '—', icon: <Monitor className="w-4 h-4 text-white" />, color: 'bg-blue-500', category: 'Engagement', description: 'Avg screens opened per user' },
  { id: 'session_duration', title: 'Session Duration', value: '—', icon: <Clock className="w-4 h-4 text-white" />, color: 'bg-violet-500', category: 'Engagement', description: 'Avg session duration in seconds' },
  { id: 'daily_active_traders', title: 'Daily Active Traders', value: '—', icon: <Users className="w-4 h-4 text-white" />, color: 'bg-amber-500', category: 'Engagement', description: 'Avg daily active traders' },
  { id: 'trading_frequency', title: 'Trading Frequency', value: '—', icon: <Repeat className="w-4 h-4 text-white" />, color: 'bg-violet-500', category: 'Engagement', description: 'Avg trades per user' },

  // Trading
  { id: 'trades_per_user', title: 'Trades/User', value: '0', icon: <DollarSign className="w-4 h-4 text-white" />, color: 'bg-amber-500', category: 'Trading', description: 'Avg trades per user' },
  { id: 'order_open', title: 'Order Open', value: '—', icon: <ArrowUpRight className="w-4 h-4 text-white" />, color: 'bg-emerald-500', category: 'Trading', description: 'Avg orders opened per user' },
  { id: 'order_close', title: 'Order Close', value: '—', icon: <Hand className="w-4 h-4 text-white" />, color: 'bg-blue-500', category: 'Trading', description: 'Avg orders closed per user' },
  { id: 'win_rate', title: 'Win Rate', value: '0%', icon: <TrendingUp className="w-4 h-4 text-white" />, color: 'bg-emerald-500', category: 'Trading', description: 'Percentage of profitable trades' },
  { id: 'average_profit_loss', title: 'Avg P/L', value: '—', icon: <BarChart3 className="w-4 h-4 text-white" />, color: 'bg-blue-500', category: 'Trading', description: 'Avg profit/loss per trade' },
  { id: 'max_profit_trade', title: 'Max Profit', value: '—', icon: <ArrowUpRight className="w-4 h-4 text-white" />, color: 'bg-emerald-500', category: 'Trading', description: 'Max profit from single trade' },
  { id: 'max_loss_trade', title: 'Max Loss', value: '—', icon: <ArrowDownRight className="w-4 h-4 text-white" />, color: 'bg-pink-500', category: 'Trading', description: 'Max loss from single trade' },
  { id: 'average_holding_time', title: 'Avg Hold Time', value: '—', icon: <Clock className="w-4 h-4 text-white" />, color: 'bg-blue-500', category: 'Trading', description: 'Avg holding time in minutes' },

  // Retention
  { id: 'D1', title: 'D1 Retention', value: '0%', icon: <RotateCcw className="w-4 h-4 text-white" />, color: 'bg-amber-500', category: 'Retention', description: 'Active for 1+ days' },
  { id: 'D3', title: 'D3 Retention', value: '0%', icon: <RotateCcw className="w-4 h-4 text-white" />, color: 'bg-amber-500', category: 'Retention', description: 'Active for 3+ days' },
  { id: 'D7', title: 'D7 Retention', value: '0%', icon: <RotateCcw className="w-4 h-4 text-white" />, color: 'bg-amber-500', category: 'Retention', description: 'Active for 7+ days' },
  { id: 'D30', title: 'D30 Retention', value: '0%', icon: <RotateCcw className="w-4 h-4 text-white" />, color: 'bg-amber-500', category: 'Retention', description: 'Active for 30+ days' },
  { id: 'churn_rate', title: 'Churn Rate', value: '—', icon: <UserMinus className="w-4 h-4 text-white" />, color: 'bg-pink-500', category: 'Retention', description: 'Who stopped using app' },

];
