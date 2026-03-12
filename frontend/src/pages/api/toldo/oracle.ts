const oracledb = require("oracledb");
import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]";
import { canAccessMesas, canSearchDocsAll } from "@/utils/featureGuards";
import {
  validatePageNumber,
  validatePageSize,
} from "@/utils/queryValidation";
import { validateDateParam } from "@/utils/api-validation";
import {
  ToldoDocResult,
  ToldoDocResponse,
  ToldoStats,
  ToldoDocTypeStats,
} from "./index";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: `Method ${req.method} not allowed.` });
  }

  let connection;

  try {
    const session = await getServerSession(req, res, authOptions);

    if (!session) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const canAccess = canAccessMesas(session.role);
    if (!canAccess) {
      return res.status(401).json({ error: "Unauthorized" });
    }

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

    // Initialize Oracle client and get connection
    oracledb.initOracleClient();
    connection = await oracledb.getConnection({
      user: process.env.NODE_ORACLEDB_USER,
      password: process.env.NODE_ORACLEDB_PASSWORD,
      connectString: process.env.NODE_ORACLEDB_CONNECTIONSTRING,
    });

    // Build dynamic WHERE conditions for base query
    const baseConditions: string[] = [
      "doc.numero NOT LIKE 'PV-%'",
      "doc.reparticion = 'MENT'"
    ];

    if (startDateFilter) {
      const formattedDate = startDateFilter.split('T')[0];
      baseConditions.push(`doc.fechacreacion >= TO_DATE('${formattedDate}', 'YYYY-MM-DD')`);
    }

    if (endDateFilter) {
      const formattedDate = endDateFilter.split('T')[0];
      baseConditions.push(`doc.fechacreacion < TO_DATE('${formattedDate}', 'YYYY-MM-DD') + INTERVAL '1' DAY`);
    }

    // Build conditions for different queries
    const conditions = [...baseConditions];

    // Add usuarios filter first (before tipos)
    if (usuariosFilter.length > 0) {
      const usuariosPlaceholders = usuariosFilter.map((u) => `'${u}'`).join(", ");
      conditions.push(`doc.usuariogenerador IN (${usuariosPlaceholders})`);
    }

    // Capture conditions with usuarios but without tipos (for doc type stats)
    const conditionsWithUsuarios = [...conditions];

    if (tiposFilter.length > 0) {
      const tiposPlaceholders = tiposFilter.map((t) => `'${t}'`).join(", ");
      conditions.push(`tip.nombre IN (${tiposPlaceholders})`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const whereClauseWithUsuarios = conditionsWithUsuarios.length > 0 ? `WHERE ${conditionsWithUsuarios.join(' AND ')}` : '';

    // Build confidential filter
    const confidentialFilter = canSearchDocsAll(session.role) ? '' : "AND tip.esconfidencial != '1'";

    // Main query for documents - Oracle version using ROW_NUMBER for pagination
    // Using nested query to handle DISTINCT for expediente IDs (Oracle LISTAGG doesn't support DISTINCT)
    // Note: ee_expediente_documentos uses 'id' column for expediente FK, not 'id_expediente'
    const baseQuery = `
      SELECT * FROM (
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
          LISTAGG(
            exp.tipo_documento || '-' || exp.anio || '-' || exp.numero || '-' ||
            exp.codigo_reparticion_actuacion || '-' || exp.codigo_reparticion_usuario,
            ', '
          ) WITHIN GROUP (ORDER BY exp.tipo_documento, exp.anio, exp.numero) as expedientes_asociados,
          (
            SELECT LISTAGG(distinct_exp_id, ', ') WITHIN GROUP (ORDER BY distinct_exp_id)
            FROM (
              SELECT DISTINCT exp2.id as distinct_exp_id
              FROM ee_ged.documento EDOC2
              LEFT JOIN ee_ged.ee_expediente_documentos red2 ON EDOC2.id = red2.id_documento
              LEFT JOIN ee_ged.ee_expediente_electronico exp2 ON red2.id = exp2.id
              WHERE EDOC2.NUMERO_SADE = doc.numero
              AND exp2.id IS NOT NULL
            )
          ) as expedientes_ids,
          ROW_NUMBER() OVER (ORDER BY doc.fechacreacion DESC, doc.id) as rn
        FROM gedo_ged.gedo_documento doc
        LEFT JOIN gedo_ged.gedo_tipodocumento tip ON doc.tipo = tip.id
        LEFT JOIN ee_ged.documento EDOC ON doc.numero = EDOC.NUMERO_SADE
        LEFT JOIN ee_ged.ee_expediente_documentos red ON EDOC.id = red.id_documento
        LEFT JOIN ee_ged.ee_expediente_electronico exp ON red.id = exp.id
        ${whereClause}
        ${confidentialFilter}
        GROUP BY doc.id, doc.numero, doc.motivo, doc.usuariogenerador, doc.datos_usuario, doc.anio, doc.fechacreacion, tip.esconfidencial, tip.nombre
      )
      WHERE rn > ${offset} AND rn <= ${offset + itemsCount}
    `;

    const result = await connection.execute(baseQuery, [], {
      outFormat: oracledb.OUT_FORMAT_OBJECT,
    });

    const rows = result.rows as any[];

    // Stats query for percentage calculation (WITH tipos filter)
    const filteredStatsQuery = `
      SELECT
        COUNT(*) as total_docs,
        SUM(CASE WHEN exp_count > 0 THEN 1 ELSE 0 END) as docs_with_expediente
      FROM (
        SELECT
          doc.id,
          COUNT(DISTINCT exp.id) as exp_count
        FROM gedo_ged.gedo_documento doc
        LEFT JOIN gedo_ged.gedo_tipodocumento tip ON doc.tipo = tip.id
        LEFT JOIN ee_ged.documento EDOC ON doc.numero = EDOC.NUMERO_SADE
        LEFT JOIN ee_ged.ee_expediente_documentos red ON EDOC.id = red.id_documento
        LEFT JOIN ee_ged.ee_expediente_electronico exp ON red.id = exp.id
        ${whereClause}
        ${confidentialFilter}
        GROUP BY doc.id
      )
    `;

    // Doc type stats query (WITHOUT tipos filter so all types show in UI)
    const docTypeStatsQuery = `
      SELECT
        tip.nombre as tipo_documento,
        COUNT(*) as count
      FROM gedo_ged.gedo_documento doc
      LEFT JOIN gedo_ged.gedo_tipodocumento tip ON doc.tipo = tip.id
      ${whereClauseWithUsuarios}
      ${confidentialFilter}
      GROUP BY tip.nombre
      ORDER BY count DESC
    `;

    // Run stats queries
    const [filteredStatsResult, docTypeStatsResult] = await Promise.all([
      connection.execute(filteredStatsQuery, [], {
        outFormat: oracledb.OUT_FORMAT_OBJECT,
      }),
      connection.execute(docTypeStatsQuery, [], {
        outFormat: oracledb.OUT_FORMAT_OBJECT,
      }),
    ]);

    // Process main results
    const data: ToldoDocResult[] = rows.map(row => ({
      numero: row.NUMERO,
      motivo: row.MOTIVO,
      usuariogenerador: row.USUARIOGENERADOR,
      datos_usuario: row.DATOS_USUARIO,
      anio: row.ANIO,
      fechacreacion: row.FECHACREACION,
      total_count: row.TOTAL_COUNT?.toString() || '0',
      total_expedientes: parseInt(row.TOTAL_EXPEDIENTES?.toString() || '0'),
      tipo_documento: row.TIPO_DOCUMENTO || 'Sin tipo',
      expedientes_asociados: row.EXPEDIENTES_ASOCIADOS || null,
      expedientes_ids: row.EXPEDIENTES_IDS || null,
    }));

    // Calculate pagination info
    const totalCount = data.length > 0 ? parseInt(data[0].total_count) : 0;
    const totalPages = Math.ceil(totalCount / itemsCount);
    const hasNextPage = pageNumber < totalPages;
    const hasPreviousPage = pageNumber > 1;

    // Process stats results
    const statsRows = filteredStatsResult.rows as any[];
    const totalDocs = parseInt(statsRows[0]?.TOTAL_DOCS?.toString() || '0');
    const docsWithExpediente = parseInt(statsRows[0]?.DOCS_WITH_EXPEDIENTE?.toString() || '0');
    const percentageWithExpediente = totalDocs > 0
      ? Math.round((docsWithExpediente / totalDocs) * 100)
      : 0;

    const docTypeRows = docTypeStatsResult.rows as any[];
    const docTypeStats: ToldoDocTypeStats[] = docTypeRows.map(row => ({
      tipo_documento: row.TIPO_DOCUMENTO || 'Sin tipo',
      count: parseInt(row.COUNT?.toString() || '0'),
    }));

    const response: ToldoDocResponse = {
      data,
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

    res.status(200).json(response);

  } catch (error) {
    console.error("Oracle database error:", error);
    res.status(500).json({ error: "Internal server error" });
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (err) {
        console.error("Error closing Oracle connection:", err);
      }
    }
  }
}
