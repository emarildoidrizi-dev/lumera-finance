"use client";

import { ChevronLeft, ChevronRight, Plus, Trash2, WalletCards } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import styles from "./MonthlyPlanner.module.css";

type Section = "income" | "bills" | "expenses" | "savings" | "debt";
type Tx = { id:string; user_id:string; description:string; amount_eur:number|string; type:string; category:string; transaction_date:string; occurred_at:string|null };
type Bill = { id:string; user_id:string; name:string; category:string; amount_eur:number|string; due_date:string; status:string; paid_at:string|null; transaction_id:string|null };
type Plan = { id:string; user_id:string; month:string; start_balance:number|string; created_at:string; updated_at:string };
type Item = { id:string; user_id:string; month:string; section:Section; label:string; planned_amount:number|string; position:number; created_at:string; updated_at:string };

const sections: {key:Section; title:string}[] = [
  {key:"income",title:"Income"},{key:"bills",title:"Bills"},{key:"expenses",title:"Expenses"},{key:"savings",title:"Savings"},{key:"debt",title:"Debt"},
];
const debtWords=["debt","loan","credit-card","credit card","mortgage principal","student-loan","personal-loan"];
const savingWords=["savings","emergency fund","retirement","stocks","etfs","bonds","crypto","investment","house deposit","education fund"];
const eur=(v:number)=>new Intl.NumberFormat("de-DE",{style:"currency",currency:"EUR"}).format(v||0);
const monthKey=(d=new Date())=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
const monthTitle=(m:string)=>new Date(`${m}-01T12:00:00`).toLocaleDateString("en-GB",{month:"long",year:"numeric"});
const inMonth=(date:string|null,m:string)=>Boolean(date?.startsWith(m));
const classify=(tx:Tx):Section=>{
  if(tx.type==="income") return "income";
  const c=tx.category.toLowerCase();
  if(debtWords.some(w=>c.includes(w))) return "debt";
  if(savingWords.some(w=>c.includes(w))) return "savings";
  return "expenses";
};

