"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import ItemCard from "@/components/ItemCard";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabaseClient";

export default function MyItemsPage() {
  const { user, loading } = useAuth();
  const [items, setItems] = useState([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!user) return;

    let cancelled = false;

    supabase
      .from("items")
      .select("*")
      .eq("owner_id", user.id)
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

        setItems(data ?? []);
        setErrorMessage("");
        setIsLoaded(true);
      });

    return () => {
      cancelled = true;
    };
  }, [user]);

  return (
    <div className="container">
      <Header />

      <section className="pageHead">
        <div>
          <h1 className="pageTitle">My Items</h1>
          <p className="pageSubtitle">Create, edit, and manage your item listings.</p>
        </div>

        <Link href="/items/new" className="btn btnPrimary">
          + Create Item
        </Link>
      </section>

      {loading ? (
        <div className="centerNotice">Loading account...</div>
      ) : !user ? (
        <div className="centerNotice">
          Please <Link href="/login">log in</Link> to manage your items.
        </div>
      ) : !isLoaded ? (
        <div className="centerNotice">Loading your items...</div>
      ) : errorMessage ? (
        <div className="centerNotice">
          <span className="errorText">Failed to load items: {errorMessage}</span>
        </div>
      ) : items.length === 0 ? (
        <div className="centerNotice">You have not created any items yet.</div>
      ) : (
        <div className="cardsGrid">
          {items.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              href={`/items/${item.id}`}
              showOwner={false}
              actionLabel="View / edit"
            />
          ))}
        </div>
      )}
    </div>
  );
}
