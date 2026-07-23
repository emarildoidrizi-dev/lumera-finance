"use client";

import { useEffect, useMemo, useState } from "react";
import { Landmark, TrendingDown, TrendingUp, WalletCards } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency } from "@/lib/financialOptions";
import styles from "./NetWorthLive.module.css";

type Debt = {
  id: string;
  user_id: string;
  name: string;
  current_balance_eur: number | string;
  status: string;
  updated_at: string;
};

type Transaction = {
  id: string;
  user_id: string;
  type: string;
  amount_eur: number | string;
  occurred_at: string | null;
  transaction_date: string;
};

export function NetWorthLive({
  userId,
  initialDebts,
  initialTransactions,
  initialError,
}: {
  userId: string;
  initialDebts: Debt[];
  initialTransactions: Transaction[];
  initialError: string;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [debts, setDebts] = useState(initialDebts);
  const [transactions, setTransactions] = useState(initialTransactions);

  useEffect(() => {
    const channel = supabase
      .channel(`net-worth-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "debts",
          filter: `user_id=eq.${userId}`,
        },
        (payload) =>
          setDebts((current) => {
            if (payload.eventType === "DELETE") {
              const id = (payload.old as { id?: string }).id;
              return current.filter((item) => item.id !== id);
            }
            const next = payload.new as Debt;
            return [next, ...current.filter((item) => item.id !== next.id)];
          }),
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "transactions",
          filter: `user_id=eq.${userId}`,
        },
        (payload) =>
          setTransactions((current) => {
            if (payload.eventType === "DELETE") {
              const id = (payload.old as { id?: string }).id;
              return current.filter((item) => item.id !== id);
            }
            const next = payload.new as Transaction;
            return [next, ...current.filter((item) => item.id !== next.id)];
          }),
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [supabase, userId]);

  const figures = useMemo(() => {
    const cashPosition = transactions.reduce((total, transaction) => {
      const amount = Number(transaction.amount_eur) || 0;
      return total + (transaction.type === "income" ? amount : -amount);
    }, 0);
    const liabilities = debts
      .filter((debt) => debt.status !== "paid_off")
      .reduce((total, debt) => total + Number(debt.current_balance_eur), 0);
    return {
      cashPosition,
      liabilities,
      netPosition: cashPosition - liabilities,
    };
  }, [debts, transactions]);

  return (
    <section className={styles.shell}>
      <header>
        <h1>Net worth</h1>
        <p>
          Your live financial position after subtracting every outstanding debt.
        </p>
      </header>

      {initialError ? <div className={styles.error}>{initialError}</div> : null}

      <div className={styles.cards}>
        <article>
          <WalletCards />
          <span>Recorded cash position</span>
          <strong>{formatCurrency(figures.cashPosition, "EUR")}</strong>
        </article>
        <article>
          <TrendingDown />
          <span>Total liabilities</span>
          <strong>{formatCurrency(figures.liabilities, "EUR")}</strong>
        </article>
        <article>
          <Landmark />
          <span>Net financial position</span>
          <strong className={figures.netPosition >= 0 ? styles.positive : styles.negative}>
            {formatCurrency(figures.netPosition, "EUR")}
          </strong>
        </article>
        <article>
          <TrendingUp />
          <span>Active debt accounts</span>
          <strong>{debts.filter((debt) => debt.status !== "paid_off").length}</strong>
        </article>
      </div>

      <div className={styles.panel}>
        <h2>Outstanding liabilities</h2>
        {debts.filter((debt) => debt.status !== "paid_off").length ? (
          debts
            .filter((debt) => debt.status !== "paid_off")
            .sort(
              (a, b) =>
                Number(b.current_balance_eur) - Number(a.current_balance_eur),
            )
            .map((debt) => (
              <div className={styles.row} key={debt.id}>
                <span>{debt.name}</span>
                <strong>
                  {formatCurrency(Number(debt.current_balance_eur), "EUR")}
                </strong>
              </div>
            ))
        ) : (
          <p className={styles.empty}>No outstanding debt.</p>
        )}
      </div>
    </section>
  );
}
