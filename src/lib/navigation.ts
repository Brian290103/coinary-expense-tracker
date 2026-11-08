import { ArrowLeftRight, Gift, Home, PieChart, Repeat, Settings, Target, UserRound } from 'lucide-react';

// Single source of truth for primary navigation — used by the mobile bottom
// bar and the tablet/desktop sidebar so routes and labels never diverge.
// `bottomBar` marks the five mobile tabs; the sidebar shows every item.
export const NAV_ITEMS = [
  { to: '/', label: 'Home', short: 'Home', icon: Home, bottomBar: true },
  { to: '/transactions', label: 'Activity', short: 'Activity', icon: ArrowLeftRight, bottomBar: true },
  { to: '/insights', label: 'Insights', short: 'Insights', icon: PieChart, bottomBar: true },
  { to: '/budgets', label: 'Budgets', short: 'Budgets', icon: Target, bottomBar: true },
  { to: '/goals', label: 'Savings goals', short: 'Goals', icon: Gift, bottomBar: false },
  { to: '/recurring', label: 'Recurring', short: 'Repeat', icon: Repeat, bottomBar: false },
  { to: '/profile', label: 'Profile', short: 'Profile', icon: UserRound, bottomBar: true },
  { to: '/settings', label: 'Settings', short: 'Settings', icon: Settings, bottomBar: false },
];
