import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function DebtPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return (
    <>
      <header className="topbar">
        <div className="page-title">
          <h1>Debt</h1>
          <p>Track balances, repayments and progress toward becoming debt-free.</p>
        </div>
      </header>

      <section className="kpis" aria-label="Debt overview">
        <article className="kpi">
          <span>Total debt</span>
          <strong>€0.00</strong>
        </article>
        <article className="kpi">
          <span>Monthly payments</span>
          <strong>€0.00</strong>
        </article>
        <article className="kpi">
          <span>Interest this month</span>
          <strong>€0.00</strong>
        </article>
        <article className="kpi">
          <span>Accounts</span>
          <strong>0</strong>
        </article>
      </section>

      <section className="panel" style={{ marginTop: 18 }}>
        <div className="panel-head">
          <div>
            <h3 style={{ margin: 0 }}>Debt accounts</h3>
            <p className="muted" style={{ margin: "7px 0 0" }}>
              Credit cards, personal loans, instalments, mortgages and other
              liabilities will be managed here.
            </p>
          </div>
        </div>
        <div className="empty">
          No debt accounts have been added yet. The Debt section is now connected
          to Lumera’s navigation and ready for its full management module.
        </div>
      </section>
    </>
  );
}