export function MonthlyPlanner({userId,initialTransactions,initialBills,initialPlans,initialItems}:{userId:string;initialTransactions:Tx[];initialBills:Bill[];initialPlans:Plan[];initialItems:Item[]}){
  const supabase=useMemo(()=>createClient(),[]);
  const [month,setMonth]=useState(monthKey());
  const [transactions,setTransactions]=useState(initialTransactions);
  const [bills,setBills]=useState(initialBills);
  const [plans,setPlans]=useState(initialPlans);
  const [items,setItems]=useState(initialItems);
  const [addSection,setAddSection]=useState<Section|null>(null);
  const [notice,setNotice]=useState("");

  useEffect(()=>{ if(!notice)return; const t=setTimeout(()=>setNotice(""),3500); return()=>clearTimeout(t)},[notice]);
  useEffect(()=>{
    const channel=supabase.channel(`planner-${userId}`)
      .on("postgres_changes",{event:"*",schema:"public",table:"transactions",filter:`user_id=eq.${userId}`},p=>setTransactions(c=>p.eventType==="DELETE"?c.filter(x=>x.id!==(p.old as any).id):[p.new as Tx,...c.filter(x=>x.id!==(p.new as any).id)]))
      .on("postgres_changes",{event:"*",schema:"public",table:"bills",filter:`user_id=eq.${userId}`},p=>setBills(c=>p.eventType==="DELETE"?c.filter(x=>x.id!==(p.old as any).id):[p.new as Bill,...c.filter(x=>x.id!==(p.new as any).id)]))
      .on("postgres_changes",{event:"*",schema:"public",table:"monthly_budget_plans",filter:`user_id=eq.${userId}`},p=>setPlans(c=>p.eventType==="DELETE"?c.filter(x=>x.id!==(p.old as any).id):[p.new as Plan,...c.filter(x=>x.id!==(p.new as any).id)]))
      .on("postgres_changes",{event:"*",schema:"public",table:"monthly_budget_items",filter:`user_id=eq.${userId}`},p=>setItems(c=>p.eventType==="DELETE"?c.filter(x=>x.id!==(p.old as any).id):[p.new as Item,...c.filter(x=>x.id!==(p.new as any).id)]))
      .subscribe();
    return()=>{void supabase.removeChannel(channel)};
  },[supabase,userId]);

  const plan=plans.find(p=>p.month===month);
  const startBalance=Number(plan?.start_balance??0);
  const paidBillTxIds=new Set(bills.filter(b=>b.transaction_id).map(b=>b.transaction_id as string));
  const monthTx=transactions.filter(t=>inMonth(t.transaction_date,month)||inMonth(t.occurred_at,month));
  const actualBySection=useMemo(()=>{
    const totals:Record<Section,number>={income:0,bills:0,expenses:0,savings:0,debt:0};
    monthTx.forEach(t=>{ if(paidBillTxIds.has(t.id))return; totals[classify(t)]+=Number(t.amount_eur)||0; });
    bills.filter(b=>b.status==="paid"&&(inMonth(b.paid_at,month)||inMonth(b.due_date,month))).forEach(b=>totals.bills+=Number(b.amount_eur)||0);
    return totals;
  },[monthTx,bills,month]);
  const monthItems=items.filter(i=>i.month===month);
  const planned=(s:Section)=>monthItems.filter(i=>i.section===s).reduce((a,b)=>a+Number(b.planned_amount),0);
  const actual=(s:Section)=>actualBySection[s];
  const totalIncome=actual("income");
  const totalOut=actual("bills")+actual("expenses")+actual("savings")+actual("debt");
  const left=startBalance+totalIncome-totalOut;
  const budgetTotal=planned("income")+startBalance;
  const plannedOut=planned("bills")+planned("expenses")+planned("savings")+planned("debt");
  const leftToBudget=budgetTotal-plannedOut;
  const spendingParts=["bills","expenses","savings","debt"].map(k=>({key:k as Section,value:actual(k as Section)})).filter(x=>x.value>0);
  let cursor=0; const palette=["#e5cedd","#edd0b3","#cbdbea","#d6cceb"];
  const gradient=spendingParts.length?`conic-gradient(${spendingParts.map((p,i)=>{const a=cursor;cursor+=p.value/Math.max(totalOut,1)*100;return `${palette[i%palette.length]} ${a}% ${cursor}%`}).join(",")})`:"conic-gradient(#eee 0 100%)";

  function shiftMonth(n:number){const d=new Date(`${month}-01T12:00:00`);d.setMonth(d.getMonth()+n);setMonth(monthKey(d));}
  async function saveStartBalance(v:string){const value=Number(v)||0; const payload={user_id:userId,month,start_balance:value,updated_at:new Date().toISOString()}; const {data,error}=await supabase.from("monthly_budget_plans").upsert(payload,{onConflict:"user_id,month"}).select().single(); if(error)setNotice(error.message); else {setPlans(c=>[data as Plan,...c.filter(x=>x.month!==month)]);setNotice("Starting balance updated.")}}
  async function addItem(e:FormEvent<HTMLFormElement>){e.preventDefault();if(!addSection)return;const f=new FormData(e.currentTarget);const label=String(f.get("label")||"").trim();const amount=Number(f.get("amount"));if(!label||!amount)return;const {data,error}=await supabase.from("monthly_budget_items").insert({user_id:userId,month,section:addSection,label,planned_amount:amount,position:monthItems.filter(i=>i.section===addSection).length}).select().single();if(error)setNotice(error.message);else{setItems(c=>[...c,data as Item]);setAddSection(null);setNotice("Budget item added.")}}
  async function deleteItem(id:string){const {error}=await supabase.from("monthly_budget_items").delete().eq("id",id).eq("user_id",userId);if(error)setNotice(error.message);else setItems(c=>c.filter(i=>i.id!==id))}

  return <section className={styles.planner}>
    <header className={styles.header}><div><span>MONTHLY FINANCIAL PLANNER</span><h1>{monthTitle(month)}</h1><p>Your full monthly budget, actual spending and financial position in one view.</p></div><div className={styles.monthNav}><button onClick={()=>shiftMonth(-1)}><ChevronLeft/></button><input type="month" value={month} onChange={e=>setMonth(e.target.value)}/><button onClick={()=>shiftMonth(1)}><ChevronRight/></button></div></header>
    {notice&&<div className={styles.notice}>{notice}</div>}
    <div className={styles.topGrid}>
      <article className={styles.overview}><h3>Overview</h3><label>Start date<strong>01 {monthTitle(month)}</strong></label><label>End date<strong>{new Date(Number(month.slice(0,4)),Number(month.slice(5,7)),0).getDate()} {monthTitle(month)}</strong></label><label>Currency<strong>EUR</strong></label><label>Start balance<input defaultValue={startBalance} type="number" step="0.01" onBlur={e=>saveStartBalance(e.target.value)}/></label></article>
      <article className={styles.donutCard}><h3>Left to budget</h3><div className={styles.ring} style={{"--progress":`${Math.max(0,Math.min(100,budgetTotal?leftToBudget/budgetTotal*100:0))}%`} as React.CSSProperties}><strong>{eur(leftToBudget)}</strong></div></article>
      <article className={styles.bars}><h3>Budget vs actual</h3>{sections.map(s=>{const max=Math.max(planned(s.key),actual(s.key),1);return <div key={s.key}><span>{s.title}</span><i><b style={{width:`${planned(s.key)/max*100}%`}}/><em style={{width:`${actual(s.key)/max*100}%`}}/></i></div>})}</article>
      <article className={styles.breakdown}><h3>Breakdown</h3><div className={styles.pie} style={{background:gradient}}/><div>{spendingParts.map((p,i)=><span key={p.key}><i style={{background:palette[i%palette.length]}}/>{p.key} {totalOut?Math.round(p.value/totalOut*100):0}%</span>)}</div></article>
    </div>
    <div className={styles.cashFlow}><h3>Cash flow</h3><div><span>Start balance<b>{eur(startBalance)}</b></span><span>Income<b>{eur(totalIncome)}</b></span><span>Bills & expenses<b>-{eur(actual("bills")+actual("expenses"))}</b></span><span>Savings<b>-{eur(actual("savings"))}</b></span><span>Debt<b>-{eur(actual("debt"))}</b></span><span className={styles.left}>Left<b>{eur(left)}</b></span></div></div>
    <div className={styles.sectionGrid}>{sections.map(s=><article className={`${styles.tableCard} ${styles[s.key]}`} key={s.key}><header><h3>{s.title}</h3><button onClick={()=>setAddSection(s.key)}><Plus size={16}/>Add</button></header><div className={styles.tableHead}><span>Item</span><span>Budget</span><span>Actual</span><span>Left</span></div>{monthItems.filter(i=>i.section===s.key).map(i=>{const matchingActual=s.key==="income"?monthTx.filter(t=>t.type==="income"&&t.description.toLowerCase().includes(i.label.toLowerCase())).reduce((a,t)=>a+Number(t.amount_eur),0):0;return <div className={styles.row} key={i.id}><span>{i.label}</span><span>{eur(Number(i.planned_amount))}</span><span>{matchingActual?eur(matchingActual):"—"}</span><span>{eur(Number(i.planned_amount)-matchingActual)}</span><button onClick={()=>deleteItem(i.id)}><Trash2 size={14}/></button></div>})}<footer><span>Total</span><b>{eur(planned(s.key))}</b><b>{eur(actual(s.key))}</b><b>{eur(planned(s.key)-actual(s.key))}</b></footer></article>)}</div>
    <div className={styles.bottomGrid}><article className={styles.expenseTracker}><h3>Expense tracker</h3><div className={styles.expenseHead}><span>Date</span><span>Amount</span><span>Category</span><span>Notes</span></div>{monthTx.filter(t=>t.type!=="income").slice(0,15).map(t=><div className={styles.expenseRow} key={t.id}><span>{t.transaction_date}</span><span>{eur(Number(t.amount_eur))}</span><span>{t.category}</span><span>{t.description}</span></div>)}</article><article className={styles.spending}><h3>Spending breakdown</h3>{monthTx.filter(t=>t.type!=="income").reduce<Record<string,number>>((a,t)=>(a[t.category]=(a[t.category]||0)+Number(t.amount_eur),a),{}) && Object.entries(monthTx.filter(t=>t.type!=="income").reduce<Record<string,number>>((a,t)=>(a[t.category]=(a[t.category]||0)+Number(t.amount_eur),a),{})).sort((a,b)=>b[1]-a[1]).slice(0,10).map(([k,v])=><div key={k}><span>{k}</span><b>{eur(v)}</b><em>{totalOut?`${(v/totalOut*100).toFixed(1)}%`:"0%"}</em></div>)}</article></div>
    {addSection&&<div className={styles.modal}><form onSubmit={addItem}><button type="button" onClick={()=>setAddSection(null)}>×</button><WalletCards/><h3>Add {addSection} budget</h3><label>Item name<input name="label" required placeholder="e.g. Groceries"/></label><label>Planned amount (€)<input name="amount" type="number" min="0.01" step="0.01" required/></label><button className={styles.save}>Add to {monthTitle(month)}</button></form></div>}
  </section>
}
