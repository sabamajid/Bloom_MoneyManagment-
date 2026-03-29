import type { LucideIcon } from "lucide-react";
import {
  Baby,
  Coffee,
  Fuel,
  HeartPulse,
  Home,
  PiggyBank,
  ShoppingBag,
  Sparkles,
  Wallet,
  Wifi,
} from "lucide-react";

export type CategoryDefinition = {
  /**
   * Stored in Supabase `expenses.category`
   */
  value: string;
  label: string;
  hint: string;
  icon: LucideIcon;
  swatchClassName: string;
};

/**
 * Predefined categories with cute, consistent iconography for the UI.
 * Users only pick from this list in the MVP (validated on the API too).
 */
export const EXPENSE_CATEGORIES = [
  {
    value: "Food",
    label: "Food",
    hint: "Groceries, treats, coffee runs",
    icon: Coffee,
    swatchClassName: "bg-rose-200/80 text-rose-950 ring-rose-300/60",
  },
  {
    value: "Bills",
    label: "Bills",
    hint: "Rent, utilities, insurance",
    icon: Home,
    swatchClassName: "bg-violet-200/80 text-violet-950 ring-violet-300/60",
  },
  {
    value: "Shopping",
    label: "Shopping",
    hint: "Clothes, beauty, little luxuries",
    icon: ShoppingBag,
    swatchClassName: "bg-fuchsia-200/80 text-fuchsia-950 ring-fuchsia-300/60",
  },
  {
    value: "Baby",
    label: "Baby",
    hint: "Diapers, daycare, tiny essentials",
    icon: Baby,
    swatchClassName: "bg-pink-200/80 text-pink-950 ring-pink-300/60",
  },
  {
    value: "Self-care",
    label: "Self-care",
    hint: "Wellness, skincare, spa days",
    icon: Sparkles,
    swatchClassName: "bg-emerald-200/80 text-emerald-950 ring-emerald-300/60",
  },
  {
    value: "Health",
    label: "Health",
    hint: "Pharmacy, checkups, fitness",
    icon: HeartPulse,
    swatchClassName: "bg-sky-200/80 text-sky-950 ring-sky-300/60",
  },
  {
    value: "Transport",
    label: "Transport",
    hint: "Gas, rides, parking",
    icon: Fuel,
    swatchClassName: "bg-amber-200/80 text-amber-950 ring-amber-300/60",
  },
  {
    value: "Subscriptions",
    label: "Subscriptions",
    hint: "Streaming, apps, memberships",
    icon: Wifi,
    swatchClassName: "bg-indigo-200/80 text-indigo-950 ring-indigo-300/60",
  },
  {
    value: "Savings",
    label: "Savings",
    hint: "Transfers, goals, rainy day",
    icon: PiggyBank,
    swatchClassName: "bg-lime-200/80 text-lime-950 ring-lime-300/60",
  },
  {
    value: "Other",
    label: "Other",
    hint: "Everything else, gently tucked away",
    icon: Wallet,
    swatchClassName: "bg-stone-200/80 text-stone-900 ring-stone-300/60",
  },
] as const satisfies readonly CategoryDefinition[];

export const CATEGORY_VALUES = EXPENSE_CATEGORIES.map((c) => c.value);
export const DEFAULT_CATEGORY_NAMES = [...CATEGORY_VALUES];

export type ExpenseCategoryValue = (typeof EXPENSE_CATEGORIES)[number]["value"];

export function isExpenseCategoryValue(value: string): value is ExpenseCategoryValue {
  return (CATEGORY_VALUES as readonly string[]).includes(value);
}

export function isValidCategoryName(value: unknown): value is string {
  return typeof value === "string" && value.trim().length >= 2 && value.trim().length <= 40;
}

export function getCategoryMeta(value: string) {
  return (
    EXPENSE_CATEGORIES.find((c) => c.value === value) ??
    ({
      value,
      label: value,
      hint: "Custom category",
      icon: Wallet,
      swatchClassName: "bg-stone-200/80 text-stone-900 ring-stone-300/60",
    } satisfies CategoryDefinition)
  );
}
