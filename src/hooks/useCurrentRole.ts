"use client";

import { useQuery } from "@tanstack/react-query";

export interface CurrentRole {
  /** User.role — 'restaurant_owner' | 'team_member' | (server-side: 'superadmin' / 'manager') */
  role: string | null;
  /** TeamMember.role (sadece User.role='team_member' için doludur) — 'owner' | 'manager' | 'staff' | 'viewer' */
  teamRole: string | null;
  /** TeamMember.role === 'viewer' kısayolu — write butonlarını gate'lemek için. */
  isViewer: boolean;
  /** Yükleme durumu — true ise UI'ı pesimist disabled tutmak güvenli. */
  loading: boolean;
}

/**
 * Owner panelinde mevcut kullanıcının User + TeamMember rol bilgisini döndürür.
 * `/api/user/profile` GET'i `teamRole` field'ı ile genişletildi (Faz 7);
 * sadece team_member için teamRole dolu, diğer rol'ler için null.
 *
 * Kullanım: write butonları + invite kısımları viewer için disabled / hidden.
 *
 * Cache: React Query default (60sn fresh, §27.1). Mount'ta tek fetch yeter.
 */
export function useCurrentRole(): CurrentRole {
  const { data, isLoading } = useQuery<{
    role: string;
    teamRole: string | null;
  }>({
    queryKey: ["current-user-role"],
    queryFn: async () => {
      const res = await fetch("/api/user/profile");
      if (!res.ok) throw new Error("profile_fetch_failed");
      return res.json();
    },
    retry: 1,
  });

  const role = data?.role ?? null;
  const teamRole = data?.teamRole ?? null;
  const isViewer = role === "team_member" && teamRole === "viewer";

  return { role, teamRole, isViewer, loading: isLoading };
}
