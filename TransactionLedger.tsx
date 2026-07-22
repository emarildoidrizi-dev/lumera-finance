"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
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
import {
  CATEGORY_GROUPS,
  CURRENCY_CODES,
  TRANSACTION_TYPES,
  TYPE_BY_VALUE,
  currencyName,
  currencySymbol,
  formatCurrency,
  type FlowDirection,
} from "@/lib/financialOptions";
import styles from "./TransactionLedger.module.css";

type Transaction = {
  id: string;
  description: string;
  amount: number | string;
  currency: string;
  type: string;
  category: string;
  transaction_date: string;
};

type Props = { transactions: Transaction[] };
type DirectionFilter = "all" | FlowDirection;
type SortMode = "newest" | "oldest" | "highest" | "lowest" | "description";

const readableDate = (value: string) =>
  new Date(`${value}T00:00:00`).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

const csvCell = (value: string | number) => `"${String(value).replaceAll('"', '""')}"`;
const directionOf = (type: string): FlowDirection => TYPE_BY_VALUE[type]?.direction ?? (type === "income" ? "inflow" : "outflow");
const typeLabel = (type: string) => TYPE_BY_VALUE[type]?.label ?? type.replaceAll("_", " ");

const groupedTypes = TRANSACTION_TYPES.reduce<Record<string, typeof TRANSACTION_TYPES>>(
  (groups, option) => {
    groups[option.group] ??= [];
    groups[option.group].push(option);
    return groups;
  },
  {},
);

function aggregateByCurrency(transactions: Transaction[], direction?: FlowDirection) {
  const totals = new Map<string, number>();
  transactions.forEach((item) => {
    const itemDirection = directionOf(item.type);
    if (direction && itemDirection !== direction) return;
    const sign = itemDirection === "inflow" ? 1 : itemDirection === "outflow" ? -1 : 0;
    const value = direction ? Number(item.amount) : Number(item.amount) * sign;
    totals.set(item.currency || "EUR", (totals.get(item.currency || "EUR") ?? 0) + value);
  });
  return totals;
}

function CurrencyTotals({ totals, negative = false }: { totals: Map<string, number>; negative?: boolean }) {
  if (!totals.size) return <>{formatCurrency(0, "EUR")}</>;
  return (
    <span className={styles.currencyTotals}>
      {[...totals.entries()].map(([currency, total]) => (
        <span key={currency}>{formatCurrency(negative ? Math.abs(total) : total, currency)}</span>
      ))}
    </span>
  );
}

