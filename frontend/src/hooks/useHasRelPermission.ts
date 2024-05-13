import { useSession } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/axios";

export function useHasRelPermission() {
  const { data: session, status } = useSession();
  const loading = status === "loading";
  const { data, isLoading, error } = useQuery({
    queryKey: ["userData"],
    queryFn: async () => {
      const { data } = await api.get("/users/me");
      return data;
    },
    enabled: !!session,
  });

  if (!loading && !isLoading && !error) {
    if (session && data && data.isAdmin) {
      return true;
    } else return false;
  } else {
    return false;
  }
}
