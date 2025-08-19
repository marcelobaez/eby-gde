import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { Pool } from "pg";
import { authOptions } from "../auth/[...nextauth]";
import { canSearchExp, canSearchExpAll } from "@/utils/featureGuards";
import { parseISO } from "date-fns";

export type GdeSearchResult = {
  id: number;
  descripcion: string;
  id_trata: number;
  usuario_creador: string;
  fecha_creacion: string;
  usuario_modificacion: string;
  fecha_modificacion: string | null;
  tipo_documento: string;
  anio: number;
  numero: number;
  secuencia: string;
  definitivo: string;
  codigo_reparticion_actuacion: string;
  codigo_reparticion_usuario: string;
  es_electronico: string;
  solicitud_iniciadora: number;
  id_workflow: string;
  estado: string;
  es_cabecera_tc: string;
  sistema_creador: string;
  sistema_apoderado: string;
  bloqueado: number;
  tramitacion_libre: number;
  es_reservado: number;
  usuario_reserva: string;
  fecha_reserva?: null;
  fecha_archivo?: null;
  fecha_solicitud_archivo?: null;
  fecha_envio_depuracion?: null;
  id_externo?: null;
  pase_libre?: null;
  ecosistema_creador: string;
  ecosistema_apoderado: string;
  id_sol: number;
  motivo: string;
  motivo_de_rechazo: string;
  solicitud_interna: string;
  solicitante: number;
  usuario_creacion: string;
  fecha_creacion_sol: string;
  id_trata_sugerida: number;
  motivo_externo: string;
  search_vector: string;
  rank: number;
  total_count: string;
};

export interface GdeSearchResponse {
  data: GdeSearchResult[]; // Replace with your actual data type
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
const pool = new Pool({
  user: process.env.PG_DATABASE_USERNAME,
  host: process.env.PG_DATABASE_HOST,
  database: process.env.PG_DATABASE_NAME,
  password: process.env.PG_DATABASE_PASSWORD,
  port: 5432,
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === "GET") {
    const session = await getServerSession(req, res, authOptions);
    if (session) {
      const canAccess = canSearchExp(session.role);

      if (!canAccess) {
        return res.status(401).end();
      } else {
        // Extract query parameters
        const { searchQuery, page, pageSize, year, trata, startDate, endDate } =
          req.query;

        // Validate query parameters
        if (!page || !pageSize) {
          return res
            .status(400)
            .json({ error: "Missing required query parameters." });
        }

        const pageNumber = parseInt(page as string, 10);
        const itemsCount = parseInt(pageSize as string, 10);
        const yearFilter = year ? parseInt(year as string, 10) : null;
        const trataFilter = trata ? parseInt(trata as string, 10) : null;
        const startDateFilter = startDate
          ? parseISO(startDate as string)
          : null;
        const endDateFilter = endDate ? parseISO(endDate as string) : null;

        if (isNaN(pageNumber) || isNaN(itemsCount)) {
          return res
            .status(400)
            .json({ error: "Page and itemsPerPage must be valid numbers." });
        }

        const offset = (pageNumber - 1) * itemsCount;

        const searchTerm = searchQuery ? (searchQuery as string).trim() : "";

        const canSearchAll = canSearchExpAll(session.role);

        let whereClauses = [];
        let queryValues = [];
        let paramIndex = 0;

        // Build WHERE clauses and values dynamically
        if (searchTerm) {
          whereClauses.push(
            `search_vector @@ websearch_to_tsquery('spanish', $${++paramIndex})`
          );
          queryValues.push(searchTerm);
        }
        if (!canSearchAll) {
          whereClauses.push("es_reservado != '1'");
        }
        if (yearFilter && !isNaN(yearFilter)) {
          whereClauses.push(`anio = $${++paramIndex}`);
          queryValues.push(yearFilter);
        }
        if (trataFilter && !isNaN(trataFilter)) {
          whereClauses.push(`id_trata = $${++paramIndex}`);
          queryValues.push(trataFilter);
        }
        if (startDateFilter && endDateFilter) {
          const startParam = ++paramIndex;
          const endParam = ++paramIndex;
          whereClauses.push(
            `fecha_creacion >= $${startParam}::date AND fecha_creacion <= $${endParam}::date`
          );
          queryValues.push(
            startDateFilter.toISOString().split("T")[0],
            endDateFilter.toISOString().split("T")[0]
          );
        }

        // Add LIMIT and OFFSET parameters
        const limitParam = `$${++paramIndex}`;
        const offsetParam = `$${++paramIndex}`;
        queryValues.push(itemsCount, offset);

        let selectClause, orderClause;
        if (searchTerm) {
          selectClause = `ts_rank(search_vector, websearch_to_tsquery('spanish', $1)) as rank,`;
          orderClause = "rank DESC,";
        } else {
          selectClause = "0 as rank,";
          orderClause = "";
        }

        const baseQuery = `
    SELECT 
      *,
      ${selectClause}
      COUNT(*) OVER() as total_count
    FROM EE_EXPEDIENTE_ELECTRONICO
    ${whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : ""}
    ORDER BY ${orderClause} id
    LIMIT ${limitParam}
    OFFSET ${offsetParam}
  `;

        const query = {
          text: baseQuery,
          values: queryValues,
        };

        const result = await pool.query(query);

        // Calculate pagination info
        const totalCount = parseInt(result.rows[0]?.total_count as string) || 0;
        const totalPages = Math.ceil(totalCount / itemsCount);
        const hasNextPage = pageNumber < totalPages;
        const hasPreviousPage = pageNumber > 1;

        // Example response (replace this with your actual logic)
        const response: GdeSearchResponse = {
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
