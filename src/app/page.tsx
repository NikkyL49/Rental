"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import ItemCard from "@/components/ItemCard";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabaseClient";

const CATEGORIES = [
  { id: "", label: "All" },
  { id: "C-TXTBK", label: "Textbooks" },
  { id: "C-ELEC",  label: "Electronics" },
  { id: "C-LAB",   label: "Lab Equipment" },
];

type Item = {
  id: number;
  owner_id: string;
  owner_name: string;
  owner_email: string;
  name: string;
  description: string;
  price: number | string;
  daily_rate?: number;
  condition?: string;
  category_id?: string;
  status: "available" | "unavailable";
  item_status?: string;
  photo_url?: string;
  created_at: string;
};

export default function HomePage() {
  const { user, loading } = useAuth();
  const [items, setItems] = useState<Item[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState("");

  useEffect(() => {
    let cancelled = false;
    let query = supabase
      .from("items")
      .select("*")
      .order("created_at", { ascending: false });

    if (categoryFilter) query = (query as any).eq("category_id", categoryFilter);

    query.then(({ data, error }: any) => {
      if (cancelled) return;
      if (error) { setErrorMessage(error.message); setItems([]); }
      else { setItems((data ?? []) as Item[]); setErrorMessage(null); }
      setIsLoaded(true);
    });

    return () => { cancelled = true; };
  }, [categoryFilter]);

  const visibleItems = user
    ? items.filter((item) => item.owner_id !== user.id)
    : items;

  return (
    <div>
      <Header />
      <div className="container">
        {/* Hero */}
        <section style={{
          background: "#000", color: "#fff",
          borderRadius: 16, padding: "48px 40px",
          margin: "24px 0 32px",
          backgroundImage: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
        }}>
          <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", opacity: 0.6, margin: "0 0 10px" }}>
            Student Rental Platform
          </p>
          <h1 style={{ fontSize: "clamp(28px,4vw,44px)", fontWeight: 900, margin: "0 0 12px", letterSpacing: "-0.03em", lineHeight: 1.1 }}>
            Rent what you need,<br />list what you have.
          </h1>
          <p style={{ opacity: 0.7, fontSize: 15, margin: "0 0 24px", maxWidth: 480 }}>
            Textbooks, laptops, calculators and lab equipment — available across all campus locations.
          </p>
          <div style={{ display: "flex", gap: 10 }}>
            <Link href="/locations" className="btn btnPrimary" style={{ background: "#fff", color: "#000" }}>
              Browse Locations
            </Link>
            <Link href="/items/new" className="btn btnGhost" style={{ border: "1px solid rgba(255,255,255,0.3)", color: "#fff" }}>
              List an Item
            </Link>
          </div>
        </section>

        {/* Category filter */}
        <div className="filterPills">
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              onClick={() => setCategoryFilter(c.id)}
              className={`pill${categoryFilter === c.id ? " pillActive" : ""}`}
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* Items grid */}
        {loading || !isLoaded ? (
          <div className="centerNotice">Loading items...</div>
        ) : errorMessage ? (
          <div className="centerNotice">
            <p className="errorText" style={{ margin: 0 }}>Failed to load items: {errorMessage}</p>
          </div>
        ) : visibleItems.length === 0 ? (
          <div className="centerNotice">
            {user ? "No items from other students yet." : "No items have been posted yet."}
          </div>
        ) : (
          <div className="cardsGrid">
            {visibleItems.map((item) => (
              <ItemCard key={item.id} item={item} href={`/items/${item.id}`} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
