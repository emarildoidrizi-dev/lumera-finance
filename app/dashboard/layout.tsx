import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/Sidebar";

export default async function DashboardLayout({children}:{children:React.ReactNode}){
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user) redirect("/login");
  return <div className="app-shell"><Sidebar/><main className="app-main">{children}</main></div>;
}
