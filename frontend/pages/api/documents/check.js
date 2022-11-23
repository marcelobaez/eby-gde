import axios from "axios";
import { getSession } from "next-auth/client";
import { getCookie } from "cookies-next";

const url = "http://192.168.161.50:4000/document/check";
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

const handler = async (req, res) => {
  const session = await getSession({ req });

  if (session) {
    try {
      // verificar que el usuario pertenezca al grupo correcto
      const expDate = getCookie("tknExp", {
        req,
        res,
      });
      let azureToken = getCookie("azureTkn", {
        req,
        res,
      });

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
            Authorization: `Bearer ${getCookie("azureTkn", {
              req,
              res,
            })}`,
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
    } catch (error) {
      console.log(error);
    }

    const { type, year, number, system, location } = req.query;

    try {
      const response = await axios.get(url, {
        headers: {
          "X-API-KEY": process.env.DOCS_API_KEY,
        },
        params: {
          type,
          year,
          number,
          system,
          location,
        },
      });

      res.json({ url: response.data });
    } catch (error) {
      console.log(error);
      res.status(404).json({ error: "No se encontro el documento" });
    }
  } else {
    res.status(401);
    res.end();
  }
};

export default handler;
