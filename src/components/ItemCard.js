import Link from "next/link";

function formatPrice(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return "$0.00";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(num);
}

export default function ItemCard({ item, href, showOwner = true, actionLabel = "View item" }) {
  const statusClass =
    item.status === "available" ? "status statusAvailable" : "status statusUnavailable";

  return (
    <article className="card">
      <div className="itemMediaFrame">
        {item.photo_url ? (
          <img
            className="itemMedia"
            src={item.photo_url}
            alt={item.name ? `Photo for ${item.name}` : "Item photo"}
            loading="lazy"
          />
        ) : (
          <div className="itemMedia itemMediaPlaceholder">No image</div>
        )}
      </div>

      <div className="rowBetween">
        <h3 className="cardTitle">{item.name}</h3>
        <span className={statusClass}>{item.status}</span>
      </div>

      {item.description ? <p className="metaClamp">{item.description}</p> : null}
      {showOwner ? <p className="meta">Posted by: {item.owner_name || item.owner_email}</p> : null}
      <p className="meta">Price: {formatPrice(item.price)}</p>

      <div className="actions">
        <Link href={href} className="btn btnGhost">
          {actionLabel}
        </Link>
      </div>
    </article>
  );
}
