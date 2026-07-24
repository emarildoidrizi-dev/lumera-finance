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
import { notifyLumeraDataChange } from "@/lib/lumeraRealtime";
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
import styles from "./TransactionLedgerRecovery.module.css";

type Transaction = {
  id: string;
  description: string;
  amount: number | string;
  currency: string;
  type: string;
  category: string;
  transaction_date: string;
  occurred_at: string | null;
  created_at?: string | null;
  amount_eur: number | string;
  exchange_rate_to_eur: number | string;
  exchange_rate_date: string | null;
  exchange_rate_source: string | null;
};

type Props = { transactions: Transaction[] };
type DirectionFilter = "all" | FlowDirection;
type SortMode = "newest" | "oldest" | "highest" | "lowest" | "description";

const readableDateTime = (value: string | null, fallbackDate: string) => {
  const date = value ? new Date(value) : new Date(`${fallbackDate}T00:00:00`);
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZoneName: "short",
  });
};

const toLocalDateTimeInput = (value: string | null, fallbackDate: string) => {
  const date = value ? new Date(value) : new Date(`${fallbackDate}T12:00:00`);
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 16);
};

const csvCell = (value: string | number) => `"${String(value).replaceAll('"', '""')}"`;
const htmlCell = (value: string | number) =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
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

