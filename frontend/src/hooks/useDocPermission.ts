import axios from "axios";
import { useSession } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";

export function useHasDocsPermissions() {
  const { data: session, status } = useSession();
  const loading = status === "loading";
  const { data, isLoading, error } = useQuery({
    queryKey: ["docPermissions"],
    queryFn: async () =>
      await axios.get("/api/checkGroup", {
        signal: new AbortController().signal,
      }),
    enabled: !!session,
    staleTime: Infinity,
  });

  if (!loading && !isLoading && !error) {
    if (session && data && data.status === 200) {
      return true;
    } else return false;
  } else {
    return false;
  }
}
