"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!loading && user) {
      router.push("/");
    }
  }, [loading, user, router]);

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage("");
    setSaving(true);

    try {
      if (mode === "signup") {
        if (!firstName.trim() || !lastName.trim()) {
          setMessage("First name and last name are required.");
          setSaving(false);
          return;
        }

        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              first_name: firstName.trim(),
              last_name: lastName.trim(),
              full_name: `${firstName.trim()} ${lastName.trim()}`.trim(),
            },
          },
        });

        if (error) {
          throw error;
        }

        if (data.session?.user) {
          const { error: profileError } = await ensureProfileForUser(data.session.user);
          if (profileError) {
            console.error(profileError);
          }
        }

        if (!data.session) {
          setMode("signin");
          setMessage("Account created. Check your email to confirm, then sign in.");
          setPassword("");
          setSaving(false);
          return;
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (error) {
          throw error;
        }

        if (data.user) {
          const { error: profileError } = await ensureProfileForUser(data.user);
          if (profileError) {
            console.error(profileError);
          }
        }
      }

      router.push("/");
    } catch (error) {
      const messageText =
        error instanceof Error ? error.message : "Authentication failed.";
      setMessage(messageText);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="container">
      <Header />

      <section className="pageHead">
        <div>
          <h1 className="pageTitle">
            {mode === "signup" ? "Create account" : "Welcome back"}
          </h1>
          <p className="pageSubtitle">
            {mode === "signup"
              ? "Sign up to post and manage items."
              : "Sign in to create, edit, and remove your items."}
          </p>
        </div>
      </section>

      {loading ? (
        <div className="centerNotice">Loading...</div>
      ) : user ? (
        <div className="centerNotice">Logged in. Redirecting...</div>
      ) : (
        <form className="formCard" onSubmit={handleSubmit}>
          {mode === "signup" ? (
            <>
              <div className="field">
                <label className="label">First name</label>
                <input
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="First name"
                  required
                />
              </div>

              <div className="field">
                <label className="label">Last name</label>
                <input
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Last name"
                  required
                />
              </div>
            </>
          ) : null}

          <div className="field">
            <label className="label">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@school.edu"
              required
            />
          </div>

          <div className="field">
            <label className="label">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              required
            />
          </div>

          <div className="actions">
            <button type="submit" className="btn btnPrimary" disabled={saving}>
              {saving
                ? mode === "signup"
                  ? "Creating..."
                  : "Signing in..."
                : mode === "signup"
                  ? "Create account"
                  : "Sign in"}
            </button>
            <button
              type="button"
              className="btn btnGhost"
              onClick={() => {
                setMode(mode === "signup" ? "signin" : "signup");
                setMessage("");
              }}
              disabled={saving}
            >
              Switch to {mode === "signup" ? "Sign in" : "Sign up"}
            </button>
          </div>
        </form>
      )}

      {message ? (
        <p className={`messageText ${message.toLowerCase().includes("failed") || message.toLowerCase().includes("error") ? "errorText" : ""}`}>
          {message}
        </p>
      ) : null}
    </div>
  );
}
