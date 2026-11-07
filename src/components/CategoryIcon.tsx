import {
  Utensils, ShoppingBasket, Car, Home, Zap, ShoppingBag, HeartPulse, GraduationCap,
  Film, Plane, Gift, Repeat, Receipt, PiggyBank, CircleEllipsis, Briefcase, Laptop,
  Building2, TrendingUp, RotateCcw, Banknote, Landmark, Smartphone, CreditCard,
  Wallet, Tag, CircleDollarSign, Coffee, Dumbbell, PawPrint, Baby, Wrench, Camera,
  Stethoscope, BookOpen, Fuel, Bus, Train, Bike, Music, Gamepad2, Shirt, Scissors,
} from 'lucide-react';

export const ICON_MAP = {
  utensils: Utensils,
  'shopping-basket': ShoppingBasket,
  car: Car,
  home: Home,
  zap: Zap,
  'shopping-bag': ShoppingBag,
  'heart-pulse': HeartPulse,
  'graduation-cap': GraduationCap,
  film: Film,
  plane: Plane,
  gift: Gift,
  repeat: Repeat,
  receipt: Receipt,
  'piggy-bank': PiggyBank,
  'circle-ellipsis': CircleEllipsis,
  briefcase: Briefcase,
  laptop: Laptop,
  'building-2': Building2,
  'trending-up': TrendingUp,
  'rotate-ccw': RotateCcw,
  banknote: Banknote,
  landmark: Landmark,
  smartphone: Smartphone,
  'credit-card': CreditCard,
  wallet: Wallet,
  tag: Tag,
  coins: CircleDollarSign,
  coffee: Coffee,
  dumbbell: Dumbbell,
  paw: PawPrint,
  baby: Baby,
  wrench: Wrench,
  camera: Camera,
  stethoscope: Stethoscope,
  book: BookOpen,
  fuel: Fuel,
  bus: Bus,
  train: Train,
  bike: Bike,
  music: Music,
  gamepad: Gamepad2,
  shirt: Shirt,
  scissors: Scissors,
};

export const ICON_OPTIONS = Object.keys(ICON_MAP);

import type { CSSProperties } from 'react';

export default function CategoryIcon({ name, size = 18, style, ...props }: { name?: string; size?: number; style?: CSSProperties; [key: string]: unknown }) {
  const Icon = (name && ICON_MAP[name as keyof typeof ICON_MAP]) || Tag;
  return <Icon size={size} strokeWidth={1.9} style={style} {...props} />;
}
