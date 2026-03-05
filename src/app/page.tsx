"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import ItemCard from "@/components/ItemCard";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabaseClient";

type Item = {
  id: number;
  owner_id: string;
  owner_name: string;
  owner_email: string;
  name: string;
  description: string;
  price: number | string;
  status: "available" | "unavailable";
  created_at: string;
};

export default function HomePage() {
  const { user, loading } = useAuth();
  const [items, setItems] = useState<Item[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    supabase
      .from("items")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (cancelled) return;

        if (error) {
          console.error(error);
          setErrorMessage(error.message);
          setItems([]);
          setIsLoaded(true);
          return;
        }

        setItems((data ?? []) as Item[]);
        setErrorMessage(null);
        setIsLoaded(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const visibleItems = user
    ? items.filter((item) => item.owner_id !== user.id)
    : items;

  return (
    <div className="container">
      <Header />

      <section className="pageHead">
        <div>
          <h1 className="pageTitle">Discover Items</h1>
          <p className="pageSubtitle">
            {user
              ? "Browse available listings from other students."
              : "Browse listings. Sign in to create and manage your own items."}
          </p>
        </div>

        <div className="actions" style={{ marginTop: 0 }}>
          <Link href="/items" className="btn btnGhost">
            All items
          </Link>
          <Link href="/items/new" className="btn btnPrimary">
            Create item
          </Link>
        </div>
      </section>

      {loading || !isLoaded ? (
        <div className="centerNotice">Loading items...</div>
      ) : errorMessage ? (
        <div className="centerNotice">
          <p className="errorText" style={{ margin: 0 }}>
            Failed to load items: {errorMessage}
          </p>
          <p style={{ margin: "8px 0 0" }}>
            Make sure you ran <span className="mono">npx supabase db push</span> after the
            new migration.
          </p>
        </div>
      ) : visibleItems.length === 0 ? (
        <div className="centerNotice">
          {user ? "No items from other users yet." : "No items have been posted yet."}
        </div>
      ) : (
        <div className="cardsGrid">
          {visibleItems.map((item) => (
            <ItemCard key={item.id} item={item} href={`/items/${item.id}`} />
          ))}
        </div>
      )}
    </div>
  );
}
