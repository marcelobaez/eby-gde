import axios from "axios";
import { getSession } from "next-auth/client";

export default async function handler(req, res) {
  const session = await getSession({ req });
  const { method } = req;

  if (session) {
    switch (method) {
      case "GET":
        try {
          const { data } = await axios.get(
            `${process.env.NEXT_PUBLIC_API_URL}/expedientes`,
            {
              headers: {
                Authorization: `Bearer ${session.jwt}`,
              },
            }
          );

          res.status(200).json(data);
        } catch (error) {
          console.log(error.response.data.message);
          res.status(error.response.status).send(error.response.data.message);
        }
        break;
      case "POST":
        try {
          await axios.post(
            `${process.env.NEXT_PUBLIC_API_URL}/expedientes`,
            req.body,
            {
              headers: {
                Authorization: `Bearer ${session.jwt}`,
              },
            }
          );

          res.status(201).json({ message: "Registro agregado correctamente" });
        } catch (error) {
          console.log(error.response.data.message);
          res.status(error.response.status).send(error.response.data.message);
        }
        break;
      default:
        res.setHeader("Allow", ["GET", "POST"]);
        res.status(405).end(`Method ${method} Not Allowed`);
    }
  } else {
    res.status(401);
  }
  res.end();
}
