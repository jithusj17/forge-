"use client";

import { LoaderCircle, UserRound } from "lucide-react";
import { createContext, use, useCallback, useRef, useState, type ReactNode } from "react";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { authClient, useSession } from "@/lib/auth-client";
import { BRAND } from "@/lib/brand";

interface AuthContextValue {
  /** Resolves true once the visitor has a session (opening the sign-in dialog if needed). */
  requireAuth: (reason?: string) => Promise<boolean>;
  openSignIn: () => void;
  githubEnabled: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const ctx = use(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}

function GitHubMark() {
  return (
    <svg viewBox="0 0 16 16" className="size-4" fill="currentColor" aria-hidden>
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
    </svg>
  );
}

export function AuthProvider({ githubEnabled, children }: { githubEnabled: boolean; children: ReactNode }) {
  const { data: session, refetch } = useSession();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<string | undefined>();
  const [pending, setPending] = useState<"github" | "guest" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const waiter = useRef<((ok: boolean) => void) | null>(null);

  const settle = useCallback((ok: boolean) => {
    waiter.current?.(ok);
    waiter.current = null;
  }, []);

  const requireAuth = useCallback(
    (why?: string) => {
      if (session) return Promise.resolve(true);
      setReason(why);
      setError(null);
      setOpen(true);
      return new Promise<boolean>((resolve) => {
        waiter.current = resolve;
      });
    },
    [session],
  );

  async function continueAsGuest() {
    setPending("guest");
    setError(null);
    const { error } = await authClient.signIn.anonymous();
    if (error) {
      setPending(null);
      setError(error.message ?? "Could not start a guest session.");
      return;
    }
    await refetch();
    setPending(null);
    setOpen(false);
    settle(true);
  }

  async function continueWithGitHub() {
    setPending("github");
    setError(null);
    // Full-page OAuth redirect; the visitor comes back to the same page.
    const { error } = await authClient.signIn.social({ provider: "github", callbackURL: window.location.href });
    if (error) {
      setPending(null);
      setError(error.message ?? "GitHub sign-in failed.");
    }
  }

  return (
    <AuthContext value={{ requireAuth, openSignIn: () => void requireAuth(), githubEnabled }}>
      {children}
      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) settle(false);
        }}
        title={
          <span className="flex flex-col items-center gap-4 pt-2 text-center">
            <span className="flex size-14 items-center justify-center rounded-2xl border border-alpha-400 bg-bg-200">
              <Logo className="[&_svg]:size-7" />
            </span>
            Continue to {BRAND.name}
          </span>
        }
        description={<span className="block text-center">{reason ?? "Sign in to build, save and share your apps."}</span>}
      >
        <div className="flex flex-col gap-2">
          <Button
            variant="default"
            size="md"
            disabled={!githubEnabled || pending !== null}
            onClick={continueWithGitHub}
            title={githubEnabled ? undefined : "GitHub sign-in isn't configured on this deployment"}
          >
            {pending === "github" ? <LoaderCircle className="animate-spin" /> : <GitHubMark />}
            Continue with GitHub
          </Button>
          <Button variant="secondary" size="md" disabled={pending !== null} onClick={continueAsGuest}>
            {pending === "guest" ? <LoaderCircle className="animate-spin" /> : <UserRound />}
            Continue as guest
          </Button>
          {error && <p className="text-center text-label-13 text-red-900">{error}</p>}
          <p className="mt-2 text-center text-label-12 text-gray-900">
            Guest chats are kept for this browser. Sign in with GitHub later to keep them.
          </p>
        </div>
      </Dialog>
    </AuthContext>
  );
}
