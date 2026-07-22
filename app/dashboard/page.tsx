import { createClient } from "@/lib/supabase/server";

function money(value:number){return new Intl.NumberFormat("de-DE",{style:"currency",currency:"EUR"}).format(value)}

export default async function DashboardPage(){
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  const {data:transactions}=await supabase.from("transactions").select("amount,type,description,category,transaction_date").order("transaction_date",{ascending:false}).limit(8);
  const rows=transactions ?? [];
  const income=rows.filter(r=>r.type==="income").reduce((a,r)=>a+Number(r.amount),0);
  const expenses=rows.filter(r=>r.type==="expense").reduce((a,r)=>a+Number(r.amount),0);
  const cashFlow=income-expenses;
  const name=(user?.user_metadata?.full_name as string | undefined)?.split(" ")[0] ?? "there";
  return <>
    <header className="topbar"><div className="page-title"><h1>Good morning, {name}.</h1><p>Your private financial overview.</p></div><a className="btn btn-gold" href="/dashboard/transactions">Add transaction</a></header>
    <section className="kpis">
      <div className="kpi"><span>Income recorded</span><strong>{money(income)}</strong></div>
      <div className="kpi"><span>Expenses recorded</span><strong>{money(expenses)}</strong></div>
      <div className="kpi"><span>Cash flow</span><strong className={cashFlow>=0?"amount-positive":"amount-negative"}>{money(cashFlow)}</strong></div>
      <div className="kpi"><span>Savings rate</span><strong>{income?`${Math.max(0,cashFlow/income*100).toFixed(1)}%`:"0.0%"}</strong></div>
    </section>
    <section className="grid-2">
      <div className="panel"><div className="panel-head"><h3>Recent transactions</h3><a href="/dashboard/transactions">View all</a></div>{rows.length?<div className="table-wrap"><table><thead><tr><th>Description</th><th>Category</th><th>Date</th><th>Amount</th></tr></thead><tbody>{rows.map((r,i)=><tr key={i}><td>{r.description}</td><td>{r.category}</td><td>{new Date(r.transaction_date).toLocaleDateString("en-GB")}</td><td className={r.type==="income"?"amount-positive":"amount-negative"}>{r.type==="income"?"+":"-"}{money(Number(r.amount))}</td></tr>)}</tbody></table></div>:<div className="empty">Your financial story begins with your first transaction.</div>}</div>
      <div className="panel"><div className="panel-head"><h3>Financial health</h3><strong>Foundation</strong></div><div className="stat-row"><span>Emergency reserves</span><strong>Not set</strong></div><div className="stat-row"><span>Outstanding bills</span><strong>€0.00</strong></div><div className="stat-row"><span>Goals funded</span><strong>0%</strong></div><div style={{marginTop:24}}><div className="progress"><div style={{width:"28%"}}/></div><p className="muted">Complete your financial modules to improve your score.</p></div></div>
    </section>
  </>;
}
