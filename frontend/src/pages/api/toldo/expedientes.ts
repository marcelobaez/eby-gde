import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { Pool } from "pg";
import { authOptions } from "../auth/[...nextauth]";
import { canAccessMesas } from "@/utils/featureGuards";
import {
  validatePageNumber,
  validatePageSize,
} from "@/utils/queryValidation";

export type ToldoExpedienteResult = {
  id: number;
  descripcion: string;
  id_trata: number;
  trata_nombre: string;
  trata_codigo: string | null;
  trata_descripcion: string | null;
  usuario_creador: string;
  fecha_creacion: string;
  usuario_modificacion: string;
  fecha_modificacion: string | null;
  tipo_documento: string;
  anio: number;
  numero: number;
  codigo_reparticion_actuacion: string;
  codigo_reparticion_usuario: string;
  estado: string;
  usuario_creacion: string;
  fecha_creacion_sol: string;
  motivo: string;
  total_count: string;
};

export interface ToldoTratatypeStats {
  trata_nombre: string;
  trata_codigo: string | null;
  trata_descripcion: string | null;
  count: number;
}

export interface ToldoExpedienteStats {
  totalExpedientes: number;
  trataTypeStats: ToldoTratatypeStats[];
}

export interface ToldoExpedienteResponse {
  data: ToldoExpedienteResult[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalCount: number;
    itemsPerPage: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
  stats: ToldoExpedienteStats;
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

// Validate date format (YYYY-MM-DD or ISO datetime)
function validateDateParam(value: unknown): { isValid: boolean; value: string | null; error?: string } {
  if (value === undefined || value === null || value === "") {
    return { isValid: true, value: null };
  }

  if (typeof value !== "string") {
    return { isValid: false, value: null, error: "Date must be a string" };
  }

  // Accept YYYY-MM-DD format or ISO datetime
  const dateRegex = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?)?$/;
  if (!dateRegex.test(value)) {
    return { isValid: false, value: null, error: "Invalid date format. Expected YYYY-MM-DD" };
  }

  const date = new Date(value);
  if (isNaN(date.getTime())) {
    return { isValid: false, value: null, error: "Invalid date value" };
  }

  return { isValid: true, value: value };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === "GET") {
    const session = await getServerSession(req, res, authOptions);
    if (session) {
      const canAccess = canAccessMesas(session.role);

      if (!canAccess) {
        return res.status(401).end();
      } else {
        // Extract query parameters
        const { page, pageSize, startDate, endDate, tratas } = req.query;

        // Validate required parameters
        if (!page || !pageSize) {
          return res
            .status(400)
            .json({ error: "Missing required query parameters." });
        }

        // Security: Validate and sanitize inputs
        const pageValidation = validatePageNumber(page);
        if (!pageValidation.isValid) {
          return res.status(400).json({ error: pageValidation.error });
        }
        const pageNumber = pageValidation.value as number;

        // Allow up to 5000 for export functionality
        const pageSizeValidation = validatePageSize(pageSize, 1, 5000);
        if (!pageSizeValidation.isValid) {
          return res.status(400).json({ error: pageSizeValidation.error });
        }
        const itemsCount = pageSizeValidation.value as number;

        const startDateValidation = validateDateParam(startDate);
        if (!startDateValidation.isValid) {
          return res.status(400).json({ error: startDateValidation.error });
        }
        const startDateFilter = startDateValidation.value;

        const endDateValidation = validateDateParam(endDate);
        if (!endDateValidation.isValid) {
          return res.status(400).json({ error: endDateValidation.error });
        }
        const endDateFilter = endDateValidation.value;

        // Validate tratas parameter (comma-separated trata names)
        let tratasFilter: string[] = [];
        if (tratas && typeof tratas === "string" && tratas.trim() !== "") {
          // Sanitize: only allow alphanumeric, spaces, hyphens, underscores
          const tratasArray = tratas.split(",").map((t) => t.trim()).filter(Boolean);
          const validPattern = /^[a-zA-Z0-9\s\-_áéíóúÁÉÍÓÚñÑ]+$/;
          for (const trata of tratasArray) {
            if (!validPattern.test(trata) || trata.length > 200) {
              return res.status(400).json({ error: "Invalid trata filter" });
            }
          }
          tratasFilter = tratasArray;
        }

        const offset = (pageNumber - 1) * itemsCount;

        // Build dynamic WHERE conditions (base conditions without tratas filter for stats)
        const baseConditions: string[] = [];
        const baseValues: (string | number)[] = [];
        let baseParamCount = 0;

        if (startDateFilter) {
          baseParamCount++;
          baseConditions.push(`ee.fecha_creacion >= $${baseParamCount}::timestamp`);
          baseValues.push(startDateFilter);
        }

        if (endDateFilter) {
          baseParamCount++;
          // Use < instead of <= to exclude midnight of the next day (timezone boundary)
          baseConditions.push(`ee.fecha_creacion < $${baseParamCount}::timestamp + interval '1 day'`);
          baseValues.push(endDateFilter);
        }

        const statsWhereClause = baseConditions.length > 0 ? `WHERE ${baseConditions.join(' AND ')}` : '';
        const statsValues = [...baseValues];

        // Build conditions for main query (includes LIMIT/OFFSET params)
        const conditions: string[] = [];
        const values: (string | number)[] = [itemsCount, offset];
        let paramCount = 2; // Start after LIMIT and OFFSET params

        if (startDateFilter) {
          paramCount++;
          conditions.push(`ee.fecha_creacion >= $${paramCount}::timestamp`);
          values.push(startDateFilter);
        }

        if (endDateFilter) {
          paramCount++;
          conditions.push(`ee.fecha_creacion < $${paramCount}::timestamp + interval '1 day'`);
          values.push(endDateFilter);
        }

        if (tratasFilter.length > 0) {
          const tratasPlaceholders = tratasFilter.map(() => {
            paramCount++;
            return `$${paramCount}`;
          }).join(", ");
          conditions.push(`(t.codigo_trata || ' - ' || t.descripcion) IN (${tratasPlaceholders})`);
          values.push(...tratasFilter);
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

        // Query for expedientes from ee_expediente_electronico table with trata join
        const baseQuery = `
          SELECT
            ee.id,
            ee.descripcion,
            ee.id_trata,
            (t.codigo_trata || ' - ' || t.descripcion) as trata_nombre,
            t.codigo_trata as trata_codigo,
            t.descripcion as trata_descripcion,
            ee.usuario_creador,
            ee.fecha_creacion,
            ee.usuario_modificacion,
            ee.fecha_modificacion,
            ee.tipo_documento,
            ee.anio,
            ee.numero,
            ee.codigo_reparticion_actuacion,
            ee.codigo_reparticion_usuario,
            ee.estado,
            ee.usuario_creacion,
            ee.fecha_creacion_sol,
            ee.motivo,
            COUNT(*) OVER() as total_count
          FROM public.ee_expediente_electronico ee
          LEFT JOIN public.trata t ON ee.id_trata = t.id
          ${whereClause}
          ORDER BY ee.fecha_creacion DESC, ee.id
          LIMIT $1
          OFFSET $2
        `;

        // Trata type stats query (WITHOUT tratas filter so all types show in UI)
        const trataStatsQuery = `
          SELECT
            (t.codigo_trata || ' - ' || t.descripcion) as trata_nombre,
            t.codigo_trata as trata_codigo,
            t.descripcion as trata_descripcion,
            COUNT(*) as count
          FROM public.ee_expediente_electronico ee
          LEFT JOIN public.trata t ON ee.id_trata = t.id
          ${statsWhereClause}
          GROUP BY t.codigo_trata, t.descripcion, t.id
          ORDER BY count DESC
        `;

        // Build WHERE clause for total count query (WITH tratas filter for accurate results)
        const totalConditions: string[] = [];
        const totalValues: (string | number)[] = [];
        let totalParamCount = 0;

        if (startDateFilter) {
          totalParamCount++;
          totalConditions.push(`ee.fecha_creacion >= $${totalParamCount}::timestamp`);
          totalValues.push(startDateFilter);
        }

        if (endDateFilter) {
          totalParamCount++;
          totalConditions.push(`ee.fecha_creacion < $${totalParamCount}::timestamp + interval '1 day'`);
          totalValues.push(endDateFilter);
        }

        if (tratasFilter.length > 0) {
          const tratasPlaceholders = tratasFilter.map(() => {
            totalParamCount++;
            return `$${totalParamCount}`;
          }).join(", ");
          totalConditions.push(`(t.codigo_trata || ' - ' || t.descripcion) IN (${tratasPlaceholders})`);
          totalValues.push(...tratasFilter);
        }

        const totalWhereClause = totalConditions.length > 0 ? `WHERE ${totalConditions.join(' AND ')}` : '';

        // Total expedientes count query (WITH tratas filter for accurate results)
        const totalStatsQuery = `
          SELECT COUNT(*) as total_expedientes
          FROM public.ee_expediente_electronico ee
          LEFT JOIN public.trata t ON ee.id_trata = t.id
          ${totalWhereClause}
        `;

        const query = {
          text: baseQuery,
          values: values,
        };

        // Run queries in parallel
        const [result, trataStatsResult, totalStatsResult] = await Promise.all([
          pool.query(query),
          pool.query(trataStatsQuery, statsValues),
          pool.query(totalStatsQuery, totalValues),
        ]);

        // Calculate pagination info
        const totalCount = parseInt(result.rows[0]?.total_count as string) || 0;
        const totalPages = Math.ceil(totalCount / itemsCount);
        const hasNextPage = pageNumber < totalPages;
        const hasPreviousPage = pageNumber > 1;

        // Build stats
        const totalExpedientes = parseInt(totalStatsResult.rows[0]?.total_expedientes as string) || 0;
        const trataTypeStats: ToldoTratatypeStats[] = trataStatsResult.rows.map(row => ({
          trata_nombre: row.trata_nombre || 'Sin trata',
          trata_codigo: row.trata_codigo || null,
          trata_descripcion: row.trata_descripcion || null,
          count: parseInt(row.count as string) || 0,
        }));

        const response: ToldoExpedienteResponse = {
          data: result.rows,
          pagination: {
            currentPage: pageNumber,
            totalPages,
            totalCount,
            itemsPerPage: itemsCount,
            hasNextPage,
            hasPreviousPage,
          },
          stats: {
            totalExpedientes,
            trataTypeStats,
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
