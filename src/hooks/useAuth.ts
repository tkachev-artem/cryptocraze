import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "../lib/queryClient";

type User = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  level: number;
  balance: string;
  coins: number;
  virtualBalance: string;
  freeBalance: string;
  preferredLanguage?: string;
  createdAt: string;
  profileImageUrl?: string;
  proModeUntil?: string;
  adsDisabledUntil?: string;
  tutorialCompleted: boolean;
}

export function useAuth() {
  const { data: user, isLoading } = useQuery<User>({
    queryKey: ["/api/auth/user"],
    queryFn: () => apiRequest("/api/auth/user"),
    retry: false,
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
  };
}
