"use client";

import Link from "next/link";

function fmtPrice(val) {
  const n = Number(val);
  if (!isFinite(n) || n === 0) return null;
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

export default function ItemCard({ item, href, showOwner = true, actionLabel }) {
  const price = fmtPrice(item.daily_rate ?? item.price);
  const condLabel = item.condition?.replace("_", " ") ?? null;

  return (
    <Link href={href} style={{ textDecoration: "none", color: "inherit", display: "block" }}>
      <div className="itemCard">
        {item.photo_url ? (
          <img
            className="itemCardImg"
            src={item.photo_url}
            alt={item.name}
            style={{ aspectRatio: "16/10", objectFit: "cover" }}
          />
        ) : (
          <div className="itemCardImgPlaceholder" style={{ aspectRatio: "16/10" }}>
            No image
          </div>
        )}
        <div className="itemCardBody">
          {price && (
            <p className="itemCardPrice">
              {price}
              <span style={{ fontWeight: 400, color: "#64748b", fontSize: 11 }}>/day</span>
            </p>
          )}
          <p className="itemCardName">{item.name}</p>
          {showOwner && item.owner_name && (
            <p className="itemCardMeta">{item.owner_name}</p>
          )}
          {actionLabel && (
            <p className="itemCardMeta" style={{ marginTop: 6, color: "#000", fontWeight: 600 }}>
              {actionLabel} →
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}
