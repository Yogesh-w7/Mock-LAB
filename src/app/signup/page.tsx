"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

// --- Inline SVGs & Micro-Icons ---
function IconUserPlus({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
    </svg>
  );
}

function IconUser({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
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

function IconCheckCircle({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <circle cx="12" cy="12" r="9" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4" />
    </svg>
  );
}

function IconMailCheck({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 19v-8.93a2 2 0 01.89-1.664l7-4.666a2 2 0 012.22 0l7 4.666A2 2 0 0121 10.07V19M3 19a2 2 0 002 2h14a2 2 0 002-2M3 19l6.75-4.5M21 19l-6.75-4.5m0 0l-2.25 1.5-2.25-1.5" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4" />
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

type FeedbackState = {
  type: "error" | "info";
  title?: string;
  message: string;
} | null;

export default function SignupPage() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [emailSent, setEmailSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFeedback(null);
    setLoading(true);

    try {
      const supabase = createClient();
      const trimmedEmail = email.trim();

      const { data, error: err } = await supabase.auth.signUp({
        email: trimmedEmail,
        password,
        options: {
          data: { display_name: displayName.trim() || undefined },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (err) {
        const lower = err.message.toLowerCase();
        if (
          lower.includes("already registered") ||
          lower.includes("user already exists")
        ) {
          setFeedback({
            type: "error",
            title: "Account Already Exists",
            message: "An account with this email address already exists. Please sign in instead.",
          });
        } else if (lower.includes("password should be at least")) {
          setFeedback({
            type: "error",
            title: "Weak Password",
            message: "Password must be at least 6 characters long.",
          });
        } else {
          setFeedback({
            type: "error",
            title: "Registration Failed",
            message: err.message,
          });
        }
        return;
      }

      // Check whether email confirmation is required by Supabase
      if (data.user && !data.session) {
        // Confirmation email was sent; user session is not active yet
        setEmailSent(true);
        return;
      }

      // If email confirm is OFF in Supabase, user is signed in immediately
      router.push("/");
      router.refresh();
    } catch (err) {
      setFeedback({
        type: "error",
        title: "Unexpected Error",
        message: err instanceof Error ? err.message : "An unexpected failure occurred.",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center bg-slate-950 px-4 py-12 antialiased selection:bg-indigo-500 selection:text-white">
      {/* Background Ambience & Pattern */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-40" />
      <div className="pointer-events-none absolute -top-40 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-indigo-500/10 blur-3xl" />

      <div className="relative z-10 w-full max-w-md">
        {/* Main Card */}
        <div className="rounded-3xl border border-slate-800/90 bg-white/95 p-7 shadow-2xl backdrop-blur-xl sm:p-9">
          {emailSent ? (
            /* Confirmation Email Sent State */
            <div className="space-y-6 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 shadow-md shadow-emerald-500/10">
                <IconMailCheck className="h-7 w-7" />
              </div>

              <div>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-emerald-700">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Verification Dispatched
                </span>
                <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
                  Check your inbox
                </h1>
                <p className="mt-2 text-xs leading-relaxed text-slate-500">
                  We sent a confirmation link to{" "}
                  <strong className="font-semibold text-slate-800">{email}</strong>.
                  Click the link to verify your account and begin taking tests.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 text-left text-xs text-slate-600">
                <p className="font-bold text-slate-800">Didn&apos;t receive it?</p>
                <p className="mt-1 leading-relaxed text-slate-500">
                  Check your spam or promotions folder. It can take up to 2 minutes to arrive.
                </p>
              </div>

              <div className="space-y-2 pt-2">
                <Link
                  href="/login"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 py-3 text-sm font-semibold text-white shadow-md shadow-slate-950/20 transition hover:bg-slate-800"
                >
                  <span>Proceed to Sign in</span>
                  <IconArrowRight className="h-3.5 w-3.5" />
                </Link>

                <button
                  type="button"
                  onClick={() => setEmailSent(false)}
                  className="w-full text-xs font-semibold text-slate-500 transition hover:text-slate-800"
                >
                  Use a different email address
                </button>
              </div>
            </div>
          ) : (
            /* Signup Form State */
            <>
              {/* Brand Header */}
              <div className="flex items-center justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-md shadow-indigo-600/30">
                  <IconUserPlus className="h-6 w-6" />
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Free Access
                </span>
              </div>

              <div className="mt-6">
                <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
                  Create your account
                </h1>
                <p className="mt-1.5 text-xs font-medium text-slate-500">
                  Take full mocks, view answer breakdowns, and track sectional accuracy.
                </p>
              </div>

              {/* Feedback Alert Box */}
              {feedback && (
                <div
                  role="alert"
                  className={`mt-6 flex items-start gap-3 rounded-2xl border p-4 text-xs transition-all ${
                    feedback.type === "error"
                      ? "border-rose-200 bg-rose-50 text-rose-900"
                      : "border-indigo-200 bg-indigo-50 text-indigo-900"
                  }`}
                >
                  <div className="mt-0.5 shrink-0">
                    <IconAlertCircle className="h-4 w-4 text-rose-600" />
                  </div>
                  <div className="flex-1 space-y-0.5">
                    {feedback.title && (
                      <p className="font-bold tracking-tight">{feedback.title}</p>
                    )}
                    <p className="leading-relaxed opacity-90">{feedback.message}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFeedback(null)}
                    aria-label="Dismiss message"
                    className="shrink-0 rounded p-0.5 text-slate-400 hover:text-slate-700"
                  >
                    <IconClose className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}

              {/* Form */}
              <form onSubmit={onSubmit} className="mt-6 space-y-4">
                {/* Display Name Field */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                    Display Name
                  </label>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                      <IconUser className="h-4 w-4" />
                    </div>
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="e.g. Priya Sharma"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pl-10 pr-4 text-sm text-slate-900 placeholder:text-slate-400 transition hover:bg-white focus:border-indigo-600 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
                    />
                  </div>
                </div>

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
                    <span className="text-[11px] text-slate-400">Min. 6 characters</span>
                  </div>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                      <IconLock className="h-4 w-4" />
                    </div>
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      minLength={6}
                      autoComplete="new-password"
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
                      <span>Creating account…</span>
                    </>
                  ) : (
                    <>
                      <span>Create Account</span>
                      <IconArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
                    </>
                  )}
                </button>
              </form>

              {/* Login Redirect */}
              <div className="mt-7 border-t border-slate-100 pt-5 text-center text-xs text-slate-500">
                Already have an account?{" "}
                <Link
                  href="/login"
                  className="font-bold text-indigo-600 transition hover:text-indigo-700 hover:underline"
                >
                  Sign in
                </Link>
              </div>

              {/* Back to Home */}
              <div className="mt-3 text-center">
                <Link
                  href="/"
                  className="text-[11px] font-semibold text-slate-400 transition hover:text-slate-700"
                >
                  ← Back to Dashboard
                </Link>
              </div>
            </>
          )}
        </div>

        {/* Security / Terms Notice */}
        <p className="mt-4 text-center text-[11px] font-medium text-slate-500">
          Protected with encrypted authentication via Supabase Auth services.
        </p>
      </div>
    </main>
  );
}