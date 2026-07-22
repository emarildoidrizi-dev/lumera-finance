import { createClient } from "@/lib/supabase/server";
import { TransactionForm } from "@/components/TransactionForm";
import { TransactionLedger } from "@/components/TransactionLedger";

export default async function TransactionsPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("transactions")
    .select("id,description,amount,type,category,transaction_date")
    .order("transaction_date", { ascending: false })
    .order("created_at", { ascending: false });

  const transactions = (data ?? []).map((transaction) => ({
    ...transaction,
    type: transaction.type as "income" | "expense",
  }));

  return (
    <>
      <header className="topbar">
        <div className="page-title">
          <h1>Transactions</h1>
          <p>Record and understand every movement of money.</p>
        </div>
      </header>
      <section className="grid-2 transactions-grid">
        <div className="panel">
          <h3>Add transaction</h3>
          <TransactionForm />
        </div>
        <div className="panel ledger-panel">
          <div className="panel-head">
            <h3>Your ledger</h3>
            <span className="muted">
              {transactions.length} {transactions.length === 1 ? "record" : "records"}
            </span>
          </div>
          {error ? (
            <div className="alert alert-error">Could not load transactions: {error.message}</div>
          ) : (
            <TransactionLedger transactions={transactions} />
          )}
        </div>
      </section>
    </>
  );
}
