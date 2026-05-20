import { useQuery, useQueryClient } from "@tanstack/react-query";

export type Role = "employee" | "manager" | "admin";
export type AppUser = {
  id: number;
  username: string;
  role: Role;
};

const USER_QUERY_KEY = ["me"] as const;

async function fetchMe(): Promise<AppUser | null> {
  const res = await fetch("/api/me", { credentials: "include" });
  if (res.status === 401) return null;
  if (!res.ok) throw new Error("Failed to load session");
  return (await res.json()) as AppUser;
}

export function useUser(): { user: AppUser | null; isLoading: boolean } {
  const { data, isLoading } = useQuery({
    queryKey: USER_QUERY_KEY,
    queryFn: fetchMe,
    staleTime: 60_000,
    retry: false,
  });
  return { user: data ?? null, isLoading };
}

export function useUserRole(): Role | null {
  return useUser().user?.role ?? null;
}

export function useInvalidateUser() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: USER_QUERY_KEY });
}

export async function logout(): Promise<void> {
  await fetch("/api/logout", { method: "POST", credentials: "include" });
}
