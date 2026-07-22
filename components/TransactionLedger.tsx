"use client";

import { FormEvent, useMemo, useState } from "react";
import {
  CalendarDays,
  Download,
  Pencil,
  RotateCcw,
  Search,
  Trash2,
  TrendingDown,
  TrendingUp,
  WalletCards,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import styles from "./TransactionLedger.module.css";

type Transaction = {
  id: string;
  description: string;
  amount: number | string;
  type: "income" | "expense";
  category: string;
  transaction_date: string;
};

type Props = { transactions: Transaction[] };
type TypeFilter = "all" | "income" | "expense";
type SortMode = "newest" | "oldest" | "highest" | "lowest" | "description";

const money = (value: number) =>
  new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(value);

const readableDate = (value: string) =>
  new Date(`${value}T00:00:00`).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

const csvCell = (value: string | number) => `"${String(value).replaceAll('"', '""')}"`;

export function TransactionLedger({ transactions: initialTransactions }: Props) {
  const supabase = useMemo(() => createClient(), []);
  const [transactions, setTransactions] = useState(initialTransactions);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [monthFilter, setMonthFilter] = useState("all");
  const [sortMode, setSortMode] = useState<SortMode>("newest");
  const [editTarget, setEditTarget] = useState<Transaction | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Transaction | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const categories = useMemo(
    () => [...new Set(transactions.map((item) => item.category))].sort(),
    [transactions],
  );

  const months = useMemo(() => {
    const values = [...new Set(transactions.map((item) => item.transaction_date.slice(0, 7)))];
    return values.sort((a, b) => b.localeCompare(a));
  }, [transactions]);

  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();
    return transactions
      .filter((item) => {
        const matchesSearch =
          !query ||
          item.description.toLowerCase().includes(query) ||
          item.category.toLowerCase().includes(query);
        const matchesType = typeFilter === "all" || item.type === typeFilter;
        const matchesCategory = categoryFilter === "all" || item.category === categoryFilter;
        const matchesMonth = monthFilter === "all" || item.transaction_date.startsWith(monthFilter);
        return matchesSearch && matchesType && matchesCategory && matchesMonth;
      })
      .sort((a, b) => {
        if (sortMode === "oldest") return a.transaction_date.localeCompare(b.transaction_date);
        if (sortMode === "highest") return Number(b.amount) - Number(a.amount);
        if (sortMode === "lowest") return Number(a.amount) - Number(b.amount);
        if (sortMode === "description") return a.description.localeCompare(b.description);
        return b.transaction_date.localeCompare(a.transaction_date);
      });
  }, [transactions, search, typeFilter, categoryFilter, monthFilter, sortMode]);

  const totals = useMemo(() => {
    const income = visible
      .filter((item) => item.type === "income")
      .reduce((sum, item) => sum + Number(item.amount), 0);
    const expenses = visible
      .filter((item) => item.type === "expense")
      .reduce((sum, item) => sum + Number(item.amount), 0);
    const net = income - expenses;
    const average = visible.length
      ? visible.reduce((sum, item) => sum + Number(item.amount), 0) / visible.length
      : 0;
    return { income, expenses, net, average };
  }, [visible]);

  const rowsWithBalance = useMemo(() => {
    const chronological = [...visible].sort((a, b) =>
      a.transaction_date.localeCompare(b.transaction_date),
    );
    let running = 0;
    const balances = new Map<string, number>();
    chronological.forEach((item) => {
      running += item.type === "income" ? Number(item.amount) : -Number(item.amount);
      balances.set(item.id, running);
    });
    return visible.map((item) => ({ ...item, runningBalance: balances.get(item.id) ?? 0 }));
  }, [visible]);

  function clearFilters() {
    setSearch("");
    setTypeFilter("all");
    setCategoryFilter("all");
    setMonthFilter("all");
    setSortMode("newest");
  }

  function exportCsv() {
    const header = ["Description", "Category", "Date", "Type", "Amount", "Running balance"];
    const rows = rowsWithBalance.map((item) => [
      item.description,
      item.category,
      item.transaction_date,
      item.type,
      Number(item.amount).toFixed(2),
      item.runningBalance.toFixed(2),
    ]);
    const csv = [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `lumera-transactions-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
    setNotice("CSV export downloaded.");
    window.setTimeout(() => setNotice(""), 2600);
  }

  async function deleteTransaction() {
    if (!deleteTarget) return;
    setLoading(true);
    setError("");
    setNotice("");

    const { error: deleteError } = await supabase
      .from("transactions")
      .delete()
      .eq("id", deleteTarget.id);

    if (deleteError) {
      setError(deleteError.message);
    } else {
      setTransactions((current) => current.filter((item) => item.id !== deleteTarget.id));
      setDeleteTarget(null);
      setNotice("Transaction deleted.");
      window.setTimeout(() => setNotice(""), 2600);
    }
    setLoading(false);
  }

  async function updateTransaction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editTarget) return;
    setLoading(true);
    setError("");
    setNotice("");

    const form = new FormData(event.currentTarget);
    const update = {
      description: String(form.get("description") ?? "").trim(),
      amount: Number(form.get("amount")),
      type: String(form.get("type")) as "income" | "expense",
      category: String(form.get("category") ?? "").trim(),
      transaction_date: String(form.get("date")),
    };

    const { data, error: updateError } = await supabase
      .from("transactions")
      .update(update)
      .eq("id", editTarget.id)
      .select("id,description,amount,type,category,transaction_date")
      .single();

    if (updateError) {
      setError(updateError.message);
    } else if (data) {
      setTransactions((current) => current.map((item) => (item.id === data.id ? data : item)));
      setEditTarget(null);
      setNotice("Transaction updated.");
      window.setTimeout(() => setNotice(""), 2600);
    }
    setLoading(false);
  }

  if (!transactions.length) return <div className={styles.empty}>No transactions yet.</div>;

  return (
    <>
      <div className={styles.toolbarTop}>
        <label className={styles.searchBox}>
          <Search size={17} aria-hidden="true" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search description or category"
            aria-label="Search transactions"
          />
        </label>
        <button className={styles.secondaryAction} type="button" onClick={clearFilters}>
          <RotateCcw size={16} /> Reset
        </button>
        <button className={styles.exportButton} type="button" onClick={exportCsv} disabled={!visible.length}>
          <Download size={16} /> Export CSV
        </button>
      </div>

      <div className={styles.toolbar}>
        <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value as TypeFilter)}>
          <option value="all">All types</option>
          <option value="income">Income</option>
          <option value="expense">Expenses</option>
        </select>
        <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
          <option value="all">All categories</option>
          {categories.map((category) => <option key={category}>{category}</option>)}
        </select>
        <select value={monthFilter} onChange={(event) => setMonthFilter(event.target.value)}>
          <option value="all">All months</option>
          {months.map((month) => (
            <option key={month} value={month}>
              {new Date(`${month}-01T00:00:00`).toLocaleDateString("en-GB", { month: "long", year: "numeric" })}
            </option>
          ))}
        </select>
        <select value={sortMode} onChange={(event) => setSortMode(event.target.value as SortMode)}>
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="highest">Highest amount</option>
          <option value="lowest">Lowest amount</option>
          <option value="description">Description A–Z</option>
        </select>
      </div>

      <div className={styles.summary}>
        <div><TrendingUp size={18} /><span>Filtered income</span><strong className={styles.positive}>{money(totals.income)}</strong></div>
        <div><TrendingDown size={18} /><span>Filtered expenses</span><strong className={styles.negative}>{money(totals.expenses)}</strong></div>
        <div><WalletCards size={18} /><span>Net movement</span><strong className={totals.net >= 0 ? styles.positive : styles.negative}>{money(totals.net)}</strong></div>
        <div><CalendarDays size={18} /><span>Average transaction</span><strong>{money(totals.average)}</strong></div>
      </div>

      <div className={styles.recordCount}>
        Showing {visible.length} of {transactions.length} {transactions.length === 1 ? "record" : "records"}
      </div>

      {notice && <div className={styles.notice}>{notice}</div>}
      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.list}>
        {rowsWithBalance.map((transaction) => (
          <article className={styles.row} key={transaction.id}>
            <div className={transaction.type === "income" ? styles.incomeMark : styles.expenseMark} />
            <div className={styles.details}>
              <strong>{transaction.description}</strong>
              <span>{transaction.category} · {readableDate(transaction.transaction_date)}</span>
            </div>
            <div className={styles.balanceBlock}>
              <span>Running balance</span>
              <strong className={transaction.runningBalance >= 0 ? styles.positive : styles.negative}>
                {money(transaction.runningBalance)}
              </strong>
            </div>
            <div className={styles.amountBlock}>
              <strong className={transaction.type === "income" ? styles.positive : styles.negative}>
                {transaction.type === "income" ? "+" : "-"}{money(Number(transaction.amount))}
              </strong>
              <span>{transaction.type === "income" ? "Income" : "Expense"}</span>
            </div>
            <div className={styles.actions}>
              <button type="button" onClick={() => { setError(""); setEditTarget(transaction); }} aria-label="Edit transaction">
                <Pencil size={17} /><span>Edit</span>
              </button>
              <button className={styles.deleteButton} type="button" onClick={() => { setError(""); setDeleteTarget(transaction); }} aria-label="Delete transaction">
                <Trash2 size={17} /><span>Delete</span>
              </button>
            </div>
          </article>
        ))}
      </div>

      {!visible.length && <div className={styles.empty}>No transactions match your filters.</div>}

      {editTarget && (
        <div className={styles.backdrop} onMouseDown={() => !loading && setEditTarget(null)}>
          <div className={styles.modal} onMouseDown={(event) => event.stopPropagation()} role="dialog" aria-modal="true">
            <button className={styles.close} type="button" onClick={() => setEditTarget(null)}><X size={18} /></button>
            <small>LEDGER ADJUSTMENT</small>
            <h3>Edit transaction</h3>
            <form onSubmit={updateTransaction}>
              <label>Description<input name="description" defaultValue={editTarget.description} required /></label>
              <div className={styles.formGrid}>
                <label>Amount (€)<input name="amount" type="number" min="0.01" step="0.01" defaultValue={Number(editTarget.amount)} required /></label>
                <label>Type<select name="type" defaultValue={editTarget.type}><option value="expense">Expense</option><option value="income">Income</option></select></label>
                <label>Category<input name="category" defaultValue={editTarget.category} required /></label>
                <label>Date<input name="date" type="date" defaultValue={editTarget.transaction_date} required /></label>
              </div>
              {error && <div className={styles.error}>{error}</div>}
              <div className={styles.modalActions}>
                <button type="button" onClick={() => setEditTarget(null)} disabled={loading}>Cancel</button>
                <button className={styles.primaryButton} type="submit" disabled={loading}>{loading ? "Saving…" : "Save changes"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className={styles.backdrop} onMouseDown={() => !loading && setDeleteTarget(null)}>
          <div className={`${styles.modal} ${styles.smallModal}`} onMouseDown={(event) => event.stopPropagation()} role="alertdialog" aria-modal="true">
            <button className={styles.close} type="button" onClick={() => setDeleteTarget(null)}><X size={18} /></button>
            <small>PERMANENT ACTION</small>
            <h3>Delete transaction?</h3>
            <p>“{deleteTarget.description}” will be permanently removed. This cannot be undone.</p>
            {error && <div className={styles.error}>{error}</div>}
            <div className={styles.modalActions}>
              <button type="button" onClick={() => setDeleteTarget(null)} disabled={loading}>Cancel</button>
              <button className={styles.dangerButton} type="button" onClick={deleteTransaction} disabled={loading}>{loading ? "Deleting…" : "Delete transaction"}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
