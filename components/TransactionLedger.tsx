"use client";

import { FormEvent, useMemo, useState } from "react";
import { Pencil, Search, Trash2, X } from "lucide-react";
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
type SortMode = "newest" | "oldest" | "highest" | "lowest";

const money = (value: number) =>
  new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(value);

const readableDate = (value: string) =>
  new Date(`${value}T00:00:00`).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

export function TransactionLedger({ transactions: initialTransactions }: Props) {
  const supabase = useMemo(() => createClient(), []);
  const [transactions, setTransactions] = useState(initialTransactions);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sortMode, setSortMode] = useState<SortMode>("newest");
  const [editTarget, setEditTarget] = useState<Transaction | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Transaction | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const categories = useMemo(
    () => [...new Set(transactions.map((item) => item.category))].sort(),
    [transactions],
  );

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
        return matchesSearch && matchesType && matchesCategory;
      })
      .sort((a, b) => {
        if (sortMode === "oldest") return a.transaction_date.localeCompare(b.transaction_date);
        if (sortMode === "highest") return Number(b.amount) - Number(a.amount);
        if (sortMode === "lowest") return Number(a.amount) - Number(b.amount);
        return b.transaction_date.localeCompare(a.transaction_date);
      });
  }, [transactions, search, typeFilter, categoryFilter, sortMode]);

  const totals = useMemo(() => {
    const income = visible
      .filter((item) => item.type === "income")
      .reduce((sum, item) => sum + Number(item.amount), 0);
    const expenses = visible
      .filter((item) => item.type === "expense")
      .reduce((sum, item) => sum + Number(item.amount), 0);
    return { income, expenses, net: income - expenses };
  }, [visible]);

  async function deleteTransaction() {
    if (!deleteTarget) return;
    setLoading(true);
    setError("");

    const { error: deleteError } = await supabase
      .from("transactions")
      .delete()
      .eq("id", deleteTarget.id);

    if (deleteError) {
      setError(deleteError.message);
    } else {
      setTransactions((current) => current.filter((item) => item.id !== deleteTarget.id));
      setDeleteTarget(null);
    }
    setLoading(false);
  }

  async function updateTransaction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editTarget) return;
    setLoading(true);
    setError("");

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
    }
    setLoading(false);
  }

  if (!transactions.length) return <div className={styles.empty}>No transactions yet.</div>;

  return (
    <>
      <div className={styles.toolbar}>
        <label className={styles.searchBox}>
          <Search size={17} aria-hidden="true" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search transactions"
            aria-label="Search transactions"
          />
        </label>
        <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value as TypeFilter)}>
          <option value="all">All types</option>
          <option value="income">Income</option>
          <option value="expense">Expenses</option>
        </select>
        <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
          <option value="all">All categories</option>
          {categories.map((category) => <option key={category}>{category}</option>)}
        </select>
        <select value={sortMode} onChange={(event) => setSortMode(event.target.value as SortMode)}>
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="highest">Highest amount</option>
          <option value="lowest">Lowest amount</option>
        </select>
      </div>

      <div className={styles.summary}>
        <div><span>Income</span><strong className={styles.positive}>{money(totals.income)}</strong></div>
        <div><span>Expenses</span><strong className={styles.negative}>{money(totals.expenses)}</strong></div>
        <div><span>Net movement</span><strong className={totals.net >= 0 ? styles.positive : styles.negative}>{money(totals.net)}</strong></div>
      </div>

      <div className={styles.recordCount}>
        {visible.length} {visible.length === 1 ? "record" : "records"}
      </div>

      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.list}>
        {visible.map((transaction) => (
          <article className={styles.row} key={transaction.id}>
            <div className={transaction.type === "income" ? styles.incomeMark : styles.expenseMark} />
            <div className={styles.details}>
              <strong>{transaction.description}</strong>
              <span>{transaction.category} · {readableDate(transaction.transaction_date)}</span>
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
