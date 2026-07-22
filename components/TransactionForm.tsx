"use client";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function TransactionForm(){
  const router=useRouter(); const [loading,setLoading]=useState(false); const [error,setError]=useState("");
  async function submit(e:FormEvent<HTMLFormElement>){e.preventDefault();setLoading(true);setError("");const form=new FormData(e.currentTarget);const supabase=createClient();const {data:{user}}=await supabase.auth.getUser();if(!user){setError("Please log in again.");setLoading(false);return;}const {error}=await supabase.from("transactions").insert({user_id:user.id,description:String(form.get("description")),amount:Number(form.get("amount")),type:String(form.get("type")),category:String(form.get("category")),transaction_date:String(form.get("date"))});if(error)setError(error.message);else{e.currentTarget.reset();router.refresh();}setLoading(false);}
  return <form className="form" onSubmit={submit}><div className="field"><label>Description</label><input className="input" name="description" required/></div><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}><div className="field"><label>Amount (€)</label><input className="input" name="amount" type="number" min="0.01" step="0.01" required/></div><div className="field"><label>Type</label><select className="input" name="type"><option value="expense">Expense</option><option value="income">Income</option></select></div></div><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}><div className="field"><label>Category</label><input className="input" name="category" placeholder="Groceries" required/></div><div className="field"><label>Date</label><input className="input" name="date" type="date" required/></div></div>{error&&<div className="alert alert-error">{error}</div>}<button className="btn btn-primary" disabled={loading}>{loading?"Saving…":"Save transaction"}</button></form>;
}
