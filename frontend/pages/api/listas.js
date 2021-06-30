import { getSession } from "next-auth/client";
import axios from "axios";

export default async function handler(req, res) {
  const session = await getSession({ req });

  if (session) {
    const { data } = await axios.get(
      `${process.env.NEXT_PUBLIC_API_URL}/listas`,
      {
        headers: {
          Authorization: `Bearer ${session.jwt}`,
        },
      }
    );
    res.send(data);
  } else {
    res.status(401);
  }
  res.end();
}
