import axios from "axios";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import { NextApiRequest, NextApiResponse } from "next";

const url = "http://192.168.161.50:4000/document/check";

type ResponseData = {
  url: string;
};

type NotFoundResponse = {
  error: string;
};

const handler = async (
  req: NextApiRequest,
  res: NextApiResponse<ResponseData | NotFoundResponse>
) => {
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
        (item: any) =>
          item["@odata.type"] === "#microsoft.graph.group" &&
          item.id === process.env.NEXT_PUBLIC_GROUP_ID
      );

      if (!hasDocsPermissions) {
        res.status(401);
        res.end();
      }
    } catch (error) {
      console.log("error checking group", error);
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
