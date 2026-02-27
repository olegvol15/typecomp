"use client";

import { useState } from "react";

const USERNAME_RE = /^[a-z0-9_]+$/;

function validateUsername(value: string): string | null {
  if (value.length < 3) return "At least 3 characters required.";
  if (value.length > 20) return "Maximum 20 characters.";
  if (!USERNAME_RE.test(value)) return "Lowercase letters, numbers, and underscores only.";
  if (value.startsWith("_") || value.endsWith("_")) return "Cannot start or end with an underscore.";
  return null;
}

export function OnboardingForm() {
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const validationError = username.length > 0 ? validateUsername(username) : null;
  const canSubmit = !loading && username.length > 0 && validationError === null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validateUsername(username);
    if (err) return;

    setLoading(true);
    setServerError(null);

    try {
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      });

      if (res.ok) {
        window.location.href = "/";
        return;
      }

      const body = await res.json().catch(() => ({}));
      setServerError(body.error ?? "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-5 space-y-3">
      <div>
        <input
          type="text"
          value={username}
          onChange={(e) => { setUsername(e.target.value.toLowerCase()); setServerError(null); }}
          placeholder="your_username"
          maxLength={20}
          autoFocus
          className="w-full rounded-xl bg-black/30 px-4 py-3 outline-none ring-1 ring-white/10 focus:ring-2 focus:ring-white/30"
        />
        {validationError && (
          <p className="mt-1.5 text-xs text-red-300">{validationError}</p>
        )}
        {serverError && !validationError && (
          <p className="mt-1.5 text-xs text-red-300">{serverError}</p>
        )}
      </div>

      <button
        disabled={!canSubmit}
        className="w-full rounded-xl bg-white text-black font-medium px-4 py-3 disabled:opacity-40"
      >
        {loading ? "..." : "Continue"}
      </button>
    </form>
  );
}
