"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import { sanitizeFileName, validateImageFile } from "@/lib/fileHelpers";
import { ensureProfileForUser, fullNameFromProfile } from "@/lib/profileHelpers";

async function uploadProfileImage(userId, file) {
  const path = `${userId}/${Date.now()}-${sanitizeFileName(file.name)}`;

  const { error: uploadError } = await supabase.storage
    .from("profile-images")
    .upload(path, file, { contentType: file.type });

  if (uploadError) {
    throw uploadError;
  }

  const { data } = supabase.storage.from("profile-images").getPublicUrl(path);
  return { profile_photo_url: data.publicUrl, profile_photo_path: path };
}

async function deleteProfileImage(path) {
  if (!path) return;

  const { error } = await supabase.storage.from("profile-images").remove([path]);
  if (error) throw error;
}

export default function ProfilePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [message, setMessage] = useState("");

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [bio, setBio] = useState("");
  const [email, setEmail] = useState("");
  const [photoURL, setPhotoURL] = useState("");
  const [photoPath, setPhotoPath] = useState("");
  const [newPhotoFile, setNewPhotoFile] = useState(null);

  useEffect(() => {
    if (!user) return;

    let cancelled = false;

    ensureProfileForUser(user).then(({ data, error }) => {
      if (cancelled) return;

      if (error) {
        console.error(error);
        setMessage(error.message);
        setLoaded(true);
        return;
      }

      setFirstName(data?.first_name ?? "");
      setLastName(data?.last_name ?? "");
      setBio(data?.bio ?? "");
      setEmail(data?.email ?? user.email ?? "");
      setPhotoURL(data?.profile_photo_url ?? "");
      setPhotoPath(data?.profile_photo_path ?? "");
      setLoaded(true);
    });

    return () => {
      cancelled = true;
    };
  }, [user]);

  async function saveProfile(event) {
    event.preventDefault();
    if (!user) return;

    if (!firstName.trim() || !lastName.trim()) {
      setMessage("First name and last name are required.");
      return;
    }

    const imageValidation = validateImageFile(newPhotoFile);
    if (imageValidation) {
      setMessage(imageValidation);
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      let nextPhotoURL = photoURL;
      let nextPhotoPath = photoPath;
      const previousPhotoPath = photoPath;

      if (newPhotoFile) {
        const uploaded = await uploadProfileImage(user.id, newPhotoFile);
        nextPhotoURL = uploaded.profile_photo_url;
        nextPhotoPath = uploaded.profile_photo_path;
      }

      const { data, error } = await supabase
        .from("profiles")
        .upsert(
          {
            id: user.id,
            email: user.email ?? email ?? "",
            first_name: firstName.trim(),
            last_name: lastName.trim(),
            bio: bio.trim(),
            profile_photo_url: nextPhotoURL,
            profile_photo_path: nextPhotoPath,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "id" }
        )
        .select()
        .single();

      if (error) {
        throw error;
      }

      if (newPhotoFile && previousPhotoPath && previousPhotoPath !== nextPhotoPath) {
        try {
          await deleteProfileImage(previousPhotoPath);
        } catch (cleanupError) {
          console.error(cleanupError);
        }
      }

      const { error: authError } = await supabase.auth.updateUser({
        data: {
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          full_name: `${firstName.trim()} ${lastName.trim()}`.trim(),
        },
      });

      if (authError) {
        console.error(authError);
      }

      setFirstName(data.first_name ?? "");
      setLastName(data.last_name ?? "");
      setBio(data.bio ?? "");
      setEmail(data.email ?? user.email ?? "");
      setPhotoURL(data.profile_photo_url ?? "");
      setPhotoPath(data.profile_photo_path ?? "");
      setNewPhotoFile(null);
      setMessage("Profile updated.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to update profile.");
    } finally {
      setSaving(false);
    }
  }

  async function removePhoto() {
    if (!user || (!photoPath && !photoURL)) return;

    const ok = window.confirm("Remove your profile photo?");
    if (!ok) return;

    setSaving(true);
    setMessage("");

    try {
      if (photoPath) {
        try {
          await deleteProfileImage(photoPath);
        } catch (cleanupError) {
          console.error(cleanupError);
        }
      }

      const { data, error } = await supabase
        .from("profiles")
        .upsert(
          {
            id: user.id,
            email: user.email ?? email ?? "",
            first_name: firstName.trim(),
            last_name: lastName.trim(),
            bio: bio.trim(),
            profile_photo_url: "",
            profile_photo_path: "",
            updated_at: new Date().toISOString(),
          },
          { onConflict: "id" }
        )
        .select()
        .single();

      if (error) {
        throw error;
      }

      setPhotoURL(data.profile_photo_url ?? "");
      setPhotoPath(data.profile_photo_path ?? "");
      setNewPhotoFile(null);
      setMessage("Profile photo removed.");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Failed to remove profile photo."
      );
    } finally {
      setSaving(false);
    }
  }

  async function logout() {
    setLoggingOut(true);
    setMessage("");

    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        throw error;
      }

      router.push("/login");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to log out.");
      setLoggingOut(false);
    }
  }

  const displayName =
    `${firstName} ${lastName}`.trim() ||
    fullNameFromProfile({
      first_name: firstName,
      last_name: lastName,
    }) ||
    "Your profile";

  return (
    <div className="container">
      <Header />

      <section className="pageHead">
        <div>
          <h1 className="pageTitle">Profile</h1>
          <p className="pageSubtitle">
            Update your public identity for listings and messaging.
          </p>
        </div>
      </section>

      {loading || (user && !loaded) ? (
        <div className="centerNotice">Loading profile...</div>
      ) : !user ? (
        <div className="centerNotice">
          Please <Link href="/login">log in</Link> to edit your profile.
        </div>
      ) : (
        <div className="profileShell">
          <aside className="profileCard">
            {photoURL ? (
              <img className="profilePhoto" src={photoURL} alt="Profile" />
            ) : (
              <div className="profilePhoto profilePhotoPlaceholder">
                {displayName.slice(0, 1).toUpperCase() || "U"}
              </div>
            )}
            <p className="profileName">{displayName}</p>
            <p className="profileEmail">{user.email || email}</p>
          </aside>

          <form className="formCard" onSubmit={saveProfile}>
            <div className="field">
              <label className="label">First name</label>
              <input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
              />
            </div>

            <div className="field">
              <label className="label">Last name</label>
              <input
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
              />
            </div>

            <div className="field">
              <label className="label">Email</label>
              <input
                value={user.email || email}
                disabled
                className="readonlyField"
              />
            </div>

            <div className="field">
              <label className="label">Bio</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Tell people a little about yourself."
              />
            </div>

            <div className="field">
              <label className="label">Profile photo (optional, max 5MB)</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setNewPhotoFile(e.target.files?.[0] ?? null)}
              />
            </div>

            <div className="actions">
              <button type="submit" className="btn btnPrimary" disabled={saving}>
                {saving ? "Saving..." : "Save profile"}
              </button>

              {(photoPath || photoURL) ? (
                <button
                  type="button"
                  className="btn btnGhost"
                  onClick={removePhoto}
                  disabled={saving || loggingOut}
                >
                  Remove photo
                </button>
              ) : null}

              <button
                type="button"
                className="btn btnGhost"
                onClick={logout}
                disabled={saving || loggingOut}
              >
                {loggingOut ? "Logging out..." : "Logout"}
              </button>
            </div>
          </form>
        </div>
      )}

      {message ? (
        <p className={`messageText ${message.toLowerCase().includes("failed") ? "errorText" : ""}`}>
          {message}
        </p>
      ) : null}
    </div>
  );
}
