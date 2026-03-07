"use client";

import { useEffect, useState } from "react";
import Header from "@/components/Header";
import { AdminLayout } from "../page.js";
import { supabase } from "@/lib/supabaseClient";

export default function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => { load(); }, []);

  async function load() {
    const { data } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
    setUsers(data ?? []); setLoaded(true);
  }

  async function toggleBan(u) {
    const action = u.is_banned ? "unban" : "ban";
    if (!window.confirm(`${action.charAt(0).toUpperCase() + action.slice(1)} this user?`)) return;
    const { error } = await supabase.from("profiles").update({ is_banned: !u.is_banned, banned_until: null }).eq("id", u.id);
    if (error) { setMessage(error.message); return; }
    setMessage(`User ${action}ned.`);
    load();
  }

  return (
    <div>
      <Header />
      <AdminLayout>
        <h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 24px" }}>Manage Users</h1>
        {message && <p className="messageText successText">{message}</p>}

        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <table className="table">
            <thead>
              <tr><th>Name</th><th>Email</th><th>Role</th><th>Rating</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {!loaded ? <tr><td colSpan={6} style={{ textAlign: "center", color: "var(--text-muted)", padding: 32 }}>Loading...</td></tr>
                : users.length === 0 ? <tr><td colSpan={6} style={{ textAlign: "center", color: "var(--text-muted)", padding: 32 }}>No users.</td></tr>
                : users.map((u) => (
                  <tr key={u.id} style={{ background: u.is_banned ? "#fff5f5" : "" }}>
                    <td style={{ fontWeight: 600 }}>{u.first_name} {u.last_name}</td>
                    <td style={{ color: "var(--text-muted)" }}>{u.email}</td>
                    <td style={{ textTransform: "capitalize" }}>{u.role ?? "student"}</td>
                    <td>{u.rating ? `${u.rating} ★` : "—"}</td>
                    <td><span className={`badge ${u.is_banned ? "badgeRed" : "badgeGreen"}`}>{u.is_banned ? "Banned" : "Active"}</span></td>
                    <td>
                      <button className={`btn btnSm ${u.is_banned ? "btnPrimary" : "btnDanger"}`} onClick={() => toggleBan(u)}>
                        {u.is_banned ? "Unban" : "Ban"}
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </AdminLayout>
    </div>
  );
}
