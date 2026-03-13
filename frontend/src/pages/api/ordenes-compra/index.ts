import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { Pool } from "pg";
import { authOptions } from "../auth/[...nextauth]";
import { canAccessOrdenesCompra } from "@/utils/featureGuards";
import {
  validateSearchQuery,
  validatePageNumber,
  validatePageSize,
} from "@/utils/queryValidation";
import { validateDateParam } from "@/utils/api-validation";

export type OrdenCompraResult = {
  numero: string;
  motivo: string;
  usuariogenerador: string;
  datos_usuario: string;
  anio: number;
  fechacreacion: string;
  total_count: string;
  tipo_documento: string;
  reparticion: string;
  rank?: number;
};

export interface OrdenCompraDocResponse {
  data: OrdenCompraResult[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalCount: number;
    itemsPerPage: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

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
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: `Method ${req.method} not allowed.` });
  }

  try {
    const session = await getServerSession(req, res, authOptions);

    if (!session) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const canAccess = canAccessOrdenesCompra(session.role);
    if (!canAccess) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { searchQuery, page, pageSize, startDate, endDate, reparticiones } = req.query;

    if (!page || !pageSize) {
      return res
        .status(400)
        .json({ error: "Missing required query parameters." });
    }

    const pageValidation = validatePageNumber(page);
    if (!pageValidation.isValid) {
      return res.status(400).json({ error: pageValidation.error });
    }
    const pageNumber = pageValidation.value as number;

    const pageSizeValidation = validatePageSize(pageSize, 1, 5000);
    if (!pageSizeValidation.isValid) {
      return res.status(400).json({ error: pageSizeValidation.error });
    }
    const itemsCount = pageSizeValidation.value as number;

    const searchQueryStr = searchQuery 
      ? (() => {
          const validation = validateSearchQuery(searchQuery);
          if (!validation.isValid) {
            return res.status(400).json({ error: validation.error });
          }
          return validation.value as string;
        })()
      : null;

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

    let reparticionesFilter: string[] = [];
    if (reparticiones && typeof reparticiones === "string" && reparticiones.trim() !== "") {
      const reparticionesArray = reparticiones.split(",").map((r) => r.trim()).filter(Boolean);
      const validPattern = /^[a-zA-Z0-9\s\-_\.\(\)áéíóúÁÉÍÓÚñÑ]+$/;
      for (const rep of reparticionesArray) {
        if (!validPattern.test(rep) || rep.length > 20) {
          return res.status(400).json({ error: "Invalid reparticion filter" });
        }
      }
      reparticionesFilter = reparticionesArray;
    }

    const offset = (pageNumber - 1) * itemsCount;
    let paramCount = 0;

    const conditions: string[] = [
      "tip.acronimo in ('OCFC', 'ORDEN')"
    ];
    const values: (string | number)[] = [];

    if (searchQueryStr) {
      const normalizedQuery = searchQueryStr.replace(/[.\-]/g, " ");
      const normalizedDigits = searchQueryStr.replace(/\D/g, "");
      const isPurelyNumeric = /^[\d.\-\s]+$/.test(searchQueryStr.trim());

      paramCount++;
      const ftsParam = paramCount;
      values.push(normalizedQuery);

      if (isPurelyNumeric && normalizedDigits.length > 0) {
        paramCount++;
        const numericParam = paramCount;
        conditions.push(
          `(doc.search_vector @@ plainto_tsquery('spanish', $${ftsParam}) OR doc.motivo ILIKE $${numericParam})`,
        );
        values.push(`%${normalizedDigits}%`);
      } else {
        conditions.push(`doc.search_vector @@ plainto_tsquery('spanish', $${ftsParam})`);
      }
    }

    if (startDateFilter) {
      paramCount++;
      conditions.push(`doc.fechacreacion >= $${paramCount}::timestamp`);
      values.push(startDateFilter);
    }

    if (endDateFilter) {
      paramCount++;
      conditions.push(`doc.fechacreacion < $${paramCount}::timestamp + interval '1 day'`);
      values.push(endDateFilter);
    }

    if (reparticionesFilter.length > 0) {
      const reparticionesPlaceholders = reparticionesFilter.map(() => {
        paramCount++;
        return `$${paramCount}`;
      }).join(", ");
      conditions.push(`doc.reparticion IN (${reparticionesPlaceholders})`);
      values.push(...reparticionesFilter);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const baseQuery = `
      SELECT
        doc.numero,
        doc.motivo,
        doc.usuariogenerador,
        doc.datos_usuario,
        doc.anio,
        doc.fechacreacion,
        doc.id,
        doc.reparticion,
        tip.nombre as tipo_documento,
        COUNT(*) OVER() as total_count,
        ${searchQueryStr ? `ts_rank(doc.search_vector, plainto_tsquery('spanish', $1)) as rank,` : ''}
        ROW_NUMBER() OVER (ORDER BY doc.fechacreacion DESC, doc.id) as rn
      FROM public.gedo_documento doc
      LEFT JOIN public.gedo_tipodocumento tip ON doc.tipo = tip.id
      ${whereClause}
      GROUP BY doc.id, doc.numero, doc.motivo, doc.usuariogenerador, doc.datos_usuario, doc.anio, doc.fechacreacion, doc.reparticion, tip.nombre
      ${searchQueryStr ? ', doc.search_vector' : ''}
    `;

    const query = {
      text: `${baseQuery}
        ORDER BY ${searchQueryStr ? 'rank DESC, ' : ''}doc.fechacreacion DESC, doc.id
        LIMIT $${++paramCount}
        OFFSET $${++paramCount}
      `,
      values: [...values, itemsCount, offset],
    };

    const result = await pool.query(query);

    const data: OrdenCompraResult[] = result.rows.map(row => ({
      numero: row.numero,
      motivo: row.motivo,
      usuariogenerador: row.usuariogenerador,
      datos_usuario: row.datos_usuario,
      anio: row.anio,
      fechacreacion: row.fechacreacion,
      total_count: row.total_count?.toString() || '0',
      tipo_documento: row.tipo_documento || 'Sin tipo',
      reparticion: row.reparticion || '',
      rank: row.rank,
    }));

    const totalCount = data.length > 0 ? parseInt(data[0].total_count) : 0;
    const totalPages = Math.ceil(totalCount / itemsCount);
    const hasNextPage = pageNumber < totalPages;
    const hasPreviousPage = pageNumber > 1;

    const response: OrdenCompraDocResponse = {
      data,
      pagination: {
        currentPage: pageNumber,
        totalPages,
        totalCount,
        itemsPerPage: itemsCount,
        hasNextPage,
        hasPreviousPage,
      },
    };

    res.status(200).json(response);

  } catch (error) {
    console.error("PostgreSQL database error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
