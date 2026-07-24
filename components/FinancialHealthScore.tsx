"use client";

import { useEffect, useMemo, useState } from "react";
import { Activity, ArrowUpRight, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { TYPE_BY_VALUE, type FlowDirection } from "@/lib/financialOptions";
import styles from "./FinancialHealthScore.module.css";

type Transaction = {
  id: string;
  type: string;
  amount: number | string;
  amount_eur: number | string | null;
  transaction_date: string;
};

type HealthBreakdown = {
  score: number;
  label: "Excellent" | "Healthy" | "Needs attention" | "At risk";
  summary: string;
  income: number;
  expenses: number;
  savings: number;
  netCashFlow: number;
  savingsRate: number;
};

const directionOf = (type: string): FlowDirection =>
  TYPE_BY_VALUE[type]?.direction ??
  (type === "income" ? "inflow" : "outflow");

const isSavingType = (type: string) =>
  type.toLowerCase().includes("saving");

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function calculateHealth(transactions: Transaction[]): HealthBreakdown {
  let income = 0;
  let expenses = 0;
  let savings = 0;

  for (const item of transactions) {
    const amount = Number(item.amount_eur ?? item.amount ?? 0);
    if (!Number.isFinite(amount)) continue;

    if (isSavingType(item.type)) {
      savings += amount;
      continue;
    }

    const direction = directionOf(item.type);

    if (direction === "inflow") income += amount;
    if (direction === "outflow") expenses += amount;
  }

  const netCashFlow = income - expenses - savings;
  const savingsRate = income > 0 ? savings / income : 0;
  const expenseRatio = income > 0 ? expenses / income : 1;

  // 40 points: positive cash flow
  const cashFlowScore =
    income > 0 ? clamp((netCashFlow / income) * 160 + 20, 0, 40) : 0;

  // 30 points: savings performance, full points at 20%+
  const savingsScore =
    income > 0 ? clamp((savingsRate / 0.2) * 30, 0, 30) : 0;

  // 20 points: spending pressure
  const spendingScore =
    income > 0 ? clamp((1 - expenseRatio) * 40, 0, 20) : 0;

  // 10 points: enough recorded activity to make the score meaningful
  const activityScore = clamp((transactions.length / 12) * 10, 0, 10);

  const score = Math.round(
    clamp(
      cashFlowScore + savingsScore + spendingScore + activityScore,
      0,
      100,
    ),
  );

  let label: HealthBreakdown["label"];
  let summary: string;

  if (score >= 80) {
    label = "Excellent";
    summary = "Your recorded cash flow and saving habits show a strong foundation.";
  } else if (score >= 65) {
    label = "Healthy";
    summary = "Your finances are generally stable, with room for focused improvement.";
  } else if (score >= 45) {
    label = "Needs attention";
    summary = "Your current records indicate pressure in cash flow or saving consistency.";
  } else {
    label = "At risk";
    summary = "Your recorded outflows are placing significant pressure on your finances.";
  }

  return {
    score,
    label,
    summary,
    income,
    expenses,
    savings,
    netCashFlow,
    savingsRate,
  };
}

export function FinancialHealthScore() {
  const supabase = useMemo(() => createClient(), []);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!mounted || !user) {
        if (mounted) setLoading(false);
        return;
      }

      const { data } = await supabase
        .from("transactions")
        .select("id,type,amount,amount_eur,transaction_date")
        .eq("user_id", user.id);

      if (mounted) {
        setTransactions((data ?? []) as Transaction[]);
        setLoading(false);
      }

      channel = supabase
        .channel(`financial-health-${user.id}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "transactions",
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            setTransactions((current) => {
              if (payload.eventType === "DELETE") {
                const deletedId = (payload.old as { id?: string }).id;
                return current.filter((item) => item.id !== deletedId);
              }

              const changed = payload.new as Transaction;
              if (!changed?.id) return current;

              return [
                changed,
                ...current.filter((item) => item.id !== changed.id),
              ];
            });
          },
        )
        .subscribe();
    }

    void load();

    function refresh() {
      void load();
    }

    window.addEventListener("lumera:data-change", refresh);
    window.addEventListener("ficonter:data-change", refresh);

    return () => {
      mounted = false;
      window.removeEventListener("lumera:data-change", refresh);
      window.removeEventListener("ficonter:data-change", refresh);
      if (channel) void supabase.removeChannel(channel);
    };
  }, [supabase]);

  const health = useMemo(
    () => calculateHealth(transactions),
    [transactions],
  );

  const circumference = 2 * Math.PI * 46;
  const dashOffset =
    circumference - (health.score / 100) * circumference;

  return (
    <section className={styles.card} aria-label="Financial health score">
      <div className={styles.header}>
        <div>
          <span className={styles.eyebrow}>Financial health</span>
          <h2>Your financial score</h2>
        </div>
        <div className={styles.live}>
          <span />
          Live
        </div>
      </div>

      <div className={styles.content}>
        <div className={styles.gaugeWrap}>
          <svg
            className={styles.gauge}
            viewBox="0 0 112 112"
            role="img"
            aria-label={`Financial health score ${health.score} out of 100`}
          >
            <circle
              className={styles.gaugeTrack}
              cx="56"
              cy="56"
              r="46"
            />
            <circle
              className={styles.gaugeValue}
              cx="56"
              cy="56"
              r="46"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
            />
          </svg>

          <div className={styles.score}>
            <strong>{loading ? "—" : health.score}</strong>
            <span>/ 100</span>
          </div>
        </div>

        <div className={styles.assessment}>
          <div className={styles.statusRow}>
            <ShieldCheck size={18} />
            <strong>{loading ? "Calculating" : health.label}</strong>
          </div>

          <p>
            {loading
              ? "Reviewing your recorded financial activity."
              : health.summary}
          </p>

          <div className={styles.metrics}>
            <div>
              <span>Savings rate</span>
              <strong>
                {loading
                  ? "—"
                  : `${(health.savingsRate * 100).toFixed(1)}%`}
              </strong>
            </div>
            <div>
              <span>Net cash flow</span>
              <strong>
                {loading
                  ? "—"
                  : new Intl.NumberFormat("de-DE", {
                      style: "currency",
                      currency: "EUR",
                    }).format(health.netCashFlow)}
              </strong>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.footer}>
        <Activity size={15} />
        <span>
          Based on recorded income, expenses, savings and cash flow.
        </span>
        <ArrowUpRight size={15} />
      </div>

      <p className={styles.disclaimer}>
        This is a Ficonter planning indicator, not a credit score or financial
        advice.
      </p>
    </section>
  );
}