function signedEuroValue(item: Transaction) {
  const direction = directionOf(item.type);
  const sign = direction === "inflow" ? 1 : direction === "outflow" ? -1 : 0;
  return Number(item.amount_eur ?? item.amount) * sign;
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
  const [exportFrom, setExportFrom] = useState("");
  const [exportTo, setExportTo] = useState("");
  const [editTarget, setEditTarget] = useState<Transaction | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Transaction | null>(null);
  const [editCategory, setEditCategory] = useState("");
  const [customEditCategory, setCustomEditCategory] = useState("");
  const [editCurrency, setEditCurrency] = useState("EUR");
  const [editAmount, setEditAmount] = useState("");
  const [editOccurredAt, setEditOccurredAt] = useState("");
  const [editRate, setEditRate] = useState({ rate: 1, date: new Date().toISOString().slice(0, 10), source: "identity" });
  const [editRateLoading, setEditRateLoading] = useState(false);
  const [editRateError, setEditRateError] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    function handleCreated(event: Event) {
      const created = (event as CustomEvent<Transaction>).detail;
      if (!created?.id) return;

      setTransactions((current) => {
        const withoutDuplicate = current.filter((item) => item.id !== created.id);
        return [created, ...withoutDuplicate];
      });
      // A newly created record must always be visible immediately, even if
      // the user previously had filters or an older sort order selected.
      setSearch("");
      setDirectionFilter("all");
      setCategoryFilter("all");
      setCurrencyFilter("all");
      setMonthFilter("all");
      setSortMode("newest");
      setNotice("Transaction saved and added to your ledger.");
      window.setTimeout(() => setNotice(""), 2600);
    }

    function handleSaveFailed(event: Event) {
      const failedId = (event as CustomEvent<{ id?: string }>).detail?.id;
      if (!failedId) return;
      setTransactions((current) => current.filter((item) => item.id !== failedId));
      setError("The transaction could not be saved. Please try again.");
    }

    window.addEventListener("lumera:transaction-created", handleCreated);
    window.addEventListener("lumera:transaction-save-failed", handleSaveFailed);
    return () => {
      window.removeEventListener("lumera:transaction-created", handleCreated);
      window.removeEventListener("lumera:transaction-save-failed", handleSaveFailed);
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    async function subscribeToLiveTransactions() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!mounted || !user) return;

      channel = supabase
        .channel(`transaction-ledger-${user.id}`)
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
              return [changed, ...current.filter((item) => item.id !== changed.id)];
            });
          },
        )
        .subscribe();
    }

    void subscribeToLiveTransactions();
    return () => {
      mounted = false;
      if (channel) void supabase.removeChannel(channel);
    };
  }, [supabase]);

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
        if (sortMode === "oldest") return (a.occurred_at ?? a.transaction_date).localeCompare(b.occurred_at ?? b.transaction_date);
        if (sortMode === "highest") return Number(b.amount_eur ?? b.amount) - Number(a.amount_eur ?? a.amount);
        if (sortMode === "lowest") return Number(a.amount_eur ?? a.amount) - Number(b.amount_eur ?? b.amount);
        if (sortMode === "description") return a.description.localeCompare(b.description);
        return (b.occurred_at ?? b.transaction_date).localeCompare(a.occurred_at ?? a.transaction_date);
      });
  }, [transactions, search, directionFilter, categoryFilter, currencyFilter, monthFilter, sortMode]);

  const invalidExportRange =
    Boolean(exportFrom && exportTo) && exportFrom > exportTo;

  const exportRows = useMemo(() => {
    if (invalidExportRange) return [];

    return visible.filter((item) => {
      const transactionDate = item.transaction_date;
      const afterStart = !exportFrom || transactionDate >= exportFrom;
      const beforeEnd = !exportTo || transactionDate <= exportTo;
      return afterStart && beforeEnd;
    });
  }, [visible, exportFrom, exportTo, invalidExportRange]);

  const totals = useMemo(() => {
    let inflow = 0;
    let outflow = 0;
    let net = 0;
    let neutralCount = 0;
    visible.forEach((item) => {
      const direction = directionOf(item.type);
      const euro = Number(item.amount_eur ?? item.amount);
      if (direction === "inflow") inflow += euro;
      else if (direction === "outflow") outflow += euro;
      else neutralCount += 1;
      net += signedEuroValue(item);
    });
    return { inflow, outflow, net, neutralCount };
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
    if (invalidExportRange) {
      setError("The export start date cannot be after the end date.");
      return;
    }

    const header = [
      "Description",
      "Category",
      "Occurred at",
      "Transaction type",
      "Direction",
      "Currency",
      "Original amount",
      "EUR amount",
      "Rate to EUR",
      "Rate date",
    ];

    const rows = exportRows.map((item) => [
      item.description,
      item.category,
      item.occurred_at ?? item.transaction_date,
      typeLabel(item.type),
      directionOf(item.type),
      item.currency,
      Number(item.amount).toFixed(2),
      Number(item.amount_eur ?? item.amount).toFixed(2),
      Number(item.exchange_rate_to_eur ?? 1).toFixed(8),
      item.exchange_rate_date ?? "",
    ]);

    const csv = [header, ...rows]
      .map((row) => row.map(csvCell).join(","))
      .join("\n");

    const blob = new Blob([`\uFEFF${csv}`], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    const rangeLabel =
      exportFrom || exportTo
        ? `${exportFrom || "start"}-to-${exportTo || "latest"}`
        : new Date().toISOString().slice(0, 10);

    anchor.href = url;
    anchor.download = `ficonter-transactions-${rangeLabel}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);

    setNotice(`CSV export downloaded (${exportRows.length} records).`);
    window.setTimeout(() => setNotice(""), 2600);
  }

  function exportPdf() {
    if (invalidExportRange) {
      setError("The export start date cannot be after the end date.");
      return;
    }

    const reportWindow = window.open("", "_blank", "noopener,noreferrer");

    if (!reportWindow) {
      setError("Your browser blocked the PDF window. Allow pop-ups and try again.");
      return;
    }

    const rangeText =
      exportFrom || exportTo
        ? `${exportFrom || "Beginning"} to ${exportTo || "Latest"}`
        : "All currently filtered transactions";

    const tableRows = exportRows
      .map((item) => {
        const direction = directionOf(item.type);
        const signedAmount =
          direction === "inflow"
            ? Number(item.amount_eur ?? item.amount)
            : direction === "outflow"
              ? -Number(item.amount_eur ?? item.amount)
              : Number(item.amount_eur ?? item.amount);

        return `
          <tr>
            <td>${htmlCell(readableDateTime(item.occurred_at, item.transaction_date))}</td>
            <td>
              <strong>${htmlCell(item.description)}</strong>
              <span>${htmlCell(item.category)} · ${htmlCell(typeLabel(item.type))}</span>
            </td>
            <td>${htmlCell(item.currency || "EUR")}</td>
            <td class="amount">${htmlCell(formatCurrency(signedAmount, "EUR"))}</td>
          </tr>
        `;
      })
      .join("");

    reportWindow.document.write(`
      <!doctype html>
      <html lang="en">
        <head>
          <meta charset="utf-8" />
          <title>Ficonter transaction export</title>
          <style>
            @page { size: A4; margin: 18mm; }
            * { box-sizing: border-box; }
            body {
              margin: 0;
              color: #202427;
              font-family: Arial, Helvetica, sans-serif;
              background: #ffffff;
            }
            header {
              display: flex;
              justify-content: space-between;
              gap: 24px;
              padding-bottom: 18px;
              margin-bottom: 18px;
              border-bottom: 1px solid #d9d1c5;
            }
            .brand {
              color: #9f8455;
              font-family: Georgia, serif;
              font-size: 22px;
              font-weight: 700;
              letter-spacing: .08em;
            }
            h1 {
              margin: 6px 0 4px;
              font-family: Georgia, serif;
              font-size: 30px;
              font-weight: 500;
            }
            p { margin: 0; color: #716d67; font-size: 12px; line-height: 1.5; }
            .meta { text-align: right; }
            table { width: 100%; border-collapse: collapse; }
            th {
              padding: 10px 8px;
              border-bottom: 1px solid #cfc6b8;
              color: #716d67;
              font-size: 10px;
              letter-spacing: .08em;
              text-align: left;
              text-transform: uppercase;
            }
            td {
              padding: 11px 8px;
              border-bottom: 1px solid #ebe5dc;
              font-size: 11px;
              vertical-align: top;
            }
            td strong { display: block; font-size: 11px; }
            td span { display: block; margin-top: 3px; color: #77736d; font-size: 9px; }
            .amount { white-space: nowrap; text-align: right; font-weight: 700; }
            footer {
              margin-top: 18px;
              color: #77736d;
              font-size: 9px;
              text-align: center;
            }
          </style>
        </head>
        <body>
          <header>
            <div>
              <div class="brand">FICONTER</div>
              <h1>Transaction report</h1>
              <p>${htmlCell(rangeText)}</p>
            </div>
            <div class="meta">
              <p><strong>${exportRows.length}</strong> records</p>
              <p>Generated ${htmlCell(new Date().toLocaleString("en-GB"))}</p>
            </div>
          </header>

          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Transaction</th>
                <th>Currency</th>
                <th style="text-align:right">EUR amount</th>
              </tr>
            </thead>
            <tbody>${tableRows}</tbody>
          </table>

          <footer>Ficonter · Your Financial Command Center</footer>
          <script>
            window.addEventListener("load", () => {
              window.focus();
              window.print();
            });
          </script>
        </body>
      </html>
    `);

    reportWindow.document.close();
    setNotice("PDF report opened. Select “Save as PDF” in the print window.");
    window.setTimeout(() => setNotice(""), 3600);
  }

  function openEdit(transaction: Transaction) {
    const isKnownCategory = CATEGORY_GROUPS.some((group) => group.items.includes(transaction.category));
    setEditCategory(isKnownCategory ? transaction.category : "Other / custom");
    setCustomEditCategory(isKnownCategory ? "" : transaction.category);
    setEditCurrency(transaction.currency || "EUR");
    setEditAmount(String(transaction.amount));
    setEditOccurredAt(toLocalDateTimeInput(transaction.occurred_at, transaction.transaction_date));
    setEditRate({
      rate: Number(transaction.exchange_rate_to_eur ?? 1),
      date: transaction.exchange_rate_date ?? new Date().toISOString().slice(0, 10),
      source: transaction.exchange_rate_source ?? (transaction.currency === "EUR" ? "identity" : "Frankfurter"),
    });
    setEditRateError("");
    setError("");
    setEditTarget(transaction);
  }

  useEffect(() => {
    if (!editTarget) return;
    const controller = new AbortController();
    if (editCurrency === "EUR") {
      setEditRate({ rate: 1, date: new Date().toISOString().slice(0, 10), source: "identity" });
      setEditRateError("");
      setEditRateLoading(false);
      return () => controller.abort();
    }
    async function loadEditRate() {
      setEditRateLoading(true);
      setEditRateError("");
      try {
        const response = await fetch(`/api/exchange-rate?from=${encodeURIComponent(editCurrency)}&to=EUR`, { signal: controller.signal, cache: "no-store" });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Unable to retrieve an exchange rate.");
        setEditRate({ rate: Number(data.rate), date: data.date, source: data.source });
      } catch (rateFetchError) {
        if ((rateFetchError as Error).name !== "AbortError") setEditRateError((rateFetchError as Error).message);
      } finally {
        if (!controller.signal.aborted) setEditRateLoading(false);
      }
    }
    void loadEditRate();
    return () => controller.abort();
  }, [editCurrency, editTarget]);

  async function deleteTransaction() {
    if (!deleteTarget) return;
    setLoading(true);
    setError("");
    const { error: deleteError } = await supabase.from("transactions").delete().eq("id", deleteTarget.id);
    if (deleteError) setError(deleteError.message);
    else {
      setTransactions((current) => current.filter((item) => item.id !== deleteTarget.id));
      setDeleteTarget(null);
      notifyLumeraDataChange("all");
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
    if (editCurrency !== "EUR" && (editRateLoading || editRateError || !editRate.rate)) {
      setError("A valid EUR exchange rate is required before saving changes.");
      setLoading(false);
      return;
    }
    const occurred = new Date(editOccurredAt);
    if (Number.isNaN(occurred.getTime())) {
      setError("Please choose a valid transaction date and time.");
      setLoading(false);
      return;
    }
    const originalAmount = Number(form.get("amount"));
    const update = {
      description: String(form.get("description") ?? "").trim(),
      amount: originalAmount,
      currency: editCurrency,
      amount_eur: Number((originalAmount * editRate.rate).toFixed(6)),
      exchange_rate_to_eur: editRate.rate,
      exchange_rate_date: editRate.date,
      exchange_rate_source: editRate.source,
      type: String(form.get("type")),
      category: finalCategory,
      transaction_date: editOccurredAt.slice(0, 10),
      occurred_at: occurred.toISOString(),
    };
    const { data, error: updateError } = await supabase
      .from("transactions")
      .update(update)
      .eq("id", editTarget.id)
      .select("id,description,amount,currency,amount_eur,exchange_rate_to_eur,exchange_rate_date,exchange_rate_source,type,category,transaction_date,occurred_at,created_at")
      .single();
    if (updateError) setError(updateError.message);
    else if (data) {
      setTransactions((current) => current.map((item) => (item.id === data.id ? data : item)));
      setEditTarget(null);
      notifyLumeraDataChange("all");
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
            placeholder="Search description, category, type or currency"
            aria-label="Search transactions"
          />
        </label>

        <button
          className={styles.secondaryAction}
          type="button"
          onClick={clearFilters}
        >
          <RotateCcw size={16} />
          Reset
        </button>

        <div className={styles.exportPanel} aria-label="Export transactions">
          <label className={styles.exportDateField}>
            <span>From</span>
            <div className={styles.exportDateInput}>
              <CalendarDays size={15} aria-hidden="true" />
              <input
                type="date"
                value={exportFrom}
                max={exportTo || undefined}
                onChange={(event) => {
                  setExportFrom(event.target.value);
                  setError("");
                }}
                aria-label="Export from date"
              />
            </div>
          </label>

          <label className={styles.exportDateField}>
            <span>To</span>
            <div className={styles.exportDateInput}>
              <CalendarDays size={15} aria-hidden="true" />
              <input
                type="date"
                value={exportTo}
                min={exportFrom || undefined}
                onChange={(event) => {
                  setExportTo(event.target.value);
                  setError("");
                }}
                aria-label="Export to date"
              />
            </div>
          </label>

          <button
            className={styles.exportButton}
            type="button"
            onClick={exportCsv}
            disabled={!exportRows.length || invalidExportRange}
          >
            <Download size={16} />
            CSV
          </button>

          <button
            className={`${styles.exportButton} ${styles.pdfButton}`}
            type="button"
            onClick={exportPdf}
            disabled={!exportRows.length || invalidExportRange}
          >
            <Download size={16} />
            PDF
          </button>
        </div>
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
        <div><TrendingUp size={18} /><span>Money received</span><strong className={styles.positive}>{formatCurrency(totals.inflow, "EUR")}</strong></div>
        <div><TrendingDown size={18} /><span>Money spent</span><strong className={styles.negative}>{formatCurrency(totals.outflow, "EUR")}</strong></div>
        <div><WalletCards size={18} /><span>Net movement by currency</span><strong>{formatCurrency(totals.net, "EUR")}</strong></div>
      </div>

      {notice && <div className={styles.notice}>{notice}</div>}
      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.list}>
        {visible.map((transaction) => {
          const direction = directionOf(transaction.type);
          return (
            <article className={styles.row} key={transaction.id}>
              <div className={direction === "inflow" ? styles.incomeMark : direction === "outflow" ? styles.expenseMark : styles.neutralMark} />
              <div className={styles.details}><strong>{transaction.description}</strong><span>{transaction.category} · {typeLabel(transaction.type)} · {readableDateTime(transaction.occurred_at, transaction.transaction_date)}</span></div>
              <div className={styles.amountBlock}>
                <strong className={direction === "inflow" ? styles.positive : direction === "outflow" ? styles.negative : ""}>{direction === "inflow" ? "+" : direction === "outflow" ? "-" : ""}{formatCurrency(Number(transaction.amount_eur ?? transaction.amount), "EUR")}</strong>
                <span>{transaction.currency === "EUR" ? "Original currency EUR" : `${formatCurrency(Number(transaction.amount), transaction.currency)} · 1 ${transaction.currency} = ${Number(transaction.exchange_rate_to_eur).toFixed(6)} EUR`}</span>
              </div>
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
                <label>Amount<input name="amount" type="number" min="0.01" step="0.01" value={editAmount} onChange={(event) => setEditAmount(event.target.value)} required /></label>
                <label>Currency<select name="currency" value={editCurrency} onChange={(event) => setEditCurrency(event.target.value)}>{CURRENCY_CODES.map((code) => <option key={code} value={code}>{currencySymbol(code)} {code} — {currencyName(code)}</option>)}</select></label>
              </div>
              <label>Transaction type<select name="type" defaultValue={editTarget.type}>{Object.entries(groupedTypes).map(([group, options]) => <optgroup key={group} label={group}>{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</optgroup>)}</select></label>
              <div className={styles.formGrid}>
                <label>Category<select value={editCategory} onChange={(event) => setEditCategory(event.target.value)}>{CATEGORY_GROUPS.map((group) => <optgroup key={group.group} label={group.group}>{group.items.map((item) => <option key={item} value={item}>{item}</option>)}</optgroup>)}</select></label>
                <label>Exact date and time<input name="occurred_at" type="datetime-local" value={editOccurredAt} onChange={(event) => setEditOccurredAt(event.target.value)} required /></label>
              </div>
              {editCategory === "Other / custom" && <label>Custom category<input value={customEditCategory} onChange={(event) => setCustomEditCategory(event.target.value)} required /></label>}
              <div className={styles.fxPreview}>{editRateLoading ? "Retrieving EUR rate…" : editRateError ? editRateError : `EUR equivalent: ${formatCurrency(Number(editAmount || 0) * editRate.rate, "EUR")} · 1 ${editCurrency} = ${editRate.rate.toFixed(6)} EUR`}</div>
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
