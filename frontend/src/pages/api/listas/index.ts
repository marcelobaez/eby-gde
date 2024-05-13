import axios from "axios";
import { getSession } from "next-auth/react";
import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getSession({ req });
  const { method } = req;

  if (session) {
    switch (method) {
      case "GET":
        try {
          const { data } = await axios.get(
            `${process.env.NEXT_PUBLIC_API_URL}/listas`,
            {
              headers: {
                Authorization: `Bearer ${session.jwt}`,
              },
            }
          );

          res.status(200).json(data);
        } catch (error) {
          console.log(error);
          res.status(500).send("Hubo un error al obtener las listas");
        }
        break;
      case "POST":
        try {
          await axios.post(
            `${process.env.NEXT_PUBLIC_API_URL}/listas`,
            req.body,
            {
              headers: {
                Authorization: `Bearer ${session.jwt}`,
              },
            }
          );

          res.status(201).json({ message: "Lista creada correctamente" });
        } catch (error) {
          console.log("Hubo un error al crear la lista");
          res.status(500).send("Hubo un error al crear la lista");
        }
        break;
      default:
        res.setHeader("Allow", ["GET", "POST"]);
        res.status(405).end(`Method ${method} Not Allowed`);
    }
  } else {
    console.log("No hay sesion!!");
    res.status(401);
    res.end();
  }
}
