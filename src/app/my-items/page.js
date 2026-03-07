"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Header from "@/components/Header";
import ItemCard from "@/components/ItemCard";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabaseClient";

const SIDEBAR_LINKS = [
  { href: "/profile", label: "Account Main" },
  { href: "/profile/payment", label: "Payment Methods" },
  { href: "/my-items", label: "My Listed Items" },
  { href: "/my-rentals", label: "My Rentals" },
];

export default function MyItemsPage() {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const [items, setItems] = useState([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [tab, setTab] = useState("active"); // active | past

  useEffect(() => {
    if (!user) return;
    supabase.from("items").select("*").eq("owner_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => { setItems(data ?? []); setIsLoaded(true); });
  }, [user]);

  const activeItems = items.filter((i) => i.item_status !== "rented" && i.status !== "unavailable");
  const pastItems = items.filter((i) => i.item_status === "rented" || i.status === "unavailable");
  const displayed = tab === "active" ? activeItems : pastItems;

  return (
    <div>
      <Header />
      <div className="accountLayout">
        <aside className="accountSidebar">
          <div className="sidebarUser" style={{ padding: "20px 20px 16px" }}>
            <p className="sidebarName">{user?.email ?? "Account"}</p>
          </div>
          <ul className="sidebarNav">
            {SIDEBAR_LINKS.map(({ href, label }) => (
              <li key={href} className={`sidebarNavItem${pathname === href ? " active" : ""}`}>
                <Link href={href}>{label}</Link>
              </li>
            ))}
          </ul>
        </aside>

        <div className="accountContent">
          <div className="pageHead">
            <h1 className="pageTitle">My Listed Items</h1>
            <Link href="/items/new" className="btn btnPrimary">+ Post Item</Link>
          </div>

          <div className="tabs">
            <button className={`tab${tab === "active" ? " tabActive" : ""}`} onClick={() => setTab("active")}>
              Active Listings
              {activeItems.length > 0 && <span className="tabBadge">{activeItems.length}</span>}
            </button>
            <button className={`tab${tab === "past" ? " tabActive" : ""}`} onClick={() => setTab("past")}>
              Past Listings
            </button>
          </div>

          {loading ? (
            <div className="centerNotice">Loading...</div>
          ) : !user ? (
            <div className="centerNotice">Please <Link href="/login">log in</Link>.</div>
          ) : !isLoaded ? (
            <div className="centerNotice">Loading items...</div>
          ) : displayed.length === 0 ? (
            <div className="centerNotice">
              {tab === "active" ? "No active listings." : "No past listings."}
            </div>
          ) : (
            <div className="cardsGrid">
              {displayed.map((item) => (
                <ItemCard key={item.id} item={item} href={`/items/${item.id}`}
                  showOwner={false} actionLabel="View / Edit" />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
