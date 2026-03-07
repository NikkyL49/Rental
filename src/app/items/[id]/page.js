"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import Header from "@/components/Header";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import { sanitizeFileName, validateImageFile } from "@/lib/fileHelpers";

function fmtPrice(v) {
  const n = Number(v);
  if (!isFinite(n) || n === 0) return null;
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

function Stars({ rating = 0 }) {
  const r = Math.round(Number(rating));
  return <span className="stars">{"★".repeat(r)}{"☆".repeat(Math.max(0, 5 - r))}</span>;
}

const CONDITION_LABELS = { new: "New", like_new: "Like New", good: "Good", fair: "Fair" };
const CONDITION_COLORS = { new: "badgeGreen", like_new: "badgeBlue", good: "badgeBlue", fair: "badgeOrange" };

async function uploadItemImage(userId, itemId, file) {
  const path = `${userId}/${itemId}/${Date.now()}-${sanitizeFileName(file.name)}`;
  const { error } = await supabase.storage.from("item-images").upload(path, file, { contentType: file.type });
  if (error) throw error;
  const { data } = supabase.storage.from("item-images").getPublicUrl(path);
  return { photo_url: data.publicUrl, photo_path: path };
}
async function deleteItemImage(path) {
  if (!path) return;
  await supabase.storage.from("item-images").remove([path]);
}

export default function ItemDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const id = params?.id;

  const [item, setItem] = useState(null);
  const [location, setLocation] = useState(null);
  const [specs, setSpecs] = useState([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [editMode, setEditMode] = useState(false);

  // Edit form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [dailyRate, setDailyRate] = useState("");
  const [weeklyRate, setWeeklyRate] = useState("");
  const [semesterRate, setSemesterRate] = useState("");
  const [depositAmount, setDepositAmount] = useState("");
  const [status, setStatus] = useState("available");
  const [newPhotoFile, setNewPhotoFile] = useState(null);

  const isOwner = !!user && !!item && user.id === item.owner_id;

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    Promise.all([
      supabase.from("items").select("*").eq("id", id).maybeSingle(),
      supabase.from("item_specifications").select("*").eq("item_id", id),
    ]).then(async ([itemRes, specsRes]) => {
      if (cancelled) return;
      const itemData = itemRes.data ?? null;
      setItem(itemData);
      setSpecs(specsRes.data ?? []);
      if (itemData) {
        setName(itemData.name ?? "");
        setDescription(itemData.description ?? "");
        setDailyRate(String(itemData.daily_rate ?? ""));
        setWeeklyRate(String(itemData.weekly_rate ?? ""));
        setSemesterRate(String(itemData.semester_rate ?? ""));
        setDepositAmount(String(itemData.deposit_amount ?? ""));
        setStatus(itemData.status ?? "available");
        if (itemData.location_id) {
          const { data: loc } = await supabase.from("locations").select("*").eq("id", itemData.location_id).maybeSingle();
          if (!cancelled) setLocation(loc);
        }
      }
      setIsLoaded(true);
    });
    return () => { cancelled = true; };
  }, [id]);

  async function saveItem(e) {
    e.preventDefault();
    if (!item || !isOwner) return;
    const imgErr = validateImageFile(newPhotoFile);
    if (imgErr) { setMessage(imgErr); return; }
    setBusy(true); setMessage("");
    try {
      const prevPath = item.photo_path || "";
      const updates = { name: name.trim(), description: description.trim(),
        daily_rate: Number(dailyRate) || 0, weekly_rate: Number(weeklyRate) || 0,
        semester_rate: Number(semesterRate) || 0, deposit_amount: Number(depositAmount) || 0,
        price: Number(dailyRate) || 0, status, updated_at: new Date().toISOString() };
      if (newPhotoFile) {
        const up = await uploadItemImage(user.id, item.id, newPhotoFile);
        updates.photo_url = up.photo_url; updates.photo_path = up.photo_path;
      }
      const { data, error } = await supabase.from("items").update(updates)
        .eq("id", item.id).eq("owner_id", user.id).select().single();
      if (error) throw error;
      if (newPhotoFile && prevPath && prevPath !== updates.photo_path) {
        try { await deleteItemImage(prevPath); } catch {}
      }
      setItem(data); setNewPhotoFile(null); setMessage("Item updated."); setEditMode(false);
    } catch (err) { setMessage(err instanceof Error ? err.message : "Failed to update."); }
    finally { setBusy(false); }
  }

  async function deleteItem() {
    if (!item || !isOwner) return;
    if (!window.confirm("Delete this item?")) return;
    setBusy(true);
    try {
      if (item.photo_path) { try { await deleteItemImage(item.photo_path); } catch {} }
      const { error } = await supabase.from("items").delete().eq("id", item.id).eq("owner_id", user.id);
      if (error) throw error;
      router.push("/my-items");
    } catch (err) { setMessage(err instanceof Error ? err.message : "Failed to delete."); setBusy(false); }
  }

  function contactOwner() {
    if (!user) { router.push("/login"); return; }
    if (isOwner) { setMessage("This is your item."); return; }
    router.push(`/messages?u=${item.owner_id}`);
  }

  if (!isLoaded) return <div><Header /><div className="container"><div className="centerNotice" style={{ marginTop: 24 }}>Loading...</div></div></div>;
  if (!item) return <div><Header /><div className="container"><div className="centerNotice" style={{ marginTop: 24 }}>Item not found.</div></div></div>;

  const condKey = item.condition ?? "good";

  return (
    <div>
      <Header />
      <div className="container" style={{ paddingTop: 24 }}>
        <Link href="/items" style={{ fontSize: 13, color: "var(--text-muted)" }}>← Back</Link>

        <div className="detailLayout" style={{ marginTop: 20, gridTemplateColumns: "340px 1fr" }}>
          {/* Left: Gallery */}
          <div className="detailGallery">
            {item.photo_url
              ? <img className="detailMainImg" src={item.photo_url} alt={item.name} style={{ aspectRatio: "3/4", maxHeight: 400 }} />
              : <div className="detailMainImgPlaceholder" style={{ height: 260 }}><span style={{ fontSize: 13 }}>No image</span></div>}
          </div>

          {/* Right: Info panel */}
          <div className="detailPanel">
            <p className="detailCategory">{item.category_id ?? "Item"}</p>
            <h1 className="detailTitle">{item.name}</h1>

            <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12 }}>
              <span className={`badge ${CONDITION_COLORS[condKey] ?? "badgeGray"}`}>
                {CONDITION_LABELS[condKey] ?? condKey}
              </span>
              {item.item_status && (
                <span className={`badge ${item.item_status === "available" ? "badgeGreen" : "badgeGray"}`}>
                  {item.item_status}
                </span>
              )}
            </div>

            {/* Specs table */}
            {specs.length > 0 && (
              <div className="detailSection">
                <p className="detailSectionTitle">Specifications</p>
                <table className="specTable">
                  <tbody>
                    {specs.map((s) => (
                      <tr key={s.id}>
                        <td>{s.attribute_name}</td>
                        <td>{s.attribute_value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Location */}
            {location && (
              <div className="detailSection">
                <p className="detailSectionTitle">Location</p>
                <p style={{ fontSize: 14, margin: 0, fontWeight: 600 }}>{location.name}</p>
                <p className="meta">{location.building}</p>
              </div>
            )}

            {/* Seller */}
            <div className="detailSection">
              <p className="detailSectionTitle">Seller</p>
              <div className="sellerCard">
                <div className="sellerAvatar">
                  {(item.owner_name || item.owner_email || "U")[0].toUpperCase()}
                </div>
                <div>
                  <p className="sellerName">{item.owner_name || item.owner_email}</p>
                  <p className="sellerRating">
                    <Stars rating={item.owner_rating ?? 0} /> {item.owner_rating ? `${item.owner_rating}/5` : "No ratings yet"}
                  </p>
                </div>
              </div>
            </div>

            {/* Pricing */}
            <div className="detailSection">
              <p className="detailSectionTitle">Pricing</p>
              <div className="priceGrid">
                {[
                  { label: "Daily", val: item.daily_rate },
                  { label: "Weekly", val: item.weekly_rate },
                  { label: "Semester", val: item.semester_rate },
                  { label: "Deposit", val: item.deposit_amount },
                ].filter(({ val }) => Number(val) > 0).map(({ label, val }) => (
                  <div className="priceBox" key={label}>
                    <p className="priceBoxLabel">{label}</p>
                    <p className="priceBoxValue">{fmtPrice(val)}</p>
                  </div>
                ))}
                {/* Fallback for old items using only price */}
                {!item.daily_rate && Number(item.price) > 0 && (
                  <div className="priceBox">
                    <p className="priceBoxLabel">Price</p>
                    <p className="priceBoxValue">{fmtPrice(item.price)}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Description */}
            {item.description && (
              <div className="detailSection">
                <p className="detailSectionTitle">Description</p>
                <p style={{ margin: 0, fontSize: 14, lineHeight: 1.7, color: "var(--text-muted)" }}>{item.description}</p>
              </div>
            )}

            {/* Actions */}
            {!isOwner ? (
              <div className="actions" style={{ marginTop: 20 }}>
                <Link href={`/items/${item.id}/rent`} className="btn btnPrimary btnLg" style={{ flex: 1, justifyContent: "center" }}>
                  Request to Rent
                </Link>
              </div>
            ) : (
              <div className="actions" style={{ marginTop: 20 }}>
                <button className="btn btnGhost" onClick={() => setEditMode(!editMode)}>
                  {editMode ? "Cancel" : "Edit Item"}
                </button>
                <button className="btn btnDanger" onClick={deleteItem} disabled={busy}>Delete</button>
              </div>
            )}

            {message && (
              <p className={`messageText ${message.includes("fail") || message.includes("not") ? "errorText" : "successText"}`}>
                {message}
              </p>
            )}

            {/* Edit form */}
            {isOwner && editMode && (
              <form className="formCard" onSubmit={saveItem} style={{ marginTop: 20 }}>
                <h3 style={{ margin: "0 0 16px" }}>Edit Item</h3>
                <div className="field"><label className="label">Title</label>
                  <input value={name} onChange={(e) => setName(e.target.value)} required /></div>
                <div className="field"><label className="label">Description</label>
                  <textarea value={description} onChange={(e) => setDescription(e.target.value)} /></div>
                <div className="field"><label className="label">Replace Photo</label>
                  <input type="file" accept="image/*" onChange={(e) => setNewPhotoFile(e.target.files?.[0] ?? null)} /></div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div className="field"><label className="label">Daily Rate ($)</label>
                    <input type="number" min="0" step="0.01" value={dailyRate} onChange={(e) => setDailyRate(e.target.value)} /></div>
                  <div className="field"><label className="label">Weekly Rate ($)</label>
                    <input type="number" min="0" step="0.01" value={weeklyRate} onChange={(e) => setWeeklyRate(e.target.value)} /></div>
                  <div className="field"><label className="label">Semester Rate ($)</label>
                    <input type="number" min="0" step="0.01" value={semesterRate} onChange={(e) => setSemesterRate(e.target.value)} /></div>
                  <div className="field"><label className="label">Deposit ($)</label>
                    <input type="number" min="0" step="0.01" value={depositAmount} onChange={(e) => setDepositAmount(e.target.value)} /></div>
                </div>
                <div className="field"><label className="label">Status</label>
                  <select value={status} onChange={(e) => setStatus(e.target.value)}>
                    <option value="available">Available</option>
                    <option value="unavailable">Unavailable</option>
                  </select></div>
                <div className="actions">
                  <button type="submit" className="btn btnPrimary" disabled={busy}>{busy ? "Saving..." : "Save Changes"}</button>
                </div>
              </form>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
