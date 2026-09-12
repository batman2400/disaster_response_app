import { useRouter } from "expo-router";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { clearSession, readSession, writeSession, type AppSession } from "./session";
import type { Role } from "./types";

type AuthContextValue = {
  session: AppSession | null;
  ready: boolean;
  signIn: (session: AppSession) => void;
  signOut: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AppSession | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setSession(readSession());
    setReady(true);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      ready,
      signIn(next) {
        writeSession(next);
        setSession(next);
      },
      signOut() {
        clearSession();
        setSession(null);
      },
    }),
    [ready, session],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

export function useRequireRole(role: Role) {
  const auth = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!auth.ready) return;
    if (auth.session?.role !== role) {
      router.replace("/");
    }
  }, [auth.ready, auth.session, role, router]);

  return auth;
}
