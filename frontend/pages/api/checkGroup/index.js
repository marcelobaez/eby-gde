import axios from "axios";
import { getSession } from "next-auth/client";
import { getCookie } from "cookies-next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

const handler = async (req, res) => {
  const session = await getSession({ req });

  if (session) {
    const expDate = getCookie("tknExp", { req, res });
    let azureToken = getCookie("azureTkn", { req, res });

    if (Date.now() < expDate) {
      // try to renew token
      const { data: tokenData } = await axios.post(
        `${siteUrl}/api/refreshToken`,
        { token: session.refreshToken }
      );

      azureToken = tokenData.token;
    }

    // verificar que el usuario pertenezca al grupo correcto
    const { data: groupData } = await axios.get(
      `https://graph.microsoft.com/v1.0/users/${session.azureId}/memberOf`,
      {
        headers: {
          Authorization: `Bearer ${getCookie("azureTkn", { req, res })}`,
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
  } else {
    res.status(401);
    res.end();
  }
};

export default handler;
