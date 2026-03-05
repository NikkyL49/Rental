"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import Header from "@/components/Header";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import { sanitizeFileName, validateImageFile } from "@/lib/fileHelpers";

function formatPrice(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return "$0.00";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(num);
}

async function uploadItemImage(userId, itemId, file) {
  const path = `${userId}/${itemId}/${Date.now()}-${sanitizeFileName(file.name)}`;

  const { error: uploadError } = await supabase.storage
    .from("item-images")
    .upload(path, file, { contentType: file.type });

  if (uploadError) {
    throw uploadError;
  }

  const { data } = supabase.storage.from("item-images").getPublicUrl(path);
  return { photo_url: data.publicUrl, photo_path: path };
}

async function deleteItemImage(path) {
  if (!path) return;

  const { error } = await supabase.storage.from("item-images").remove([path]);
  if (error) {
    throw error;
  }
}

export default function ItemDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const id = params?.id;

  const [item, setItem] = useState(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [status, setStatus] = useState("available");
  const [newPhotoFile, setNewPhotoFile] = useState(null);

  const isOwner = !!user && !!item && user.id === item.owner_id;

  useEffect(() => {
    if (!id) return;

    let cancelled = false;

    supabase
      .from("items")
      .select("*")
      .eq("id", id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return;

        if (error) {
          console.error(error);
          setMessage(error.message);
          setItem(null);
          setIsLoaded(true);
          return;
        }

        setItem(data ?? null);
        setName(data?.name ?? "");
        setDescription(data?.description ?? "");
        setPrice(data?.price != null ? String(data.price) : "");
        setStatus(data?.status ?? "available");
        setMessage("");
        setIsLoaded(true);
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  async function saveItem(event) {
    event.preventDefault();
    if (!item || !isOwner) return;

    const numericPrice = Number(price);
    if (!Number.isFinite(numericPrice) || numericPrice < 0) {
      setMessage("Please enter a valid non-negative price.");
      return;
    }

    const imageValidation = validateImageFile(newPhotoFile);
    if (imageValidation) {
      setMessage(imageValidation);
      return;
    }

    setBusy(true);
    setMessage("");

    try {
      const previousPhotoPath = item.photo_path || "";
      const updates = {
        name: name.trim(),
        description: description.trim(),
        price: numericPrice,
        status,
        updated_at: new Date().toISOString(),
      };

      if (newPhotoFile) {
        const uploaded = await uploadItemImage(user.id, item.id, newPhotoFile);
        updates.photo_url = uploaded.photo_url;
        updates.photo_path = uploaded.photo_path;
      }

      const { data, error } = await supabase
        .from("items")
        .update(updates)
        .eq("id", item.id)
        .eq("owner_id", user.id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      if (
        newPhotoFile &&
        previousPhotoPath &&
        previousPhotoPath !== updates.photo_path
      ) {
        try {
          await deleteItemImage(previousPhotoPath);
        } catch (cleanupError) {
          console.error(cleanupError);
        }
      }

      setItem(data);
      setNewPhotoFile(null);
      setMessage("Item updated.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to update item.");
    } finally {
      setBusy(false);
    }
  }

  async function removeItemPhoto() {
    if (!item || !isOwner || (!item.photo_path && !item.photo_url)) return;

    const ok = window.confirm("Remove photo from this item?");
    if (!ok) return;

    setBusy(true);
    setMessage("");

    try {
      if (item.photo_path) {
        try {
          await deleteItemImage(item.photo_path);
        } catch (cleanupError) {
          console.error(cleanupError);
        }
      }

      const updates = {
        photo_url: "",
        photo_path: "",
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from("items")
        .update(updates)
        .eq("id", item.id)
        .eq("owner_id", user.id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      setItem(data);
      setNewPhotoFile(null);
      setMessage("Item photo removed.");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Failed to remove item photo."
      );
    } finally {
      setBusy(false);
    }
  }

  async function deleteItem() {
    if (!item || !isOwner) return;
    if (!window.confirm("Delete this item?")) return;

    setBusy(true);
    setMessage("");

    try {
      if (item.photo_path) {
        try {
          await deleteItemImage(item.photo_path);
        } catch (cleanupError) {
          console.error(cleanupError);
        }
      }

      const { error } = await supabase
        .from("items")
        .delete()
        .eq("id", item.id)
        .eq("owner_id", user.id);

      if (error) {
        throw error;
      }

      router.push("/my-items");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to delete item.");
      setBusy(false);
    }
  }

  function contactOwner() {
    if (!item) return;

    if (!user) {
      router.push("/login");
      return;
    }

    if (isOwner) {
      setMessage("This is your item.");
      return;
    }

    router.push(`/messages?u=${item.owner_id}`);
  }

  return (
    <div className="container">
      <Header />

      {!isLoaded ? (
        <div className="centerNotice">Loading item...</div>
      ) : !item ? (
        <div className="centerNotice">Item not found.</div>
      ) : (
        <div className="stack">
          <section className="card">
            <div className="detailImageFrame">
              {item.photo_url ? (
                <img
                  className="detailImage"
                  src={item.photo_url}
                  alt={item.name ? `Photo for ${item.name}` : "Item photo"}
                />
              ) : (
                <div className="detailImage detailImagePlaceholder">No image</div>
              )}
            </div>

            <div className="rowBetween" style={{ marginTop: 12 }}>
              <h1 className="detailTitle">{item.name}</h1>
              <span
                className={
                  item.status === "available"
                    ? "status statusAvailable"
                    : "status statusUnavailable"
                }
              >
                {item.status}
              </span>
            </div>

            {item.description ? <p className="meta">{item.description}</p> : null}
            <p className="meta">Posted by: {item.owner_name || item.owner_email}</p>
            <p className="meta">Price: {formatPrice(item.price)}</p>

            {!isOwner ? (
              <div className="actions">
                <button
                  type="button"
                  className="btn btnPrimary"
                  onClick={contactOwner}
                  disabled={busy}
                >
                  Message owner
                </button>
              </div>
            ) : null}
          </section>

          {isOwner ? (
            <form className="formCard" onSubmit={saveItem}>
              <h2 style={{ margin: 0 }}>Edit Item</h2>

              <div className="field" style={{ marginTop: 12 }}>
                <label className="label">Item name</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="field">
                <label className="label">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div className="field">
                <label className="label">Replace photo (optional, max 5MB)</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setNewPhotoFile(e.target.files?.[0] ?? null)}
                />
              </div>

              <div className="field">
                <label className="label">Price</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  required
                />
              </div>

              <div className="field">
                <label className="label">Availability</label>
                <select value={status} onChange={(e) => setStatus(e.target.value)}>
                  <option value="available">available</option>
                  <option value="unavailable">unavailable</option>
                </select>
              </div>

              <div className="actions">
                <button type="submit" className="btn btnPrimary" disabled={busy}>
                  {busy ? "Saving..." : "Save changes"}
                </button>

                {(item.photo_path || item.photo_url) ? (
                  <button
                    type="button"
                    className="btn btnGhost"
                    onClick={removeItemPhoto}
                    disabled={busy}
                  >
                    Remove photo
                  </button>
                ) : null}

                <button
                  type="button"
                  className="btn btnDanger"
                  onClick={deleteItem}
                  disabled={busy}
                >
                  Delete item
                </button>

                <Link href="/my-items" className="btn btnGhost">
                  Back to my items
                </Link>
              </div>
            </form>
          ) : null}
        </div>
      )}

      {message ? (
        <p
          className={`messageText ${
            message.toLowerCase().includes("failed") ||
            message.toLowerCase().includes("not found")
              ? "errorText"
              : ""
          }`}
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}
