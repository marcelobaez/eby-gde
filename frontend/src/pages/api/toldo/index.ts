import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { Pool } from "pg";
import { authOptions } from "../auth/[...nextauth]";
import { canAccessMesas, canSearchDocsAll } from "@/utils/featureGuards";
import {
  validatePageNumber,
  validatePageSize,
} from "@/utils/queryValidation";
import { validateDateParam } from "@/utils/api-validation";

export type ToldoDocResult = {
  numero: string;
  motivo: string;
  usuariogenerador: string;
  datos_usuario: string;
  anio: number;
  fechacreacion: string;
  total_count: string;
  total_expedientes: number;
  tipo_documento: string;
  expedientes_asociados: string | null;
  expedientes_ids: string | null;
};

export interface ToldoDocTypeStats {
  tipo_documento: string;
  count: number;
}

export interface ToldoStats {
  totalDocs: number;
  docsWithExpediente: number;
  percentageWithExpediente: number;
  docTypeStats: ToldoDocTypeStats[];
}

export interface ToldoDocResponse {
  data: ToldoDocResult[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalCount: number;
    itemsPerPage: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
  stats: ToldoStats;
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
      const canAccess = canAccessMesas(session.role);

      if (!canAccess) {
        return res.status(401).end();
      } else {
        // Extract query parameters
        const { page, pageSize, startDate, endDate, tipos, usuarios } = req.query;

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

        // Validate tipos parameter (comma-separated document types)
        let tiposFilter: string[] = [];
        if (tipos && typeof tipos === "string" && tipos.trim() !== "") {
          // Sanitize: allow alphanumeric, spaces, hyphens, underscores, periods, parentheses, accented chars
          const tiposArray = tipos.split(",").map((t) => t.trim()).filter(Boolean);
          const validPattern = /^[a-zA-Z0-9\s\-_\.\(\)áéíóúÁÉÍÓÚñÑ]+$/;
          for (const tipo of tiposArray) {
            if (!validPattern.test(tipo) || tipo.length > 150) {
              return res.status(400).json({ error: "Invalid document type filter" });
            }
          }
          tiposFilter = tiposArray;
        }

        // Validate usuarios parameter (comma-separated usernames for location filter)
        let usuariosFilter: string[] = [];
        if (usuarios && typeof usuarios === "string" && usuarios.trim() !== "") {
          // Sanitize: only allow alphanumeric characters (usernames)
          const usuariosArray = usuarios.split(",").map((u) => u.trim()).filter(Boolean);
          const validPattern = /^[a-zA-Z0-9_]+$/;
          for (const usuario of usuariosArray) {
            if (!validPattern.test(usuario) || usuario.length > 50) {
              return res.status(400).json({ error: "Invalid user filter" });
            }
          }
          usuariosFilter = usuariosArray;
        }

        const offset = (pageNumber - 1) * itemsCount;
        let paramCount = 2; // Start after LIMIT and OFFSET params

        // Build dynamic WHERE conditions (base conditions without tipos filter for stats)
        const baseConditions: string[] = [
          "doc.numero NOT LIKE 'PV-%'",
          "doc.reparticion = 'MENT'"
        ];
        const baseValues: (string | number)[] = [];

        if (startDateFilter) {
          paramCount++;
          baseConditions.push(`doc.fechacreacion >= $${paramCount}::timestamp`);
          baseValues.push(startDateFilter);
        }

        if (endDateFilter) {
          paramCount++;
          // Use < instead of <= to exclude midnight of the next day (timezone boundary)
          baseConditions.push(`doc.fechacreacion < $${paramCount}::timestamp + interval '1 day'`);
          baseValues.push(endDateFilter);
        }

        // Build conditions in stages:
        // 1. baseConditions: date filters only
        // 2. conditionsWithUsuarios: base + usuarios (for doc type stats - shows all types but filtered by location)
        // 3. conditions: base + usuarios + tipos (for main query and percentage stats)

        // Full conditions including all filters (for main data query)
        const conditions = [...baseConditions];
        const values: (string | number)[] = [itemsCount, offset, ...baseValues];

        // Add usuarios filter first (before tipos)
        if (usuariosFilter.length > 0) {
          const usuariosPlaceholders = usuariosFilter.map(() => {
            paramCount++;
            return `$${paramCount}`;
          }).join(", ");
          conditions.push(`doc.usuariogenerador IN (${usuariosPlaceholders})`);
          values.push(...usuariosFilter);
        }

        // Capture conditions with usuarios but without tipos (for doc type stats)
        const conditionsWithUsuarios = [...conditions];
        const valuesWithUsuarios = [...baseValues, ...usuariosFilter];

        if (tiposFilter.length > 0) {
          const tiposPlaceholders = tiposFilter.map(() => {
            paramCount++;
            return `$${paramCount}`;
          }).join(", ");
          conditions.push(`tip.nombre IN (${tiposPlaceholders})`);
          values.push(...tiposFilter);
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

        // Base query for documents - similar to gdesearchdocs but without FTS
        const baseQuery = `
          SELECT
            doc.numero,
            doc.motivo,
            doc.usuariogenerador,
            doc.datos_usuario,
            doc.anio,
            doc.fechacreacion,
            doc.id,
            tip.esconfidencial,
            tip.nombre as tipo_documento,
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
          LEFT JOIN ee_expediente_documentos_new red ON EDOC.id = red.id_documento
          LEFT JOIN EE_EXPEDIENTE_ELECTRONICO exp ON red.id = exp.id
          ${whereClause}
          GROUP BY doc.id, doc.numero, doc.motivo, doc.usuariogenerador, doc.datos_usuario, doc.anio, doc.fechacreacion, tip.esconfidencial, tip.nombre
        `;

        const queryNoRestrict = {
          text: `${baseQuery}
            ORDER BY doc.fechacreacion DESC, doc.id
            LIMIT $1
            OFFSET $2
          `,
          values: values,
        };

        const queryRestrictedText = baseQuery.replace(
          'GROUP BY',
          `AND tip.esconfidencial != '1'\n          GROUP BY`
        );

        const queryRestricted = {
          text: `${queryRestrictedText}
            ORDER BY doc.fechacreacion DESC, doc.id
            LIMIT $1
            OFFSET $2
          `,
          values: values,
        };

        const result = await pool.query(canSearchDocsAll(session.role) ? queryNoRestrict : queryRestricted);

        // Calculate pagination info
        const totalCount = parseInt(result.rows[0]?.total_count as string) || 0;
        const totalPages = Math.ceil(totalCount / itemsCount);
        const hasNextPage = pageNumber < totalPages;
        const hasPreviousPage = pageNumber > 1;

        // Build stats query for doc types - use conditions WITH usuarios but WITHOUT tipos filter
        // so all document types are shown for filtering UI, but filtered by location
        let statsParamCount = 0;
        const statsConditions = conditionsWithUsuarios.map(cond => {
          // Replace $3, $4, etc with $1, $2, etc for stats query
          return cond.replace(/\$(\d+)/g, () => `$${++statsParamCount}`);
        });
        const statsWhereClauseRenumbered = statsConditions.length > 0 ? `WHERE ${statsConditions.join(' AND ')}` : '';
        const statsValues = valuesWithUsuarios;

        // Build filtered stats query - includes ALL filters for accurate percentage
        let filteredStatsParamCount = 0;
        const filteredStatsConditions = conditions.map(cond => {
          return cond.replace(/\$(\d+)/g, () => `$${++filteredStatsParamCount}`);
        });
        const filteredStatsWhereClause = filteredStatsConditions.length > 0 ? `WHERE ${filteredStatsConditions.join(' AND ')}` : '';
        // Note: order is baseValues, usuariosFilter, tiposFilter (matching condition order)
        const filteredStatsValues = [...baseValues, ...usuariosFilter, ...tiposFilter];

        // Percentage stats query (WITH tipos filter for accurate results)
        const filteredStatsQuery = canSearchDocsAll(session.role)
          ? `
            SELECT
              COUNT(*) as total_docs,
              COUNT(CASE WHEN exp_count > 0 THEN 1 END) as docs_with_expediente
            FROM (
              SELECT
                doc.id,
                COUNT(DISTINCT exp.id) as exp_count
              FROM public.gedo_documento doc
              LEFT JOIN public.gedo_tipodocumento tip ON doc.tipo = tip.id
              LEFT JOIN DOCUMENTO EDOC ON doc.numero = EDOC.NUMERO_SADE
              LEFT JOIN ee_expediente_documentos_new red ON EDOC.id = red.id_documento
              LEFT JOIN EE_EXPEDIENTE_ELECTRONICO exp ON red.id = exp.id
              ${filteredStatsWhereClause}
              GROUP BY doc.id
            ) subq
          `
          : `
            SELECT
              COUNT(*) as total_docs,
              COUNT(CASE WHEN exp_count > 0 THEN 1 END) as docs_with_expediente
            FROM (
              SELECT
                doc.id,
                COUNT(DISTINCT exp.id) as exp_count
              FROM public.gedo_documento doc
              LEFT JOIN public.gedo_tipodocumento tip ON doc.tipo = tip.id
              LEFT JOIN DOCUMENTO EDOC ON doc.numero = EDOC.NUMERO_SADE
              LEFT JOIN ee_expediente_documentos_new red ON EDOC.id = red.id_documento
              LEFT JOIN EE_EXPEDIENTE_ELECTRONICO exp ON red.id = exp.id
              ${filteredStatsWhereClause}
              AND tip.esconfidencial != '1'
              GROUP BY doc.id
            ) subq
          `;

        // Doc type stats query (WITHOUT tipos filter so all types show in UI)
        const docTypeStatsQuery = canSearchDocsAll(session.role)
          ? `
            SELECT
              tip.nombre as tipo_documento,
              COUNT(*) as count
            FROM public.gedo_documento doc
            LEFT JOIN public.gedo_tipodocumento tip ON doc.tipo = tip.id
            ${statsWhereClauseRenumbered}
            GROUP BY tip.nombre
            ORDER BY count DESC
          `
          : `
            SELECT
              tip.nombre as tipo_documento,
              COUNT(*) as count
            FROM public.gedo_documento doc
            LEFT JOIN public.gedo_tipodocumento tip ON doc.tipo = tip.id
            ${statsWhereClauseRenumbered}
            AND tip.esconfidencial != '1'
            GROUP BY tip.nombre
            ORDER BY count DESC
          `;

        // Run stats queries in parallel
        const [filteredStatsResult, docTypeStatsResult] = await Promise.all([
          pool.query(filteredStatsQuery, filteredStatsValues),
          pool.query(docTypeStatsQuery, statsValues),
        ]);

        const totalDocs = parseInt(filteredStatsResult.rows[0]?.total_docs as string) || 0;
        const docsWithExpediente = parseInt(filteredStatsResult.rows[0]?.docs_with_expediente as string) || 0;
        const percentageWithExpediente = totalDocs > 0
          ? Math.round((docsWithExpediente / totalDocs) * 100)
          : 0;

        const docTypeStats: ToldoDocTypeStats[] = docTypeStatsResult.rows.map(row => ({
          tipo_documento: row.tipo_documento || 'Sin tipo',
          count: parseInt(row.count as string) || 0,
        }));

        // Parse numeric fields that come as strings from PostgreSQL
        const parsedData = result.rows.map(row => ({
          ...row,
          total_expedientes: parseInt(row.total_expedientes as unknown as string) || 0,
        }));

        const response: ToldoDocResponse = {
          data: parsedData,
          pagination: {
            currentPage: pageNumber,
            totalPages,
            totalCount,
            itemsPerPage: itemsCount,
            hasNextPage,
            hasPreviousPage,
          },
          stats: {
            totalDocs,
            docsWithExpediente,
            percentageWithExpediente,
            docTypeStats,
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
