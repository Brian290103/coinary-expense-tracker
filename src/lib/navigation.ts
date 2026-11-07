import { ArrowLeftRight, Home, PieChart, Settings, Target } from 'lucide-react';

// Single source of truth for primary navigation — used by the mobile bottom
// bar and the tablet/desktop sidebar so routes and labels never diverge.
export const NAV_ITEMS = [
  { to: '/', label: 'Home', short: 'Home', icon: Home },
  { to: '/transactions', label: 'Transactions', short: 'Activity', icon: ArrowLeftRight },
  { to: '/insights', label: 'Insights', short: 'Insights', icon: PieChart },
  { to: '/budgets', label: 'Budgets', short: 'Budgets', icon: Target },
  { to: '/settings', label: 'Settings', short: 'Settings', icon: Settings },
];
