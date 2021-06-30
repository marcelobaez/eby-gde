import axios from "axios";
import { getSession } from "next-auth/client";

export default async function expHandler(req, res) {
  const session = await getSession({ req });

  const {
    query: { id },
    method,
  } = req;

  if (session) {
    switch (method) {
      case "PUT":
        try {
          await axios.put(
            `${process.env.NEXT_PUBLIC_API_URL}/expedientes/${id}`,
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
          console.log(error.response.data.message);
          res.status(error.response.status).send(error.response.data.message);
        }
        break;

      case "DELETE":
        try {
          await axios.delete(
            `${process.env.NEXT_PUBLIC_API_URL}/expedientes/${id}`,
            {
              headers: {
                Authorization: `Bearer ${session.jwt}`,
              },
            }
          );

          res.status(200).json({ message: "Registro quitado correctamente" });
        } catch (error) {
          console.log(error.response.data.message);
          res.status(error.response.status).send(error.response.data.message);
        }
        break;
      default:
        res.setHeader("Allow", ["GET", "PUT"]);
        res.status(405).end(`Method ${method} Not Allowed`);
    }
  } else {
    res.status(401);
  }
  res.end();
}
