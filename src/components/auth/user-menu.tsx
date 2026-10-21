"use client";

import { Check, LogOut, Monitor, Moon, Settings, Sun } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Menu, MenuContent, MenuItem, MenuSeparator, MenuTrigger } from "@/components/ui/menu";
import { signOut, useSession } from "@/lib/auth-client";
import { setTheme, useTheme, type Theme } from "@/lib/local-settings";
import { useAuth } from "./auth-provider";
import { SettingsDialog } from "./settings-dialog";

const THEMES: { value: Theme; label: string; icon: typeof Sun }[] = [
  { value: "system", label: "System", icon: Monitor },
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
];

export function UserMenu({ compact = false }: { compact?: boolean }) {
  const { data: session, isPending } = useSession();
  const { openSignIn } = useAuth();
  const theme = useTheme();
  const router = useRouter();
  const [settingsOpen, setSettingsOpen] = useState(false);

  if (isPending) return <div className="size-7 animate-pulse rounded-full bg-gray-200" aria-hidden />;

  if (!session) {
    return (
      <div className="flex items-center gap-2">
        {!compact && (
          <Button variant="secondary" size="sm" className="h-7" onClick={openSignIn}>
            Log In
          </Button>
        )}
        <Button variant="default" size="sm" className="h-7" onClick={openSignIn}>
          Sign Up
        </Button>
      </div>
    );
  }

  const user = session.user;
  const isGuest = Boolean(user.isAnonymous);
  const initial = (isGuest ? "G" : (user.name?.[0] ?? "?")).toUpperCase();

  return (
    <>
      <Menu>
        <MenuTrigger asChild>
          <button
            aria-label="Account menu"
            className="flex size-7 items-center justify-center overflow-hidden rounded-full border border-alpha-400 bg-gray-200 text-label-12 font-medium text-gray-1000 outline-none focus-visible:ring-2 focus-visible:ring-blue-700"
          >
            {user.image && !isGuest ? (
              // eslint-disable-next-line @next/next/no-img-element -- remote avatar, tiny, no optimization needed
              <img src={user.image} alt="" className="size-full object-cover" />
            ) : (
              initial
            )}
          </button>
        </MenuTrigger>
        <MenuContent align="end" className="w-60">
          <div className="px-2.5 py-2">
            <p className="truncate text-label-14 font-medium text-gray-1000">{isGuest ? "Guest" : user.name}</p>
            <p className="truncate text-label-12 text-gray-900">
              {isGuest ? "Sign in with GitHub to keep your chats" : user.email}
            </p>
          </div>
          {isGuest && (
            <MenuItem onSelect={openSignIn}>
              <Check />
              Sign in to save your work
            </MenuItem>
          )}
          <MenuSeparator />
          <MenuItem onSelect={() => setSettingsOpen(true)}>
            <Settings />
            Settings &amp; API key
          </MenuItem>
          <div className="flex items-center justify-between px-2.5 py-1.5">
            <span className="text-label-14 text-gray-1000">Theme</span>
            <div className="flex rounded-md border border-alpha-400 p-0.5">
              {THEMES.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  aria-label={`${label} theme`}
                  aria-pressed={theme === value}
                  onClick={() => setTheme(value)}
                  className={`rounded p-1 ${theme === value ? "bg-alpha-400 text-gray-1000" : "text-gray-900 hover:text-gray-1000"}`}
                >
                  <Icon className="size-3.5" />
                </button>
              ))}
            </div>
          </div>
          <MenuSeparator />
          <MenuItem
            onSelect={async () => {
              await signOut();
              router.push("/");
              router.refresh();
            }}
          >
            <LogOut />
            Sign out
          </MenuItem>
        </MenuContent>
      </Menu>
      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </>
  );
}
