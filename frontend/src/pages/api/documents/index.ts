import stream from "stream";
import { promisify } from "util";
import axios from "axios";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import { NextApiRequest, NextApiResponse } from "next";

const pipeline = promisify(stream.pipeline);
const url = "http://192.168.161.50:4000/document";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  const session = await getServerSession(req, res, authOptions);

  if (session) {
    // verificar que el usuario pertenezca al grupo correcto
    const { data: groupData } = await axios.get(
      `https://graph.microsoft.com/v1.0/users/${session.azureId}/transitiveMemberOf`,
      {
        headers: {
          Authorization: `Bearer ${session.azureToken}`,
        },
      }
    );

    const hasDocsPermissions = groupData.value.some(
      (item: any) =>
        item["@odata.type"] === "#microsoft.graph.group" &&
        item.id === process.env.NEXT_PUBLIC_GROUP_ID
    );

    if (!hasDocsPermissions) {
      res.status(401);
      res.end();
    }

    const { path } = req.query;

    try {
      const response = await axios.get(url, {
        headers: {
          "X-API-KEY": process.env.DOCS_API_KEY,
        },
        responseType: "stream",
        params: {
          path,
        },
      });

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", "attachment;");
      res.status(200);
      await pipeline(response.data, res);
    } catch (error) {
      res.status(404).json({ error: "No se encontro el documento" });
    }
  } else {
    res.status(401);
  }
};

export default handler;
