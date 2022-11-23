import axios from "axios";
import { useSession } from "next-auth/client";
import { useQuery } from "react-query";

export function useHasDocsPermissions() {
  const [session, loading] = useSession();
  const { data, isLoading, error } = useQuery(
    "docPermissions",
    async () => await axios.get("/api/checkGroup"),
    {
      enabled: !!session,
    }
  );

  if (!loading && !isLoading && !error) {
    if (session && data.status === 200) {
      return true;
    } else return false;
  } else {
    return false;
  }
}