export function TransactionLedger({ transactions: initialTransactions }: Props) {
  const supabase = useMemo(() => createClient(), []);
  const [transactions, setTransactions] = useState(initialTransactions);
  const [search, setSearch] = useState("");
  const [directionFilter, setDirectionFilter] = useState<DirectionFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [currencyFilter, setCurrencyFilter] = useState("all");
  const [monthFilter, setMonthFilter] = useState("all");
  const [sortMode, setSortMode] = useState<SortMode>("newest");
  const [editTarget, setEditTarget] = useState<Transaction | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Transaction | null>(null);
  const [editCategory, setEditCategory] = useState("");
  const [customEditCategory, setCustomEditCategory] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    function handleCreated(event: Event) {
      const created = (event as CustomEvent<Transaction>).detail;
      if (!created?.id) return;

      setTransactions((current) => {
        if (current.some((item) => item.id === created.id)) return current;
        return [created, ...current];
      });
      setNotice("Transaction saved.");
      window.setTimeout(() => setNotice(""), 2600);
    }

    window.addEventListener("lumera:transaction-created", handleCreated);
    return () => window.removeEventListener("lumera:transaction-created", handleCreated);
  }, []);

  const categories = useMemo(
    () => [...new Set(transactions.map((item) => item.category))].sort(),
    [transactions],
  );
  const currencies = useMemo(
    () => [...new Set(transactions.map((item) => item.currency || "EUR"))].sort(),
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
          item.category.toLowerCase().includes(query) ||
          typeLabel(item.type).toLowerCase().includes(query) ||
          (item.currency || "EUR").toLowerCase().includes(query);
        const matchesDirection = directionFilter === "all" || directionOf(item.type) === directionFilter;
        const matchesCategory = categoryFilter === "all" || item.category === categoryFilter;
        const matchesCurrency = currencyFilter === "all" || (item.currency || "EUR") === currencyFilter;
        const matchesMonth = monthFilter === "all" || item.transaction_date.startsWith(monthFilter);
        return matchesSearch && matchesDirection && matchesCategory && matchesCurrency && matchesMonth;
      })
      .sort((a, b) => {
        if (sortMode === "oldest") return a.transaction_date.localeCompare(b.transaction_date);
        if (sortMode === "highest") return Number(b.amount) - Number(a.amount);
        if (sortMode === "lowest") return Number(a.amount) - Number(b.amount);
        if (sortMode === "description") return a.description.localeCompare(b.description);
        return b.transaction_date.localeCompare(a.transaction_date);
      });
  }, [transactions, search, directionFilter, categoryFilter, currencyFilter, monthFilter, sortMode]);

  const totals = useMemo(() => ({
    inflow: aggregateByCurrency(visible, "inflow"),
    outflow: aggregateByCurrency(visible, "outflow"),
    net: aggregateByCurrency(visible),
    neutralCount: visible.filter((item) => directionOf(item.type) === "neutral").length,
  }), [visible]);

  const rowsWithBalance = useMemo(() => {
    const chronological = [...visible].sort((a, b) => a.transaction_date.localeCompare(b.transaction_date));
    const runningByCurrency = new Map<string, number>();
    const balances = new Map<string, number>();
    chronological.forEach((item) => {
      const currency = item.currency || "EUR";
      const direction = directionOf(item.type);
      const sign = direction === "inflow" ? 1 : direction === "outflow" ? -1 : 0;
      const running = (runningByCurrency.get(currency) ?? 0) + Number(item.amount) * sign;
      runningByCurrency.set(currency, running);
      balances.set(item.id, running);
    });
    return visible.map((item) => ({ ...item, currency: item.currency || "EUR", runningBalance: balances.get(item.id) ?? 0 }));
  }, [visible]);

  function clearFilters() {
    setSearch("");
    setDirectionFilter("all");
    setCategoryFilter("all");
    setCurrencyFilter("all");
    setMonthFilter("all");
    setSortMode("newest");
  }

  function exportCsv() {
    const header = ["Description", "Category", "Date", "Transaction type", "Direction", "Currency", "Amount", "Running balance"];
    const rows = rowsWithBalance.map((item) => [
      item.description,
      item.category,
      item.transaction_date,
      typeLabel(item.type),
      directionOf(item.type),
      item.currency,
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

  function openEdit(transaction: Transaction) {
    const isKnownCategory = CATEGORY_GROUPS.some((group) => group.items.includes(transaction.category));
    setEditCategory(isKnownCategory ? transaction.category : "Other / custom");
    setCustomEditCategory(isKnownCategory ? "" : transaction.category);
    setError("");
    setEditTarget(transaction);
  }

  async function deleteTransaction() {
    if (!deleteTarget) return;
    setLoading(true);
    setError("");
    const { error: deleteError } = await supabase.from("transactions").delete().eq("id", deleteTarget.id);
    if (deleteError) setError(deleteError.message);
    else {
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
    const form = new FormData(event.currentTarget);
    const finalCategory = editCategory === "Other / custom" ? customEditCategory.trim() : editCategory;
    if (!finalCategory) {
      setError("Please enter a custom category.");
      setLoading(false);
      return;
    }
    const update = {
      description: String(form.get("description") ?? "").trim(),
      amount: Number(form.get("amount")),
      currency: String(form.get("currency")),
      type: String(form.get("type")),
      category: finalCategory,
      transaction_date: String(form.get("date")),
    };
    const { data, error: updateError } = await supabase
      .from("transactions")
      .update(update)
      .eq("id", editTarget.id)
      .select("id,description,amount,currency,type,category,transaction_date")
      .single();
    if (updateError) setError(updateError.message);
    else if (data) {
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
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search description, category, type or currency" aria-label="Search transactions" />
        </label>
        <button className={styles.secondaryAction} type="button" onClick={clearFilters}><RotateCcw size={16} /> Reset</button>
        <button className={styles.exportButton} type="button" onClick={exportCsv} disabled={!visible.length}><Download size={16} /> Export CSV</button>
      </div>

      <div className={`${styles.toolbar} ${styles.toolbarFive}`}>
        <select value={directionFilter} onChange={(event) => setDirectionFilter(event.target.value as DirectionFilter)}>
          <option value="all">All money movements</option>
          <option value="inflow">Money received</option>
          <option value="outflow">Money spent</option>
          <option value="neutral">Transfers / adjustments</option>
        </select>
        <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}><option value="all">All categories</option>{categories.map((category) => <option key={category}>{category}</option>)}</select>
        <select value={currencyFilter} onChange={(event) => setCurrencyFilter(event.target.value)}><option value="all">All currencies</option>{currencies.map((currency) => <option key={currency} value={currency}>{currencySymbol(currency)} {currency} — {currencyName(currency)}</option>)}</select>
        <select value={monthFilter} onChange={(event) => setMonthFilter(event.target.value)}><option value="all">All months</option>{months.map((month) => <option key={month} value={month}>{new Date(`${month}-01T00:00:00`).toLocaleDateString("en-GB", { month: "long", year: "numeric" })}</option>)}</select>
        <select value={sortMode} onChange={(event) => setSortMode(event.target.value as SortMode)}><option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="highest">Highest amount</option><option value="lowest">Lowest amount</option><option value="description">Description A–Z</option></select>
      </div>

      <div className={styles.summary}>
        <div><TrendingUp size={18} /><span>Money received</span><strong className={styles.positive}><CurrencyTotals totals={totals.inflow} /></strong></div>
        <div><TrendingDown size={18} /><span>Money spent</span><strong className={styles.negative}><CurrencyTotals totals={totals.outflow} /></strong></div>
        <div><WalletCards size={18} /><span>Net movement by currency</span><strong><CurrencyTotals totals={totals.net} /></strong></div>
        <div><CalendarDays size={18} /><span>Transfers / adjustments</span><strong>{totals.neutralCount}</strong></div>
      </div>

      <div className={styles.recordCount}>Showing {visible.length} of {transactions.length} {transactions.length === 1 ? "record" : "records"}</div>
      {notice && <div className={styles.notice}>{notice}</div>}
      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.list}>
        {rowsWithBalance.map((transaction) => {
          const direction = directionOf(transaction.type);
          return (
            <article className={styles.row} key={transaction.id}>
              <div className={direction === "inflow" ? styles.incomeMark : direction === "outflow" ? styles.expenseMark : styles.neutralMark} />
              <div className={styles.details}><strong>{transaction.description}</strong><span>{transaction.category} · {typeLabel(transaction.type)} · {readableDate(transaction.transaction_date)}</span></div>
              <div className={styles.balanceBlock}><span>Running {transaction.currency} balance</span><strong className={transaction.runningBalance >= 0 ? styles.positive : styles.negative}>{formatCurrency(transaction.runningBalance, transaction.currency)}</strong></div>
              <div className={styles.amountBlock}><strong className={direction === "inflow" ? styles.positive : direction === "outflow" ? styles.negative : ""}>{direction === "inflow" ? "+" : direction === "outflow" ? "-" : ""}{formatCurrency(Number(transaction.amount), transaction.currency)}</strong><span>{transaction.currency}</span></div>
              <div className={styles.actions}><button type="button" onClick={() => openEdit(transaction)} aria-label="Edit transaction"><Pencil size={17} /><span>Edit</span></button><button className={styles.deleteButton} type="button" onClick={() => { setError(""); setDeleteTarget(transaction); }} aria-label="Delete transaction"><Trash2 size={17} /><span>Delete</span></button></div>
            </article>
          );
        })}
      </div>
      {!visible.length && <div className={styles.empty}>No transactions match your filters.</div>}

      {editTarget && (
        <div className={styles.backdrop} onMouseDown={() => !loading && setEditTarget(null)}>
          <div className={styles.modal} onMouseDown={(event) => event.stopPropagation()} role="dialog" aria-modal="true">
            <button className={styles.close} type="button" onClick={() => setEditTarget(null)}><X size={18} /></button>
            <small>LEDGER ADJUSTMENT</small><h3>Edit transaction</h3>
            <form onSubmit={updateTransaction}>
              <label>Description<input name="description" defaultValue={editTarget.description} required /></label>
              <div className={styles.formGrid}>
                <label>Amount<input name="amount" type="number" min="0.01" step="0.01" defaultValue={Number(editTarget.amount)} required /></label>
                <label>Currency<select name="currency" defaultValue={editTarget.currency || "EUR"}>{CURRENCY_CODES.map((code) => <option key={code} value={code}>{currencySymbol(code)} {code} — {currencyName(code)}</option>)}</select></label>
              </div>
              <label>Transaction type<select name="type" defaultValue={editTarget.type}>{Object.entries(groupedTypes).map(([group, options]) => <optgroup key={group} label={group}>{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</optgroup>)}</select></label>
              <div className={styles.formGrid}>
                <label>Category<select value={editCategory} onChange={(event) => setEditCategory(event.target.value)}>{CATEGORY_GROUPS.map((group) => <optgroup key={group.group} label={group.group}>{group.items.map((item) => <option key={item} value={item}>{item}</option>)}</optgroup>)}</select></label>
                <label>Date<input name="date" type="date" defaultValue={editTarget.transaction_date} required /></label>
              </div>
              {editCategory === "Other / custom" && <label>Custom category<input value={customEditCategory} onChange={(event) => setCustomEditCategory(event.target.value)} required /></label>}
              {error && <div className={styles.error}>{error}</div>}
              <div className={styles.modalActions}><button type="button" onClick={() => setEditTarget(null)} disabled={loading}>Cancel</button><button className={styles.primaryButton} type="submit" disabled={loading}>{loading ? "Saving…" : "Save changes"}</button></div>
            </form>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className={styles.backdrop} onMouseDown={() => !loading && setDeleteTarget(null)}>
          <div className={`${styles.modal} ${styles.smallModal}`} onMouseDown={(event) => event.stopPropagation()} role="alertdialog" aria-modal="true">
            <button className={styles.close} type="button" onClick={() => setDeleteTarget(null)}><X size={18} /></button>
            <small>PERMANENT ACTION</small><h3>Delete transaction?</h3><p>“{deleteTarget.description}” will be permanently removed. This cannot be undone.</p>
            {error && <div className={styles.error}>{error}</div>}
            <div className={styles.modalActions}><button type="button" onClick={() => setDeleteTarget(null)} disabled={loading}>Cancel</button><button className={styles.dangerButton} type="button" onClick={deleteTransaction} disabled={loading}>{loading ? "Deleting…" : "Delete transaction"}</button></div>
          </div>
        </div>
      )}
    </>
  );
}
