"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import { ensureProfileForUser } from "@/lib/profileHelpers";

export default function LoginPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [mode, setMode] = useState("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => { if (!loading && user) router.push("/"); }, [loading, user, router]);

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage(""); setSaving(true);
    try {
      if (mode === "signup") {
        if (!firstName.trim() || !lastName.trim()) { setMessage("Name required."); setSaving(false); return; }
        if (password !== confirmPassword) { setMessage("Passwords don't match."); setSaving(false); return; }
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(), password,
          options: { data: { first_name: firstName.trim(), last_name: lastName.trim(), full_name: `${firstName} ${lastName}`.trim() } },
        });
        if (error) throw error;
        if (data.session?.user) {
          await ensureProfileForUser(data.session.user).catch(console.error);
        }
        if (!data.session) {
          setMode("signin"); setMessage("Account created! Check your email then sign in."); setSaving(false); return;
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
        if (data.user) await ensureProfileForUser(data.user).catch(console.error);
      }
      router.push("/");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Authentication failed.");
    } finally { setSaving(false); }
  }

  return (
    <div>
      <Header />
      <div className="container" style={{ paddingTop: 48 }}>
        <div style={{ maxWidth: 420, margin: "0 auto" }}>
          {/* Logo */}
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <div style={{ display: "inline-block", background: "#000", color: "#fff", padding: "8px 18px", borderRadius: 8, fontWeight: 900, fontSize: 22, letterSpacing: "0.05em", marginBottom: 16 }}>
              RENTIFY
            </div>
            <h1 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 6px" }}>
              {mode === "signup" ? "Create an account" : "Welcome back"}
            </h1>
          </div>

          <form className="formCard" onSubmit={handleSubmit}>
            {mode === "signup" && (
              <>
                <div className="field">
                  <label className="label">First Name</label>
                  <input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="First Name" required />
                </div>
                <div className="field">
                  <label className="label">Last Name</label>
                  <input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Last Name" required />
                </div>
              </>
            )}
            <div className="field">
              <label className="label">Email Address</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@example.com" required />
            </div>
            <div className="field">
              <label className="label">Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" required />
            </div>
            {mode === "signup" && (
              <div className="field">
                <label className="label">Re-Enter Password</label>
                <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirm Password" required />
              </div>
            )}

            <button type="submit" className="btn btnPrimary" style={{ width: "100%", marginTop: 4 }} disabled={saving}>
              {saving ? (mode === "signup" ? "Creating..." : "Signing in...") : (mode === "signup" ? "Sign up" : "Login")}
            </button>

            {message && (
              <p className={`messageText ${message.includes("fail") || message.includes("match") || message.includes("required") ? "errorText" : "successText"}`}>
                {message}
              </p>
            )}
          </form>

          <p style={{ textAlign: "center", marginTop: 16, fontSize: 14, color: "var(--text-muted)" }}>
            {mode === "signup" ? "Already have an account? " : "Don't have an account? "}
            <button
              onClick={() => { setMode(mode === "signup" ? "signin" : "signup"); setMessage(""); }}
              style={{ background: "none", border: "none", cursor: "pointer", color: "#000", fontWeight: 600, fontSize: 14, padding: 0 }}
            >
              {mode === "signup" ? "Sign in" : "Sign up"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
