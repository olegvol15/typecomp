"use client";

import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export function LogoutButton() {
  const supabase = createSupabaseBrowserClient();

  return (
    <button
      onClick={async () => {
        await supabase.auth.signOut();
        window.location.href = "/login";
      }}
      className="rounded-xl border border-white/20 px-3 py-2 text-sm hover:bg-white/10"
    >
      Logout
    </button>
  );
}
