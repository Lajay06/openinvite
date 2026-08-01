import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogIn, Mail, Loader2 } from "lucide-react";
import { PasswordInput } from "@/components/ui/password-input";
import AuthLayout from "@/components/AuthLayout";
import GoogleIcon from "@/components/GoogleIcon";
import MicrosoftIcon from "@/components/MicrosoftIcon";
import FacebookIcon from "@/components/FacebookIcon";
import AppleIcon from "@/components/AppleIcon";
import { useMarketingSeo } from "@/hooks/useMarketingSeo";

export default function Login() {
  useMarketingSeo();
  const { isAuthenticated, isLoadingAuth } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Supports a ?next= redirect target (e.g. back to a collaborator accept
  // page after signing in) — falls back to the normal /DailyUpdate landing
  // when absent. Every successful login (password or any OAuth provider)
  // lands on /choose-plan first, not directly here — that page is the
  // single, account-state-gated check for whether this visitor still needs
  // to pick a plan (see ChoosePlan.jsx's isPastPlanStep()). An existing,
  // already-onboarded user signing back in — including via Google, which
  // this page and Register.jsx both route through the exact same
  // loginWithProvider call — passes straight through with no extra screen.
  const next = new URLSearchParams(window.location.search).get('next') || '/DailyUpdate';
  const choosePlanUrl = `/choose-plan?next=${encodeURIComponent(next)}`;

  // A visitor who already has a valid session and lands on /login directly
  // (e.g. an old bookmark, or a marketing CTA reached before this session
  // check existed) shouldn't see the sign-in form again — route them
  // through the same account-state gate everything else uses.
  useEffect(() => {
    if (!isLoadingAuth && isAuthenticated) {
      window.location.href = choosePlanUrl;
    }
  }, [isLoadingAuth, isAuthenticated]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await base44.auth.loginViaEmailPassword(email, password);
      // Full reload (not React Router navigate) — AuthContext only
      // re-checks the session on mount, so /choose-plan needs a fresh
      // mount to see the session we just created.
      window.location.href = choosePlanUrl;
    } catch (err) {
      setError(err.message || "Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  const handleProvider = (provider) => {
    base44.auth.loginWithProvider(provider, choosePlanUrl);
  };

  // Avoid flashing the sign-in form while the auth check above resolves,
  // or during the moment before the redirect actually navigates away.
  if (isLoadingAuth || isAuthenticated) {
    return null;
  }

  return (
    <AuthLayout
      icon={LogIn}
      title="Welcome back"
      subtitle="Log in to your account"
      footer={
        <>
          Don't have an account?{" "}
          <Link to="/register" className="text-primary font-medium hover:underline">
            Create one
          </Link>
        </>
      }
    >
      <div className="space-y-2 mb-3">
        <Button
          variant="outline"
          className="w-full h-10 text-sm font-medium"
          onClick={() => handleProvider("google")}
        >
          <GoogleIcon className="w-4 h-4 mr-2" />
          Continue with Google
        </Button>
        <Button
          variant="outline"
          className="w-full h-10 text-sm font-medium"
          onClick={() => handleProvider("microsoft")}
        >
          <MicrosoftIcon className="w-4 h-4 mr-2" />
          Continue with Microsoft
        </Button>
        <Button
          variant="outline"
          className="w-full h-10 text-sm font-medium"
          onClick={() => handleProvider("facebook")}
        >
          <FacebookIcon className="w-4 h-4 mr-2" />
          Continue with Facebook
        </Button>
        <Button
          variant="outline"
          className="w-full h-10 text-sm font-medium"
          onClick={() => handleProvider("apple")}
        >
          <AppleIcon className="w-4 h-4 mr-2" />
          Continue with Apple
        </Button>
      </div>

      <div className="relative mb-3">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-card px-3 text-muted-foreground">or</span>
        </div>
      </div>

      {error && (
        <div className="mb-3 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="space-y-1">
          <Label htmlFor="email">Email</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input
              id="email"
              type="email"
              autoComplete="email"
              autoFocus
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-10 h-10"
              required
            />
          </div>
        </div>
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link to="/forgot-password" className="text-xs text-primary hover:underline">
              Forgot password?
            </Link>
          </div>
          <PasswordInput
            id="password"
            autoComplete="current-password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-10"
            required
          />
        </div>
        <Button type="submit" className="w-full h-10 font-medium" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Logging in...
            </>
          ) : (
            "Log in"
          )}
        </Button>
      </form>
    </AuthLayout>
  );
}