import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { NetWorthLive } from "@/components/NetWorthLive";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function NetWorthPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [{ data: debts, error: debtError }, { data: transactions, error: txError }] =
    await Promise.all([
      supabase
        .from("debts")
        .select("id,user_id,name,current_balance_eur,status,updated_at")
        .eq("user_id", user.id),
      supabase
        .from("transactions")
        .select("id,user_id,type,amount_eur,occurred_at,transaction_date")
        .eq("user_id", user.id),
    ]);

  return (
    <NetWorthLive
      userId={user.id}
      initialDebts={debts ?? []}
      initialTransactions={transactions ?? []}
      initialError={debtError?.message ?? txError?.message ?? ""}
    />
  );
}
