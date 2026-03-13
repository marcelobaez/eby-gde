import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { Pool } from "pg";
import { authOptions } from "../../auth/[...nextauth]";
import { canAccessOrdenesCompra } from "@/utils/featureGuards";
import {
  validatePageNumber,
  validatePageSize,
} from "@/utils/queryValidation";

export type OrdenCompraDBResult = {
  oc: string;
  id_empresa: string;
  descripcion: string;
  dtipodoc: string;
  dmodalidadcompra: string;
  nnumeroconcurso: string;
  dsede: string;
  destado: string;
  fecha_estado: string;
  dnombre_empresa: string;
  dsdc: string;
  nexpediente: string;
  ffechaemision: string;
  ncosto: string;
  dmoneda: string;
  ncostobase: string;
  ffechaenvioprov: string;
  despecialidad: string;
};

export interface OrdenCompraDBResponse {
  data: OrdenCompraDBResult[];
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

function validateStringParam(
  value: unknown,
  paramName: string,
  maxLength: number = 100
): { isValid: boolean; value: string | null; error?: string } {
  if (value === undefined || value === null || value === "") {
    return { isValid: true, value: null };
  }

  if (typeof value !== "string") {
    return { isValid: false, value: null, error: `${paramName} must be a string` };
  }

  if (value.length > maxLength) {
    return { isValid: false, value: null, error: `${paramName} exceeds maximum length of ${maxLength}` };
  }

  const validPattern = /^[a-zA-Z0-9\s\-_\.\(\)áéíóúÁÉÍÓÚñÑ]+$/;
  if (!validPattern.test(value)) {
    return { isValid: false, value: null, error: `${paramName} contains invalid characters` };
  }

  return { isValid: true, value: value };
}

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

    const { 
      oc, 
      descripcion, 
      nnumeroconcurso, 
      dnombre_empresa, 
      nexpediente,
      page, 
      pageSize 
    } = req.query;

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

    const ocValidation = validateStringParam(oc, "oc", 20);
    if (!ocValidation.isValid) {
      return res.status(400).json({ error: ocValidation.error });
    }
    const ocFilter = ocValidation.value;

    const descripcionValidation = validateStringParam(descripcion, "descripcion", 400);
    if (!descripcionValidation.isValid) {
      return res.status(400).json({ error: descripcionValidation.error });
    }
    const descripcionFilter = descripcionValidation.value;

    const nnumeroconcursoValidation = validateStringParam(nnumeroconcurso, "nnumeroconcurso", 10);
    if (!nnumeroconcursoValidation.isValid) {
      return res.status(400).json({ error: nnumeroconcursoValidation.error });
    }
    const nnumeroconcursoFilter = nnumeroconcursoValidation.value;

    const dnombre_empresaValidation = validateStringParam(dnombre_empresa, "dnombre_empresa", 120);
    if (!dnombre_empresaValidation.isValid) {
      return res.status(400).json({ error: dnombre_empresaValidation.error });
    }
    const dnombre_empresaFilter = dnombre_empresaValidation.value;

    const nexpedienteValidation = validateStringParam(nexpediente, "nexpediente", 30);
    if (!nexpedienteValidation.isValid) {
      return res.status(400).json({ error: nexpedienteValidation.error });
    }
    const nexpedienteFilter = nexpedienteValidation.value;

    const hasFilters = ocFilter || descripcionFilter || nnumeroconcursoFilter || dnombre_empresaFilter || nexpedienteFilter;

    if (!hasFilters) {
      return res.status(200).json({
        data: [],
        pagination: {
          currentPage: 1,
          totalPages: 0,
          totalCount: 0,
          itemsPerPage: itemsCount,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      });
    }

    const offset = (pageNumber - 1) * itemsCount;
    let paramCount = 0;

    const conditions: string[] = [];
    const values: (string | number)[] = [];

    if (ocFilter) {
      paramCount++;
      conditions.push(`oc ILIKE $${paramCount}`);
      values.push(`%${ocFilter}%`);
    }

    if (descripcionFilter) {
      paramCount++;
      conditions.push(`descripcion ILIKE $${paramCount}`);
      values.push(`%${descripcionFilter}%`);
    }

    if (nnumeroconcursoFilter) {
      paramCount++;
      conditions.push(`nnumeroconcurso ILIKE $${paramCount}`);
      values.push(`%${nnumeroconcursoFilter}%`);
    }

    if (dnombre_empresaFilter) {
      paramCount++;
      conditions.push(`dnombre_empresa ILIKE $${paramCount}`);
      values.push(`%${dnombre_empresaFilter}%`);
    }

    if (nexpedienteFilter) {
      paramCount++;
      conditions.push(`nexpediente ILIKE $${paramCount}`);
      values.push(`%${nexpedienteFilter}%`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const baseQuery = `
      SELECT
        oc,
        id_empresa,
        descripcion,
        dtipodoc,
        dmodalidadcompra,
        nnumeroconcurso,
        dsede,
        destado,
        fecha_estado,
        dnombre_empresa,
        dsdc,
        nexpediente,
        ffechaemision,
        ncosto,
        dmoneda,
        ncostobase,
        ffechaenvioprov,
        despecialidad,
        COUNT(*) OVER() as total_count
      FROM public.ordenes_compra
      ${whereClause}
    `;

    const query = {
      text: `${baseQuery}
        ORDER BY oc
        LIMIT $${++paramCount}
        OFFSET $${++paramCount}
      `,
      values: [...values, itemsCount, offset],
    };

    const result = await pool.query<OrdenCompraDBResult & { total_count: string }>(query);

    const data: OrdenCompraDBResult[] = result.rows.map(row => ({
      oc: row.oc,
      id_empresa: row.id_empresa,
      descripcion: row.descripcion,
      dtipodoc: row.dtipodoc,
      dmodalidadcompra: row.dmodalidadcompra,
      nnumeroconcurso: row.nnumeroconcurso,
      dsede: row.dsede,
      destado: row.destado,
      fecha_estado: row.fecha_estado,
      dnombre_empresa: row.dnombre_empresa,
      dsdc: row.dsdc,
      nexpediente: row.nexpediente,
      ffechaemision: row.ffechaemision,
      ncosto: row.ncosto,
      dmoneda: row.dmoneda,
      ncostobase: row.ncostobase,
      ffechaenvioprov: row.ffechaenvioprov,
      despecialidad: row.despecialidad,
    }));

    const totalCount = result.rows.length > 0 ? parseInt(result.rows[0].total_count) : 0;
    const totalPages = Math.ceil(totalCount / itemsCount);
    const hasNextPage = pageNumber < totalPages;
    const hasPreviousPage = pageNumber > 1;

    const response: OrdenCompraDBResponse = {
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
