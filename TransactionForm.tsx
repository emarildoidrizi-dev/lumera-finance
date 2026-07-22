"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  CATEGORY_GROUPS,
  CURRENCY_CODES,
  TRANSACTION_TYPES,
  currencyName,
  currencySymbol,
} from "@/lib/financialOptions";

const groupedTypes = TRANSACTION_TYPES.reduce<Record<string, typeof TRANSACTION_TYPES>>(
  (groups, option) => {
    groups[option.group] ??= [];
    groups[option.group].push(option);
    return groups;
  },
  {},
);

export function TransactionForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [currency, setCurrency] = useState("EUR");
  const [category, setCategory] = useState("Groceries");
  const [customCategory, setCustomCategory] = useState("");

  const currencyOptions = useMemo(
    () =>
      CURRENCY_CODES.map((code) => ({
        code,
        symbol: currencySymbol(code),
        name: currencyName(code),
      })).sort((a, b) => a.name.localeCompare(b.name)),
    [],
  );

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    const form = new FormData(event.currentTarget);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("Please log in again.");
      setLoading(false);
      return;
    }

    const finalCategory = category === "Other / custom" ? customCategory.trim() : category;
    if (!finalCategory) {
      setError("Please enter a custom category.");
      setLoading(false);
      return;
    }

    const { data: insertedTransaction, error: insertError } = await supabase
      .from("transactions")
      .insert({
        user_id: user.id,
        description: String(form.get("description") ?? "").trim(),
        amount: Number(form.get("amount")),
        currency,
        type: String(form.get("type")),
        category: finalCategory,
        transaction_date: String(form.get("date")),
      })
      .select("id,description,amount,currency,type,category,transaction_date")
      .single();

    if (insertError) {
      setError(insertError.message);
    } else if (insertedTransaction) {
      window.dispatchEvent(
        new CustomEvent("lumera:transaction-created", {
          detail: insertedTransaction,
        }),
      );
      event.currentTarget.reset();
      setCurrency("EUR");
      setCategory("Groceries");
      setCustomCategory("");
      router.refresh();
    }
    setLoading(false);
  }

  return (
    <form className="form" onSubmit={submit}>
      <div className="field">
        <label>Description</label>
        <input className="input" name="description" required placeholder="What happened?" />
      </div>

      <div className="transaction-form-grid transaction-form-grid-amount">
        <div className="field">
          <label>Amount</label>
          <input className="input" name="amount" type="number" min="0.01" step="0.01" required />
        </div>
        <div className="field">
          <label>Currency</label>
          <select className="input" name="currency" value={currency} onChange={(event) => setCurrency(event.target.value)}>
            {currencyOptions.map((option) => (
              <option key={option.code} value={option.code}>
                {option.symbol} {option.code} — {option.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="field">
        <label>Transaction type</label>
        <select className="input" name="type" defaultValue="expense">
          {Object.entries(groupedTypes).map(([group, options]) => (
            <optgroup key={group} label={group}>
              {options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>

      <div className="transaction-form-grid">
        <div className="field">
          <label>Category</label>
          <select className="input" name="category" value={category} onChange={(event) => setCategory(event.target.value)}>
            {CATEGORY_GROUPS.map((group) => (
              <optgroup key={group.group} label={group.group}>
                {group.items.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>
        <div className="field">
          <label>Date</label>
          <input className="input" name="date" type="date" required />
        </div>
      </div>

      {category === "Other / custom" && (
        <div className="field">
          <label>Custom category</label>
          <input
            className="input"
            value={customCategory}
            onChange={(event) => setCustomCategory(event.target.value)}
            placeholder="Enter your own category"
            maxLength={80}
            required
          />
        </div>
      )}

      {error && <div className="alert alert-error">{error}</div>}
      <button className="btn btn-primary" disabled={loading}>
        {loading ? "Saving…" : "Save transaction"}
      </button>
    </form>
  );
}
