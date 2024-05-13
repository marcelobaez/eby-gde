import axios from "axios";
import { getSession } from "next-auth/react";
import { NextApiRequest, NextApiResponse } from "next";

export default async function expHandler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getSession({ req });

  const {
    query: { id },
    method,
  } = req;

  if (session) {
    switch (method) {
      case "GET":
        try {
          const { data } = await axios.get(
            `${process.env.NEXT_PUBLIC_API_URL}/listas/${id}`,
            {
              headers: {
                Authorization: `Bearer ${session.jwt}`,
              },
            }
          );
          res.send(data);
        } catch (error) {
          console.log("Hubo un error al obtener el registro");
          res.status(500).send("Hubo un error al obtener el registro");
        }
        break;

      case "PUT":
        try {
          await axios.put(
            `${process.env.NEXT_PUBLIC_API_URL}/listas/${id}`,
            req.body,
            {
              headers: {
                Authorization: `Bearer ${session.jwt}`,
              },
            }
          );

          res
            .status(200)
            .json({ message: "Registro actualizado correctamente" });
        } catch (error) {
          console.log("Hubo un error al actualizar el registro");
          res.status(500).send("Hubo un error al actualizar el registro");
        }
        break;

      case "DELETE":
        try {
          await axios.delete(
            `${process.env.NEXT_PUBLIC_API_URL}/listas/${id}`,
            {
              headers: {
                Authorization: `Bearer ${session.jwt}`,
              },
            }
          );

          res.status(200).json({ message: "Registro eliminado correctamente" });
        } catch (error) {
          console.log("Hubo un error al eliminar el registro");
          res.status(500).send("Hubo un error al eliminar el registro");
        }
        break;

      default:
        res.setHeader("Allow", ["GET", "PUT", "DELETE"]);
        res.status(405).end(`Method ${method} Not Allowed`);
    }
  } else {
    res.status(401);
  }
  res.end();
}
