import stream from "stream";
import { promisify } from "util";
import axios from "axios";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import { NextApiRequest, NextApiResponse } from "next";
import { Pool } from "pg";
import { canDownloadDocsAll } from "@/utils/featureGuards";

const pipeline = promisify(stream.pipeline);
const url = "http://192.168.161.50:4000/document";

// Initialize pool
if (
  !process.env.PG_DATABASE_HOST ||
  !process.env.PG_DATABASE_PORT ||
  !process.env.PG_DATABASE_NAME ||
  !process.env.PG_DATABASE_USERNAME ||
  !process.env.PG_DATABASE_PASSWORD
) {
  throw new Error("Missing required PostgreSQL environment variables");
}

const pool = new Pool({
  user: process.env.PG_DATABASE_USERNAME,
  host: process.env.PG_DATABASE_HOST,
  database: process.env.PG_DATABASE_NAME,
  password: process.env.PG_DATABASE_PASSWORD,
  port: parseInt(process.env.PG_DATABASE_PORT),
});

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  const session = await getServerSession(req, res, authOptions);

  if (session) {
    const { path } = req.query;

    // If user has permission to download all docs, keep existing logic
    if (canDownloadDocsAll(session.role)) {
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
      // Check if document is confidential by querying PostgreSQL
      try {
        // Extract document number from path
        // Example path: "2025/DTECN/00/033/DOCFI-2025-00033467-GDEEBY-DTECN/DOCFI-2025-00033467-GDEEBY-DTECN.pdf"
        // We need the second to last part when splitting by "/"
        const pathParts = (path as string).split("/");
        const documentNumber = pathParts[pathParts.length - 2];

        if (!documentNumber) {
          return res.status(404).json({ error: "No se encontro el documento" });
        }

        const query = {
          text: `
            SELECT tip.esconfidencial
            FROM public.gedo_documento doc
            LEFT JOIN public.gedo_tipodocumento tip ON doc.tipo = tip.id
            WHERE doc.numero = $1
          `,
          values: [documentNumber],
        };

        const result = await pool.query(query);

        if (result.rows.length === 0) {
          return res.status(404).json({ error: "No se encontro el documento" });
        }

        const isConfidential = result.rows[0].esconfidencial === "1";

        if (isConfidential) {
          return res.status(404).json({ error: "No se encontro el documento" });
        }

        // Document is not confidential, proceed with download
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
    }
  } else {
    res.status(401);
  }
};

export default handler;
