"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { supabaseConfigured } from "@/lib/supabase/configured";

function ChatLogo() {
  return (
    <div className="grid h-16 w-16 place-items-center rounded-3xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-2xl shadow-indigo-500/30">
      <svg className="h-7 w-7 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    </div>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const switchMode = (next: "signin" | "signup") => {
    setMode(next);
    setError(null);
    setNotice(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setBusy(true);

    const supabase = createClient();
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { username },
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });
        if (error) throw error;
        if (data.session) {
          // Email confirmation is disabled — straight into the app
          router.push("/");
          router.refresh();
        } else {
          setNotice("Check your email to confirm your account, then sign in.");
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push("/");
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="chat-bg flex min-h-dvh w-full items-center justify-center bg-[#0b0f14] px-4 py-10 font-sans text-zinc-100">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <ChatLogo />
          <h1 className="mt-5 text-2xl font-semibold tracking-tight">Chat App</h1>
          <p className="mt-1.5 text-sm text-zinc-500">
            {mode === "signin" ? "Welcome back — sign in to keep chatting." : "Create an account to start messaging."}
          </p>
        </div>

        {!supabaseConfigured() && (
          <div className="rounded-2xl bg-amber-500/10 p-4 text-sm leading-relaxed text-amber-300 ring-1 ring-amber-500/20">
            <p className="font-medium">Supabase keys missing</p>
            <p className="mt-1 text-amber-200/80">
              Open <code className="rounded bg-black/30 px-1 py-0.5 font-mono text-xs">.env.local</code> and paste your
              project URL and anon key, then restart the dev server.
            </p>
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 shadow-2xl shadow-black/40 backdrop-blur"
        >
          <div className="space-y-4">
            {mode === "signup" && (
              <div>
                <label htmlFor="username" className="mb-1.5 block text-xs font-medium text-zinc-400">
                  Username
                </label>
                <input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. alex_doe"
                  autoComplete="username"
                  required
                  className="h-11 w-full rounded-xl bg-white/[0.06] px-4 text-sm text-zinc-100 placeholder-zinc-500 outline-none ring-indigo-500/40 transition focus:bg-white/[0.09] focus:ring-2"
                />
              </div>
            )}

            <div>
              <label htmlFor="email" className="mb-1.5 block text-xs font-medium text-zinc-400">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                required
                className="h-11 w-full rounded-xl bg-white/[0.06] px-4 text-sm text-zinc-100 placeholder-zinc-500 outline-none ring-indigo-500/40 transition focus:bg-white/[0.09] focus:ring-2"
              />
            </div>

            <div>
              <label htmlFor="password" className="mb-1.5 block text-xs font-medium text-zinc-400">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                required
                minLength={6}
                className="h-11 w-full rounded-xl bg-white/[0.06] px-4 text-sm text-zinc-100 placeholder-zinc-500 outline-none ring-indigo-500/40 transition focus:bg-white/[0.09] focus:ring-2"
              />
            </div>
          </div>

          {error && (
            <p className="mt-4 rounded-xl bg-red-500/10 px-3 py-2.5 text-xs leading-relaxed text-red-300 ring-1 ring-red-500/20">
              {error}
            </p>
          )}
          {notice && (
            <p className="mt-4 rounded-xl bg-emerald-500/10 px-3 py-2.5 text-xs leading-relaxed text-emerald-300 ring-1 ring-emerald-500/20">
              {notice}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="mt-5 flex h-12 w-full items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 transition hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? (mode === "signin" ? "Signing in…" : "Creating account…") : mode === "signin" ? "Sign in" : "Create account"}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-zinc-500">
          {mode === "signin" ? (
            <>
              New here?{" "}
              <button type="button" onClick={() => switchMode("signup")} className="font-medium text-indigo-400 transition hover:text-indigo-300">
                Create an account
              </button>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <button type="button" onClick={() => switchMode("signin")} className="font-medium text-indigo-400 transition hover:text-indigo-300">
                Sign in
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
