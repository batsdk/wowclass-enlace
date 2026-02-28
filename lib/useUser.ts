import { useQuery } from '@tanstack/react-query';

export function useUser() {
  return useQuery({
    queryKey: ['user'],
    queryFn: async () => {
      const res = await fetch('/api/auth/session');
      if (!res.ok) return null;
      const { user } = await res.json();
      return user || null;
    },
    refetchOnWindowFocus: false,
  });
}