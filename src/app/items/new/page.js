"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import { sanitizeFileName, validateImageFile } from "@/lib/fileHelpers";
import { ensureProfileForUser, ownerNameFromUser } from "@/lib/profileHelpers";

async function uploadItemImage(userId, itemId, file) {
  const path = `${userId}/${itemId}/${Date.now()}-${sanitizeFileName(file.name)}`;

  const { error: uploadError } = await supabase.storage
    .from("item-images")
    .upload(path, file, { contentType: file.type });

  if (uploadError) {
    throw uploadError;
  }

  const { data } = supabase.storage.from("item-images").getPublicUrl(path);
  return {
    photo_url: data.publicUrl,
    photo_path: path,
  };
}

export default function NewItemPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [status, setStatus] = useState("available");
  const [photoFile, setPhotoFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();

    if (!user) {
      setMessage("You must be logged in to create an item.");
      return;
    }

    const numericPrice = Number(price);
    if (!Number.isFinite(numericPrice) || numericPrice < 0) {
      setMessage("Please enter a valid non-negative price.");
      return;
    }

    const imageValidation = validateImageFile(photoFile);
    if (imageValidation) {
      setMessage(imageValidation);
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      const { data: profileData, error: profileError } = await ensureProfileForUser(user);
      if (profileError) {
        console.error(profileError);
      }

      const ownerName = ownerNameFromUser(user, profileData);

      const { data: insertedItem, error: insertError } = await supabase
        .from("items")
        .insert({
          owner_id: user.id,
          owner_name: ownerName,
          owner_email: user.email ?? "",
          name: name.trim(),
          description: description.trim(),
          price: numericPrice,
          status,
        })
        .select()
        .single();

      if (insertError) {
        throw insertError;
      }

      if (photoFile) {
        const uploaded = await uploadItemImage(user.id, insertedItem.id, photoFile);

        const { error: updateError } = await supabase
          .from("items")
          .update({
            ...uploaded,
            updated_at: new Date().toISOString(),
          })
          .eq("id", insertedItem.id)
          .eq("owner_id", user.id);

        if (updateError) {
          throw updateError;
        }
      }

      router.push("/my-items");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to create item.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="container">
      <Header />

      <section className="pageHead">
        <div>
          <h1 className="pageTitle">Create Item</h1>
          <p className="pageSubtitle">
            Post an item for other students to browse.
          </p>
        </div>
      </section>

      {loading ? (
        <div className="centerNotice">Loading account...</div>
      ) : !user ? (
        <div className="centerNotice">
          Please <Link href="/login">log in</Link> to create an item.
        </div>
      ) : (
        <form className="formCard" onSubmit={handleSubmit}>
          <div className="field">
            <label className="label">Item name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="MacBook charger, calculator, guitar..."
              required
            />
          </div>

          <div className="field">
            <label className="label">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Condition, pickup details, notes..."
            />
          </div>

          <div className="field">
            <label className="label">Photo (optional, one image, max 5MB)</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)}
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
              placeholder="25"
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
            <button type="submit" className="btn btnPrimary" disabled={saving}>
              {saving ? "Creating..." : "Create item"}
            </button>
            <Link href="/my-items" className="btn btnGhost">
              Cancel
            </Link>
          </div>
        </form>
      )}

      {message ? (
        <p className={`messageText ${message.toLowerCase().includes("failed") ? "errorText" : ""}`}>
          {message}
        </p>
      ) : null}
    </div>
  );
}
