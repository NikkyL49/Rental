"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Header from "@/components/Header";
import { supabase } from "@/lib/supabaseClient";

const ADMIN_LINKS = [
  { href: "/admin", label: "Dashboard", icon: "◼" },
  { href: "/admin/locations", label: "Locations", icon: "📍" },
  { href: "/admin/items", label: "Items", icon: "📦" },
  { href: "/admin/rentals", label: "Rentals", icon: "🔑" },
  { href: "/admin/users", label: "Users", icon: "👤" },
];

export function AdminLayout({ children }) {
  const pathname = usePathname();
  return (
    <div className="adminLayout">
      <aside className="adminSidebar">
        <div style={{ background: "#000", color: "#fff", padding: "14px 20px", display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontWeight: 900, fontSize: 16, letterSpacing: "0.06em" }}>RENTIFY</span>
          <span style={{ fontSize: 11, opacity: 0.6, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em" }}>Admin</span>
        </div>
        <ul className="adminNav">
          {ADMIN_LINKS.map(({ href, label, icon }) => (
            <li key={href} className={`adminNavItem${pathname === href ? " active" : ""}`}>
              <Link href={href}><span>{icon}</span>{label}</Link>
            </li>
          ))}
        </ul>
      </aside>
      <div className="adminContent">{children}</div>
    </div>
  );
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState({ totalItems: 0, activeRentals: 0, totalRevenue: 0, overdueRentals: 0, pendingReturns: 0, suspendedUsers: 0 });
  const [recent, setRecent] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    async function load() {
      const [ic, rc, uc] = await Promise.all([
        supabase.from("items").select("id", { count: "exact", head: true }),
        supabase.from("rental_transactions").select("id, status, total_cost, expected_return_date, created_at, item_id"),
        supabase.from("profiles").select("id, is_banned"),
      ]);
      const all = rc.data ?? [];
      const today = new Date();
      setStats({
        totalItems: ic.count ?? 0,
        activeRentals: all.filter((r) => r.status === "active").length,
        totalRevenue: all.filter((r) => r.status === "returned").reduce((s, r) => s + Number(r.total_cost || 0), 0),
        overdueRentals: all.filter((r) => r.status === "active" && new Date(r.expected_return_date) < today).length,
        pendingReturns: all.filter((r) => r.status === "active").length,
        suspendedUsers: (uc.data ?? []).filter((u) => u.is_banned).length,
      });
      setRecent(all.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 7));
      setLoaded(true);
    }
    load();
  }, []);

  function fmtPrice(v) { return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(v); }
  function fmtTime(s) { return new Date(s).toLocaleTimeString("en-CA", { hour: "2-digit", minute: "2-digit" }); }

  const statCards = [
    { label: "Total Items", value: stats.totalItems, danger: false },
    { label: "Active Rentals", value: stats.activeRentals, danger: false },
    { label: "Total Revenue", value: fmtPrice(stats.totalRevenue), danger: false },
    { label: "Overdue Rentals", value: stats.overdueRentals, danger: true },
    { label: "Pending Returns", value: stats.pendingReturns, danger: false },
    { label: "Suspended Users", value: stats.suspendedUsers, danger: false },
  ];

  return (
    <div>
      <Header />
      <AdminLayout>
        <h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 24px" }}>Dashboard</h1>

        <div className="statsGrid">
          {statCards.map((s) => (
            <div key={s.label} className={`statCard${s.danger ? " statCardDanger" : ""}`}>
              <p className="statLabel">{s.label}</p>
              <p className="statValue">{loaded ? s.value : "—"}</p>
            </div>
          ))}
        </div>

        {/* Recent Activity */}
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--line)" }}>
            <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>Recent Activity</h2>
          </div>
          <table className="table">
            <thead>
              <tr><th>Time</th><th>Action</th><th>Rental ID</th><th>Item</th></tr>
            </thead>
            <tbody>
              {!loaded ? (
                <tr><td colSpan={4} style={{ textAlign: "center", color: "var(--text-muted)" }}>Loading...</td></tr>
              ) : recent.length === 0 ? (
                <tr><td colSpan={4} style={{ textAlign: "center", color: "var(--text-muted)" }}>No activity yet.</td></tr>
              ) : recent.map((r) => (
                <tr key={r.id}>
                  <td style={{ color: "var(--text-muted)" }}>{fmtTime(r.created_at)}</td>
                  <td>New rental</td>
                  <td><Link href={`/rentals/${r.id}`} style={{ fontWeight: 600 }}>{r.id}</Link></td>
                  <td style={{ color: "var(--text-muted)" }}>Item #{r.item_id}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Alerts */}
        {loaded && (stats.overdueRentals > 0 || stats.suspendedUsers > 0) && (
          <div style={{ marginTop: 16, background: "#374151", color: "#fff", borderRadius: 10, padding: "14px 18px", fontSize: 13 }}>
            <p style={{ margin: "0 0 8px", fontWeight: 700 }}>Alerts</p>
            <ul style={{ margin: 0, padding: "0 0 0 16px", lineHeight: 1.9 }}>
              {stats.overdueRentals > 0 && <li>{stats.overdueRentals} item{stats.overdueRentals !== 1 ? "s are" : " is"} overdue</li>}
              {stats.pendingReturns > 0 && <li>{stats.pendingReturns} items pending return today</li>}
              {stats.suspendedUsers > 0 && <li>{stats.suspendedUsers} user{stats.suspendedUsers !== 1 ? "s" : ""} currently suspended</li>}
            </ul>
          </div>
        )}
      </AdminLayout>
    </div>
  );
}
