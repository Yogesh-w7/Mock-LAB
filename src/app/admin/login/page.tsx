"use client";

import { Suspense, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

// --- Inline SVGs & Micro-Icons ---
function IconShield({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
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

function IconInfo({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <circle cx="12" cy="12" r="9" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 16v-4m0-4h.01" />
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

type FeedbackState = {
  type: "error" | "success" | "info";
  title?: string;
  message: string;
} | null;

function AdminLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setFeedback(null);

    try {
      const supabase = createClient();

      const { data, error: loginError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (loginError) {
        // User-friendly mapping for common auth errors
        if (loginError.message.toLowerCase().includes("invalid login credentials")) {
          setFeedback({
            type: "error",
            title: "Invalid Credentials",
            message: "The email address or password you entered is incorrect.",
          });
        } else if (loginError.message.toLowerCase().includes("email not confirmed")) {
          setFeedback({
            type: "info",
            title: "Email Verification Required",
            message: "Your admin account email has not been verified yet. Check your inbox.",
          });
        } else {
          setFeedback({
            type: "error",
            title: "Authentication Failed",
            message: loginError.message,
          });
        }
        return;
      }

      if (!data.user) {
        setFeedback({
          type: "error",
          title: "Session Missing",
          message: "Sign-in did not return a user profile. Please try again.",
        });
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", data.user.id)
        .maybeSingle();

      if (profileError) {
        await supabase.auth.signOut();
        setFeedback({
          type: "error",
          title: "Role Verification Failed",
          message: `Could not verify credentials permissions: ${profileError.message}`,
        });
        return;
      }

      if (profile?.role !== "admin") {
        await supabase.auth.signOut();
        setFeedback({
          type: "error",
          title: "Access Restricted",
          message: "You are signed in, but this account lacks administrator permissions.",
        });
        return;
      }

      const requestedPath = searchParams.get("next") || "/admin/papers";
      const safePath =
        requestedPath.startsWith("/") &&
        !requestedPath.startsWith("//") &&
        !requestedPath.includes("\\")
          ? requestedPath
          : "/admin/papers";

      router.replace(safePath.startsWith("/admin") ? safePath : "/admin/papers");
      router.refresh();
    } catch (err) {
      setFeedback({
        type: "error",
        title: "Unexpected Error",
        message: err instanceof Error ? err.message : "An unexpected failure occurred while signing in.",
      });
    } finally {
      setLoading(false);
    }
  }

  async function handlePasswordReset() {
    if (!email.trim()) {
      setFeedback({
        type: "info",
        title: "Email Required",
        message: "Please enter your administrator email address above to receive a recovery link.",
      });
      return;
    }

    setResetLoading(true);
    setFeedback(null);

    try {
      const supabase = createClient();
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/admin/reset-password`,
      });

      if (resetError) {
        setFeedback({
          type: "error",
          title: "Password Reset Failed",
          message: resetError.message,
        });
      } else {
        setFeedback({
          type: "success",
          title: "Recovery Email Dispatched",
          message: `If an administrator account exists for ${email.trim()}, password reset instructions have been sent.`,
        });
      }
    } catch (err) {
      setFeedback({
        type: "error",
        title: "Error Sending Reset",
        message: err instanceof Error ? err.message : "Could not complete recovery request.",
      });
    } finally {
      setResetLoading(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center bg-slate-950 px-4 py-12 antialiased selection:bg-indigo-500 selection:text-white">
      {/* Background Ambience & Grid Pattern */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-40" />
      <div className="pointer-events-none absolute -top-40 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-indigo-500/10 blur-3xl" />

      <div className="relative z-10 w-full max-w-md">
        {/* Main Card */}
        <div className="rounded-3xl border border-slate-800/90 bg-white/95 p-7 shadow-2xl backdrop-blur-xl sm:p-9">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-md shadow-indigo-600/30">
              <IconShield className="h-6 w-6" />
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-600">
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-600" />
              Restricted Area
            </span>
          </div>

          <div className="mt-6">
            <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
              Portal Console
            </h1>
            <p className="mt-1.5 text-xs font-medium text-slate-500">
              Secure administrative access for BankPrep exam management.
            </p>
          </div>

          {/* Unified Feedback Message Box */}
          {feedback && (
            <div
              role="alert"
              className={`mt-6 flex items-start gap-3 rounded-2xl border p-4 text-xs transition-all ${
                feedback.type === "error"
                  ? "border-rose-200 bg-rose-50 text-rose-900"
                  : feedback.type === "success"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                    : "border-indigo-200 bg-indigo-50 text-indigo-900"
              }`}
            >
              <div className="mt-0.5 shrink-0">
                {feedback.type === "error" && <IconAlertCircle className="h-4 w-4 text-rose-600" />}
                {feedback.type === "success" && <IconCheckCircle className="h-4 w-4 text-emerald-600" />}
                {feedback.type === "info" && <IconInfo className="h-4 w-4 text-indigo-600" />}
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
                aria-label="Dismiss alert"
                className="shrink-0 rounded p-0.5 text-slate-400 hover:text-slate-700"
              >
                <IconClose className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {/* Email Field */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                Admin Email
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                  <IconMail className="h-4 w-4" />
                </div>
                <input
                  type="email"
                  required
                  autoComplete="username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pl-10 pr-4 text-sm text-slate-900 placeholder:text-slate-400 transition hover:bg-white focus:border-indigo-600 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
                  placeholder="admin@bankprep.internal"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Secret Key / Password
                </label>
                <button
                  type="button"
                  onClick={handlePasswordReset}
                  disabled={resetLoading}
                  className="text-xs font-semibold text-indigo-600 transition hover:text-indigo-700 hover:underline disabled:opacity-50"
                >
                  {resetLoading ? "Sending..." : "Reset Password?"}
                </button>
              </div>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                  <IconLock className="h-4 w-4" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pl-10 pr-10 text-sm text-slate-900 placeholder:text-slate-400 transition hover:bg-white focus:border-indigo-600 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
                  placeholder="••••••••••••"
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

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="group relative mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-950/20 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <>
                  <IconSpinner className="h-4 w-4 text-white" />
                  <span>Verifying clearance...</span>
                </>
              ) : (
                <span>Authenticate Session</span>
              )}
            </button>
          </form>

          {/* Footer Navigation */}
          <div className="mt-7 border-t border-slate-100 pt-5 text-center">
            <Link
              href="/"
              className="text-xs font-semibold text-slate-500 transition hover:text-slate-900"
            >
              ← Back to Main Platform
            </Link>
          </div>
        </div>

        {/* Security Notice */}
        <p className="mt-4 text-center text-[11px] font-medium text-slate-500">
          All administrative sessions are logged and monitored via Supabase Row-Level Security policies.
        </p>
      </div>
    </main>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-slate-950 text-xs font-semibold text-slate-400">
          <div className="flex items-center gap-2">
            <IconSpinner className="h-4 w-4 text-indigo-500" />
            Loading authentication portal...
          </div>
        </main>
      }
    >
      <AdminLoginForm />
    </Suspense>
  );
}