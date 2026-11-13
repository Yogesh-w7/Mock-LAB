"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";
import { createClient } from "@/lib/supabase/client";

// --- Inline SVGs & Micro-Icons ---
function IconGraduationCap({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l9-5-9-5-9 5 9 5z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 14v7" />
    </svg>
  );
}

function IconMail({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  );
}

function IconLock({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 11V7a4 4 0 118 0v4" />
    </svg>
  );
}

function IconEye({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  );
}

function IconEyeOff({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
    </svg>
  );
}

function IconAlertCircle({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <circle cx="12" cy="12" r="9" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01" />
    </svg>
  );
}

function IconSpinner({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  );
}

function IconClose({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function IconArrowRight({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
    </svg>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const supabase = createClient();
    const { error: err } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    setLoading(false);

    if (err) {
      if (err.message.toLowerCase().includes("invalid login credentials")) {
        setError("Invalid email or password. Please verify your credentials.");
      } else {
        setError(err.message);
      }
      return;
    }

    router.push(next);
    router.refresh();
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center bg-slate-950 px-4 py-12 antialiased selection:bg-indigo-500 selection:text-white">
      {/* Background Ambience & Pattern */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-40" />
      <div className="pointer-events-none absolute -top-40 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-indigo-500/10 blur-3xl" />

      <div className="relative z-10 w-full max-w-md">
        {/* Main Card */}
        <div className="rounded-3xl border border-slate-800/90 bg-white/95 p-7 shadow-2xl backdrop-blur-xl sm:p-9">
          {/* Brand Header */}
          <div className="flex items-center justify-between">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-md shadow-indigo-600/30">
              <IconGraduationCap className="h-6 w-6" />
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-600">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Candidate Portal
            </span>
          </div>

          <div className="mt-6">
            <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
              Welcome back
            </h1>
            <p className="mt-1.5 text-xs font-medium text-slate-500">
              Sign in to take timed mocks, build streaks, and monitor accuracy.
            </p>
          </div>

          {/* Feedback Alert Box */}
          {error && (
            <div
              role="alert"
              className="mt-6 flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-900 transition-all"
            >
              <div className="mt-0.5 shrink-0">
                <IconAlertCircle className="h-4 w-4 text-rose-600" />
              </div>
              <div className="flex-1 space-y-0.5">
                <p className="font-bold tracking-tight">Authentication Notice</p>
                <p className="leading-relaxed opacity-90">{error}</p>
              </div>
              <button
                type="button"
                onClick={() => setError("")}
                aria-label="Dismiss error"
                className="shrink-0 rounded p-0.5 text-slate-400 hover:text-slate-700"
              >
                <IconClose className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {/* Sign In Form */}
          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            {/* Email Field */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                Email Address
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                  <IconMail className="h-4 w-4" />
                </div>
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pl-10 pr-4 text-sm text-slate-900 placeholder:text-slate-400 transition hover:bg-white focus:border-indigo-600 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Password
                </label>
              </div>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                  <IconLock className="h-4 w-4" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={6}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pl-10 pr-10 text-sm text-slate-900 placeholder:text-slate-400 transition hover:bg-white focus:border-indigo-600 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <IconEyeOff className="h-4 w-4" /> : <IconEye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Submit Action */}
            <button
              type="submit"
              disabled={loading}
              className="group relative mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-950/20 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <>
                  <IconSpinner className="h-4 w-4 text-white" />
                  <span>Signing in…</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <IconArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
                </>
              )}
            </button>
          </form>

          {/* Registration Redirect */}
          <div className="mt-7 border-t border-slate-100 pt-5 text-center text-xs text-slate-500">
            Don&apos;t have an account yet?{" "}
            <Link
              href="/signup"
              className="font-bold text-indigo-600 transition hover:text-indigo-700 hover:underline"
            >
              Create free account
            </Link>
          </div>

          {/* Quick Return */}
          <div className="mt-3 text-center">
            <Link
              href="/"
              className="text-[11px] font-semibold text-slate-400 transition hover:text-slate-700"
            >
              ← Back to Dashboard
            </Link>
          </div>
        </div>

        {/* Security / Legal Footer */}
        <p className="mt-4 text-center text-[11px] font-medium text-slate-500">
          Protected with encrypted authentication via Supabase Auth services.
        </p>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-slate-950 text-xs font-semibold text-slate-400">
          <div className="flex items-center gap-2">
            <IconSpinner className="h-4 w-4 text-indigo-500" />
            Loading sign in…
          </div>
        </main>
      }
    >
      <LoginForm />
    </Suspense>
  );
}