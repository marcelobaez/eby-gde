import axios from "axios";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import { NextApiRequest, NextApiResponse } from "next";
import { User } from "@/types/user";

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
      const { data } = await axios.get<User>(
        `${process.env.NEXT_PUBLIC_API_URL}/api/users/me?populate=role`,
        {
          headers: {
            Authorization: `Bearer ${session.jwt}`,
          },
        }
      );

      if (data && data.role.name.toLowerCase() === "authenticated") {
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
