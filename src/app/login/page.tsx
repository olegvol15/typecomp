"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export default function LoginPage() {
  const supabase = createSupabaseBrowserClient();

  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "sent" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  const sendLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    setMessage(null);

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setStatus("error");
      setMessage(error.message);
      return;
    }

    setStatus("sent");
    setMessage("Magic link sent! Check your email.");
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur">
        <h1 className="text-2xl font-semibold">Sign in to Typecomp</h1>
        <p className="mt-1 text-sm text-white/70">
          We’ll email you a magic link.
        </p>

        <form onSubmit={sendLink} className="mt-6 space-y-3">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full rounded-xl bg-black/30 px-4 py-3 outline-none ring-1 ring-white/10 focus:ring-2 focus:ring-white/30"
          />

          <button
            disabled={status === "loading"}
            className="w-full rounded-xl bg-white text-black font-medium px-4 py-3 disabled:opacity-60"
          >
            {status === "loading" ? "Sending..." : "Send magic link"}
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