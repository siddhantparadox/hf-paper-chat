import React, { useCallback, useState } from "react";
import { Authenticated, AuthLoading, Unauthenticated } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { NeoButton } from "./NeoButton";

export function AuthGate({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AuthLoading>
        <div className="min-h-screen flex items-center justify-center font-sans text-black bg-gray-100 p-6">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-black border-t-transparent mx-auto mb-4"></div>
            <p className="font-bold">Checking session...</p>
          </div>
        </div>
      </AuthLoading>

      <Unauthenticated>
        <SignInScreen />
      </Unauthenticated>

      <Authenticated>{children}</Authenticated>
    </>
  );
}

function SignInScreen() {
  const { signIn } = useAuthActions();
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [linkSentTo, setLinkSentTo] = useState<string | null>(null);

  const handleMagicLinkSignIn = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setIsSigningIn(true);
      setError(null);
      try {
        const formData = new FormData(event.currentTarget);
        const { redirect } = await signIn("resend", formData);
        if (redirect) {
          window.location.assign(redirect.toString());
          return;
        }
        setLinkSentTo(email.trim());
      } catch (err: any) {
        setError(err?.message ?? "Failed to send sign-in link.");
      } finally {
        setIsSigningIn(false);
      }
    },
    [email, signIn],
  );

  const handleContinueAsGuest = useCallback(async () => {
    setIsSigningIn(true);
    setError(null);
    try {
      const { redirect } = await signIn("anonymous");
      if (redirect) {
        window.location.assign(redirect.toString());
      }
    } catch (err: any) {
      setError(err?.message ?? "Failed to sign in.");
    } finally {
      setIsSigningIn(false);
    }
  }, [signIn]);

  return (
    <div className="min-h-screen flex items-center justify-center font-sans text-black bg-gray-100 p-6">
      <div className="w-full max-w-md border-2 border-black bg-white shadow-neo p-6">
        <div className="text-center mb-6">
          <div className="text-5xl mb-2 select-none">🤗</div>
          <h1 className="text-3xl font-black tracking-tighter">HuggingPapers</h1>
          <p className="text-sm font-medium text-gray-600 mt-2">
            Sign in to start chatting with papers.
          </p>
        </div>

        {error && (
          <div className="mb-4 text-sm font-bold text-red-600 bg-red-50 p-3 border border-red-200 break-words">
            {error}
          </div>
        )}

        {linkSentTo && (
          <div className="mb-4 text-sm font-bold text-green-700 bg-green-50 p-3 border border-green-200 break-words">
            Sent a sign-in link to <span className="font-black">{linkSentTo}</span>
            . Check your email to finish signing in.
          </div>
        )}

        <div className="space-y-3">
          <form onSubmit={handleMagicLinkSignIn} className="space-y-3">
            <label className="block text-xs font-bold uppercase">Email</label>
            <input
              name="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                setLinkSentTo(null);
              }}
              className="w-full p-3 border-2 border-black shadow-neo-sm focus:outline-none focus:ring-2 focus:ring-hf-yellow font-mono text-sm"
              autoComplete="email"
              required
            />
            <NeoButton
              type="submit"
              variant="primary"
              className="w-full"
              disabled={isSigningIn || !email.trim()}
            >
              {isSigningIn ? "Sending..." : "Send sign-in link"}
            </NeoButton>
          </form>

          <NeoButton
            variant="secondary"
            className="w-full"
            onClick={handleContinueAsGuest}
            disabled={isSigningIn}
          >
            Continue as guest
          </NeoButton>
        </div>
      </div>
    </div>
  );
}
