import Link from "next/link";
import { LayoutDashboard, ArrowLeftRight, ReceiptText, ChartPie, Target, Landmark, LogOut } from "lucide-react";
import { Brand } from "./Brand";
import { SignOutButton } from "./SignOutButton";

const links = [
  ["/dashboard", LayoutDashboard, "Overview"],
  ["/dashboard/transactions", ArrowLeftRight, "Transactions"],
  ["/dashboard/bills", ReceiptText, "Bills"],
  ["/dashboard/budget", ChartPie, "Budget"],
  ["/dashboard/goals", Target, "Goals"],
  ["/dashboard/net-worth", Landmark, "Net worth"],
] as const;

export function Sidebar() {
  return <aside className="sidebar"><Brand href="/dashboard"/><nav className="side-nav">{links.map(([href,Icon,label])=><Link className="side-link" href={href} key={href}><Icon size={18}/>{label}</Link>)}<SignOutButton/></nav></aside>;
}
