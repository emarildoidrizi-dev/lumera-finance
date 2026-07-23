import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DebtManager } from "@/components/DebtManager";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function DebtPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [{ data: debts, error: debtError }, { data: payments, error: paymentError }] =
    await Promise.all([
      supabase
        .from("debts")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("debt_payments")
        .select("*")
        .eq("user_id", user.id)
        .order("paid_at", { ascending: false }),
    ]);

  return (
    <DebtManager
      userId={user.id}
      initialDebts={debts ?? []}
      initialPayments={payments ?? []}
      initialError={debtError?.message ?? paymentError?.message ?? ""}
    />
  );
}
