import axios from "axios";
import { useSession } from "next-auth/client";
import { useQuery } from "react-query";

export function useHasDocsPermissions() {
  const [session, loading] = useSession();
  const { data, isLoading, error } = useQuery(
    "docPermissions",
    async () =>
      await axios.get(
        `https://graph.microsoft.com/v1.0/users/${session.azureId}/memberOf`,
        {
          headers: { Authorization: `Bearer ${session.azureJwt}` },
        }
      ),
    {
      enabled: !!session,
    }
  );

  if (!loading && !isLoading && !error) {
    if (session && data) {
      const hasPerm = data.data.value.some(
        (item) =>
          item["@odata.type"] === "#microsoft.graph.group" &&
          item.id === process.env.NEXT_PUBLIC_GROUP_ID
      );
      return hasPerm;
    } else return false;
  } else {
    return false;
  }
}
