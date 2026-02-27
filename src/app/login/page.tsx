"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type Tab = "signin" | "signup";
type Status = "idle" | "loading" | "error";

export default function LoginPage() {
  const supabase = createSupabaseBrowserClient();

  const [tab, setTab] = useState<Tab>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState<string | null>(null);

  const switchTab = (t: Tab) => {
    setTab(t);
    setMessage(null);
    setStatus("idle");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    setMessage(null);

    if (tab === "signin") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) { setStatus("error"); setMessage(error.message); return; }
      window.location.href = "/";
    } else {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setStatus("error");
        setMessage(body.error ?? "Sign up failed.");
        return;
      }
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) { setStatus("error"); setMessage(error.message); return; }
      window.location.href = "/onboarding";
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur">
        <h1 className="text-2xl font-semibold">Typecomp</h1>

        {/* Tab toggle */}
        <div className="mt-4 flex rounded-xl bg-black/30 p-1 text-sm">
          {(["signin", "signup"] as Tab[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => switchTab(t)}
              className={`flex-1 rounded-lg py-2 transition-colors ${
                tab === t ? "bg-white/10 text-white" : "text-white/40 hover:text-white/70"
              }`}
            >
              {t === "signin" ? "Sign in" : "Sign up"}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full rounded-xl bg-black/30 px-4 py-3 outline-none ring-1 ring-white/10 focus:ring-2 focus:ring-white/30"
          />

          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="w-full rounded-xl bg-black/30 px-4 py-3 outline-none ring-1 ring-white/10 focus:ring-2 focus:ring-white/30"
          />

          <button
            disabled={status === "loading"}
            className="w-full rounded-xl bg-white text-black font-medium px-4 py-3 disabled:opacity-60"
          >
            {status === "loading" ? "..." : tab === "signin" ? "Sign in" : "Create account"}
          </button>

          {message && (
            <p className="text-sm text-red-300">{message}</p>
          )}
        </form>
      </div>
    </main>
  );
}
