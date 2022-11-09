import axios from "axios";
import { getSession } from "next-auth/client";

const url = "http://192.168.161.50:4000/document/check";

const handler = async (req, res) => {
  const session = await getSession({ req });

  if (session) {
    try {
      // verificar que el usuario pertenezca al grupo correcto
      const { data: groupData } = await axios.get(
        `https://graph.microsoft.com/v1.0/users/${session.azureId}/memberOf`,
        {
          headers: { Authorization: `Bearer ${session.azureJwt}` },
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

      console.log(response);

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
