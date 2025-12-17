import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { Pool } from "pg";
import { authOptions } from "../auth/[...nextauth]";
import { canSearchDocs, canSearchDocsAll } from "@/utils/featureGuards";
import {
  validateSearchQuery,
  validatePageNumber,
  validatePageSize,
  validateYear,
  validateDocumentType,
} from "@/utils/queryValidation";

export type GdeDocSearchResult = {
  numero: string;
  motivo: string;
  usuariogenerador: string;
  datos_usuario: string;
  anio: number;
  rank: number;
  total_count: string;
  total_expedientes: number;
  tipo_documento: string;
  expedientes_asociados: string | null;
  expedientes_ids: string | null;
};

export interface GdeDocSearchResponse {
  data: GdeDocSearchResult[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalCount: number;
    itemsPerPage: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

// Initialize pool
if (!process.env.PG_DATABASE_HOST || !process.env.PG_DATABASE_PORT || 
    !process.env.PG_DATABASE_NAME || !process.env.PG_DATABASE_USERNAME || 
    !process.env.PG_DATABASE_PASSWORD) {
  throw new Error('Missing required PostgreSQL environment variables');
}

const pool = new Pool({
  user: process.env.PG_DATABASE_USERNAME,
  host: process.env.PG_DATABASE_HOST,
  database: process.env.PG_DATABASE_NAME,
  password: process.env.PG_DATABASE_PASSWORD,
  port: parseInt(process.env.PG_DATABASE_PORT),
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === "GET") {
    const session = await getServerSession(req, res, authOptions);
    if (session) {
      const canAccess = canSearchDocs(session.role);

      if (!canAccess) {
        return res.status(401).end();
      } else {
        // Extract query parameters
        const { searchQuery, page, pageSize, year, type } = req.query;

        // Validate required parameters
        if (!searchQuery || !page || !pageSize) {
          return res
            .status(400)
            .json({ error: "Missing required query parameters." });
        }

        // Security: Validate and sanitize inputs using utility functions
        const searchQueryValidation = validateSearchQuery(searchQuery);
        if (!searchQueryValidation.isValid) {
          return res.status(400).json({ error: searchQueryValidation.error });
        }
        const searchQueryStr = searchQueryValidation.value as string;

        const pageValidation = validatePageNumber(page);
        if (!pageValidation.isValid) {
          return res.status(400).json({ error: pageValidation.error });
        }
        const pageNumber = pageValidation.value as number;

        const pageSizeValidation = validatePageSize(pageSize);
        if (!pageSizeValidation.isValid) {
          return res.status(400).json({ error: pageSizeValidation.error });
        }
        const itemsCount = pageSizeValidation.value as number;

        const yearValidation = validateYear(year);
        if (!yearValidation.isValid) {
          return res.status(400).json({ error: yearValidation.error });
        }
        const yearFilter = yearValidation.value as number | null;

        const typeValidation = validateDocumentType(type);
        if (!typeValidation.isValid) {
          return res.status(400).json({ error: typeValidation.error });
        }
        const typeFilter = typeValidation.value as string | null;

        const offset = (pageNumber - 1) * itemsCount;
        let paramCount = 3;

        // Base query for documents with type join and expediente associations
        const baseQuery = `
          SELECT 
            doc.numero,
            doc.motivo,
            doc.usuariogenerador,
            doc.datos_usuario,
            doc.anio,
            doc.id,
            tip.esconfidencial,
            tip.nombre as tipo_documento,
            ts_rank(doc.search_vector, websearch_to_tsquery('spanish', $1)) as rank,
            COUNT(*) OVER() as total_count,
            COUNT(DISTINCT exp.id) as total_expedientes,
            STRING_AGG(
              exp.tipo_documento || '-' || exp.anio || '-' || exp.numero || '-' || 
              exp.codigo_reparticion_actuacion || '-' || exp.codigo_reparticion_usuario, 
              ', ' ORDER BY exp.tipo_documento, exp.anio, exp.numero
            ) as expedientes_asociados,
            STRING_AGG(
              DISTINCT exp.id::text, 
              ', ' ORDER BY exp.id::text
            ) as expedientes_ids
          FROM public.gedo_documento doc
          LEFT JOIN public.gedo_tipodocumento tip ON doc.tipo = tip.id
          LEFT JOIN DOCUMENTO EDOC ON doc.numero = EDOC.NUMERO_SADE
          LEFT JOIN ee_expediente_documentos red ON EDOC.id = red.id_documento
          LEFT JOIN EE_EXPEDIENTE_ELECTRONICO exp ON red.id = exp.id  
          WHERE doc.search_vector @@ websearch_to_tsquery('spanish', $1)
          ${yearFilter ? `AND doc.anio = $${++paramCount}` : ""}
          ${typeFilter ? `AND tip.acronimo ILIKE $${++paramCount}` : ""}
          GROUP BY doc.id, doc.numero, doc.motivo, doc.usuariogenerador, doc.datos_usuario, doc.anio, doc.search_vector, tip.esconfidencial, tip.nombre
        `;

        const queryNoRestrict = {
          text: `${baseQuery}
            ORDER BY total_expedientes DESC, rank DESC, doc.id
            LIMIT $2
            OFFSET $3
          `,
          values: [
            searchQueryStr,
            itemsCount,
            offset,
            ...(yearFilter ? [yearFilter] : []),
            ...(typeFilter ? [`%${typeFilter}%`] : []),
          ],
        };

        const queryRestrictedText = baseQuery.replace(
          'GROUP BY',
          `AND tip.esconfidencial != '1'\n          GROUP BY`
        );

        const queryRestricted = {
          text: `${queryRestrictedText}
            ORDER BY total_expedientes DESC, rank DESC, doc.id
            LIMIT $2
            OFFSET $3
          `,
          values: [
            searchQueryStr,
            itemsCount,
            offset,
            ...(yearFilter ? [yearFilter] : []),
            ...(typeFilter ? [`%${typeFilter}%`] : []),
          ],
        };

        const result = await pool.query(canSearchDocsAll(session.role) ? queryNoRestrict : queryRestricted);

        // Calculate pagination info
        const totalCount = parseInt(result.rows[0]?.total_count as string) || 0;
        const totalPages = Math.ceil(totalCount / itemsCount);
        const hasNextPage = pageNumber < totalPages;
        const hasPreviousPage = pageNumber > 1;

        // Example response (replace this with your actual logic)
        const response: GdeDocSearchResponse = {
          data: result.rows,
          pagination: {
            currentPage: pageNumber,
            totalPages,
            totalCount,
            itemsPerPage: itemsCount,
            hasNextPage,
            hasPreviousPage,
          },
        };

        return res.status(200).json(response);
      }
    } else {
      // Not Signed in
      return res.status(401).end();
    }
  } else {
    // Handle unsupported HTTP methods
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: `Method ${req.method} not allowed.` });
  }
}
