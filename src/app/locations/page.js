"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import { supabase } from "@/lib/supabaseClient";

export default function LocationsPage() {
  const [locations, setLocations] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    supabase.from("locations").select("*").eq("status", "active").order("name")
      .then(({ data }) => { setLocations(data ?? []); setLoaded(true); });
  }, []);

  return (
    <div>
      <Header />
      <div className="container" style={{ paddingTop: 24 }}>
        <div className="pageHead">
          <div>
            <h1 className="pageTitle">Campus Locations</h1>
            <p className="pageSubtitle">Select a campus to browse available rental items</p>
          </div>
        </div>

        {!loaded ? <div className="centerNotice">Loading locations...</div>
          : locations.length === 0 ? <div className="centerNotice">No active locations yet.</div>
          : (
            <div className="cardsGrid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}>
              {locations.map((loc) => (
                <Link key={loc.id} href={`/locations/${loc.id}`} className="locationCard" style={{ textDecoration: "none", color: "inherit" }}>
                  <div style={{ fontSize: 32, marginBottom: 12 }}>📍</div>
                  <h2 style={{ margin: "0 0 6px", fontSize: 16, fontWeight: 700, lineHeight: 1.3 }}>{loc.name}</h2>
                  <p className="meta">{loc.building}</p>
                  <p className="meta">{loc.street}, {loc.city} {loc.province}</p>
                  <p className="meta" style={{ marginTop: 8 }}>🕐 {loc.hours}</p>
                  {loc.contact_email && <p className="meta">✉ {loc.contact_email}</p>}
                  <div style={{ marginTop: 16 }}>
                    <span className="btn btnPrimary btnSm">Browse items →</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
      </div>
    </div>
  );
}
