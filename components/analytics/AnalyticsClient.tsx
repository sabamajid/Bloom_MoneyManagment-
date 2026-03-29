"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Card, CardKicker, CardTitle } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import { formatMoney, monthKeyFromDate } from "@/lib/format";
import type { Expense } from "@/types/expense";

const PIE_COLORS = ["#f472b6", "#a78bfa", "#fb7185", "#60a5fa", "#34d399", "#fbbf24"];

function normalizeAmount(amount: Expense["amount"]) {
  if (typeof amount === "number") return amount;
  const n = Number.parseFloat(amount);
  return Number.isFinite(n) ? n : 0;
}

function moneyTooltip(value: unknown) {
  const n =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number.parseFloat(value)
        : NaN;
  return Number.isFinite(n) ? formatMoney(n) : "PKR 0.00";
}

export function AnalyticsClient() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      const res = await fetch("/api/expenses");
      const payload = (await res.json()) as { error?: string; expenses?: Expense[] };
      if (cancelled) return;
      if (!res.ok) return setError(payload.error ?? "Could not load analytics.");
      setExpenses(payload.expenses ?? []);
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  const pieData = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of expenses) {
      if ((e.spend_source ?? "budget") !== "budget") continue;
      const amt = normalizeAmount(e.amount);
      map.set(e.category, (map.get(e.category) ?? 0) + amt);
    }
    return [...map.entries()].map(([name, value]) => ({ name, value }));
  }, [expenses]);

  const barData = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of expenses) {
      if ((e.spend_source ?? "budget") !== "budget") continue;
      const month = monthKeyFromDate(new Date(e.date));
      map.set(month, (map.get(month) ?? 0) + normalizeAmount(e.amount));
    }
    return [...map.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-6)
      .map(([month, total]) => ({ month, total }));
  }, [expenses]);

  const lineData = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of expenses) {
      if ((e.spend_source ?? "budget") !== "budget") continue;
      const d = new Date(e.date);
      if (Number.isNaN(d.getTime())) continue;
      const day = d.toISOString().slice(0, 10);
      map.set(day, (map.get(day) ?? 0) + normalizeAmount(e.amount));
    }
    return [...map.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-30)
      .map(([day, total]) => ({ day: day.slice(5), total }));
  }, [expenses]);

  return (
    <div className="space-y-10">
      <PageHeader
        title="Analytics"
        description="Charts include budget spending only. Savings spending is tracked under Accounts & savings."
      />

      {error ? (
        <div className="rounded-2xl border border-rose-200/80 bg-rose-50/70 px-4 py-3 text-sm font-semibold text-rose-900">
          {error}
        </div>
      ) : null}

      <Section title="Overview">
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="h-[360px]">
          <CardKicker>By category</CardKicker>
          <CardTitle className="mt-2 text-base">Distribution</CardTitle>
          <div className="mt-4 h-[270px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" outerRadius={95} innerRadius={45}>
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => moneyTooltip(v)} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="h-[360px]">
          <CardKicker>By month</CardKicker>
          <CardTitle className="mt-2 text-base">Last 6 months</CardTitle>
          <div className="mt-4 h-[270px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(v) => moneyTooltip(v)} />
                <Bar dataKey="total" fill="#a78bfa" radius={[10, 10, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
      </Section>

      <Section title="Activity">
      <Card className="h-[380px]">
        <CardKicker>30 days</CardKicker>
        <CardTitle className="mt-2 text-base">Daily</CardTitle>
        <div className="mt-4 h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={lineData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip formatter={(v) => moneyTooltip(v)} />
              <Line type="monotone" dataKey="total" stroke="#f472b6" strokeWidth={3} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>
      </Section>
    </div>
  );
}
