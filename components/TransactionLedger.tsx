"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Transaction = {
  id: string;
  description: string;
  amount: number | string;
  type: "income" | "expense";
  category: string;
  transaction_date: string;
};

type Props = {
  transactions: Transaction[];
};

function money(value: number) {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(value);
}

export function TransactionLedger({ transactions }: Props) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [deleteTarget, setDeleteTarget] = useState<Transaction | null>(null);
  const [editTarget, setEditTarget] = useState<Transaction | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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
      setLoading(false);
      return;
    }

    setDeleteTarget(null);
    setLoading(false);
    router.refresh();
  }

  async function updateTransaction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editTarget) return;

    setLoading(true);
    setError("");
    const form = new FormData(event.currentTarget);

    const { error: updateError } = await supabase
      .from("transactions")
      .update({
        description: String(form.get("description") ?? "").trim(),
        amount: Number(form.get("amount")),
        type: String(form.get("type")),
        category: String(form.get("category") ?? "").trim(),
        transaction_date: String(form.get("date")),
      })
      .eq("id", editTarget.id);

    if (updateError) {
      setError(updateError.message);
      setLoading(false);
      return;
    }

    setEditTarget(null);
    setLoading(false);
    router.refresh();
  }

  if (!transactions.length) {
    return <div className="empty">No transactions yet.</div>;
  }

  return (
    <>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Description</th>
              <th>Category</th>
              <th>Date</th>
              <th>Amount</th>
              <th className="actions-heading">Actions</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((transaction) => (
              <tr className="transaction-row" key={transaction.id}>
                <td>
                  <div className="transaction-description">{transaction.description}</div>
                  <div className="transaction-type">{transaction.type}</div>
                </td>
                <td>{transaction.category}</td>
                <td>
                  {new Date(`${transaction.transaction_date}T00:00:00`).toLocaleDateString(
                    "en-GB",
                  )}
                </td>
                <td
                  className={
                    transaction.type === "income" ? "amount-positive" : "amount-negative"
                  }
                >
                  {transaction.type === "income" ? "+" : "-"}
                  {money(Number(transaction.amount))}
                </td>
                <td>
                  <div className="transaction-actions">
                    <button
                      className="icon-button"
                      type="button"
                      aria-label={`Edit ${transaction.description}`}
                      title="Edit transaction"
                      onClick={() => {
                        setError("");
                        setEditTarget(transaction);
                      }}
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      className="icon-button icon-button-danger"
                      type="button"
                      aria-label={`Delete ${transaction.description}`}
                      title="Delete transaction"
                      onClick={() => {
                        setError("");
                        setDeleteTarget(transaction);
                      }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {deleteTarget && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => !loading && setDeleteTarget(null)}>
          <div
            className="modal-card modal-card-small"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-transaction-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button
              className="modal-close"
              type="button"
              aria-label="Close"
              disabled={loading}
              onClick={() => setDeleteTarget(null)}
            >
              <X size={18} />
            </button>
            <div className="eyebrow">Permanent action</div>
            <h3 id="delete-transaction-title">Delete transaction?</h3>
            <p className="modal-copy">
              “{deleteTarget.description}” will be permanently removed from your ledger. This cannot
              be undone.
            </p>
            {error && <div className="alert alert-error">{error}</div>}
            <div className="modal-actions">
              <button className="btn btn-soft" type="button" disabled={loading} onClick={() => setDeleteTarget(null)}>
                Cancel
              </button>
              <button className="btn btn-danger" type="button" disabled={loading} onClick={deleteTransaction}>
                {loading ? "Deleting…" : "Delete transaction"}
              </button>
            </div>
          </div>
        </div>
      )}

      {editTarget && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => !loading && setEditTarget(null)}>
          <div
            className="modal-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-transaction-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button
              className="modal-close"
              type="button"
              aria-label="Close"
              disabled={loading}
              onClick={() => setEditTarget(null)}
            >
              <X size={18} />
            </button>
            <div className="eyebrow">Ledger adjustment</div>
            <h3 id="edit-transaction-title">Edit transaction</h3>
            <form className="form" onSubmit={updateTransaction}>
              <div className="field">
                <label htmlFor="edit-description">Description</label>
                <input
                  id="edit-description"
                  className="input"
                  name="description"
                  defaultValue={editTarget.description}
                  maxLength={120}
                  required
                />
              </div>
              <div className="form-grid-2">
                <div className="field">
                  <label htmlFor="edit-amount">Amount (€)</label>
                  <input
                    id="edit-amount"
                    className="input"
                    name="amount"
                    type="number"
                    min="0.01"
                    step="0.01"
                    defaultValue={Number(editTarget.amount)}
                    required
                  />
                </div>
                <div className="field">
                  <label htmlFor="edit-type">Type</label>
                  <select id="edit-type" className="input" name="type" defaultValue={editTarget.type}>
                    <option value="expense">Expense</option>
                    <option value="income">Income</option>
                  </select>
                </div>
              </div>
              <div className="form-grid-2">
                <div className="field">
                  <label htmlFor="edit-category">Category</label>
                  <input
                    id="edit-category"
                    className="input"
                    name="category"
                    defaultValue={editTarget.category}
                    required
                  />
                </div>
                <div className="field">
                  <label htmlFor="edit-date">Date</label>
                  <input
                    id="edit-date"
                    className="input"
                    name="date"
                    type="date"
                    defaultValue={editTarget.transaction_date}
                    required
                  />
                </div>
              </div>
              {error && <div className="alert alert-error">{error}</div>}
              <div className="modal-actions">
                <button className="btn btn-soft" type="button" disabled={loading} onClick={() => setEditTarget(null)}>
                  Cancel
                </button>
                <button className="btn btn-primary" type="submit" disabled={loading}>
                  {loading ? "Saving…" : "Save changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
