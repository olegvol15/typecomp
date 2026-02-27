"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type Mode = "magic" | "password";
type Status = "idle" | "loading" | "sent" | "error";

export default function LoginPage() {
  const supabase = createSupabaseBrowserClient();

  const [mode, setMode] = useState<Mode>("magic");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    setMessage(null);

    if (mode === "magic") {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) { setStatus("error"); setMessage(error.message); return; }
      setStatus("sent");
      setMessage("Magic link sent! Check your email.");
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) { setStatus("error"); setMessage(error.message); return; }
      window.location.href = "/";
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur">
        <h1 className="text-2xl font-semibold">Sign in to Typecomp</h1>

        {/* Mode toggle */}
        <div className="mt-4 flex rounded-xl bg-black/30 p-1 text-sm">
          {(["magic", "password"] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => { setMode(m); setMessage(null); setStatus("idle"); }}
              className={`flex-1 rounded-lg py-2 transition-colors ${
                mode === m ? "bg-white/10 text-white" : "text-white/40 hover:text-white/70"
              }`}
            >
              {m === "magic" ? "Magic link" : "Password"}
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

          {mode === "password" && (
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full rounded-xl bg-black/30 px-4 py-3 outline-none ring-1 ring-white/10 focus:ring-2 focus:ring-white/30"
            />
          )}

          <button
            disabled={status === "loading"}
            className="w-full rounded-xl bg-white text-black font-medium px-4 py-3 disabled:opacity-60"
          >
            {status === "loading"
              ? "..."
              : mode === "magic"
              ? "Send magic link"
              : "Sign in"}
          </button>

          {message && (
            <p className={`text-sm ${status === "error" ? "text-red-300" : "text-green-200"}`}>
              {message}
            </p>
          )}
        </form>
      </div>
    </main>
  );
}
