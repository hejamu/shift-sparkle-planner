import { useEffect, useState } from "react";

export type AppUser = {
  id: number;
  username: string;
  role: "employee" | "manager" | "admin";
  name?: string;
  local?: boolean;
} | null;

export function useUser(): { user: AppUser } {
  const [user, setUser] = useState<AppUser>(() => {
    try {
      const raw = typeof window !== "undefined" ? localStorage.getItem("user") : null;
      return raw ? (JSON.parse(raw) as AppUser) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    const readUser = () => {
      try {
        const raw = localStorage.getItem("user");
        setUser(raw ? (JSON.parse(raw) as AppUser) : null);
      } catch {
        setUser(null);
      }
    };

    const handleStorage = () => readUser();
    const handleUserChanged = () => readUser();

    window.addEventListener("storage", handleStorage);
    window.addEventListener("user-changed", handleUserChanged as EventListener);
    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("user-changed", handleUserChanged as EventListener);
    };
  }, []);

  return { user };
}

export function useUserRole(): string | null {
  const { user } = useUser();
  return user?.role ?? null;
}

export function notifyUserChanged() {
  try {
    window.dispatchEvent(new Event("user-changed"));
  } catch {}
}
