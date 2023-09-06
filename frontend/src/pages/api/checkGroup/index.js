import axios from "axios";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";

const handler = async (req, res) => {
  const session = await getServerSession(req, res, authOptions);

  if (session) {
    try {
      const { data: groupData } = await axios.get(
        `https://graph.microsoft.com/v1.0/users/${session.azureId}/transitiveMemberOf`,
        {
          headers: {
            Authorization: `Bearer ${session.azureToken}`,
          },
        }
      );

      const hasDocsPermissions = groupData.value.some(
        (item) =>
          item["@odata.type"] === "#microsoft.graph.group" &&
          item.id === process.env.NEXT_PUBLIC_GROUP_ID
      );

      if (!hasDocsPermissions) {
        res.status(401);
        res.end();
      }

      res.status(200).json({ message: "ok" });
    } catch (error) {
      res.status(401);
      res.end();
    }
  } else {
    res.status(401);
    res.end();
  }
};

export default handler;
