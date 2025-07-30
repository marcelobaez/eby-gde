const oracledb = require("oracledb");
import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]";

export type SignedDocumentResult = {
  id: number;
  numero: string;
  motivo: string;
  tipo_documento: string;
  fechacreacion: string;
  total_count: string;
};

export interface SignedDocumentsResponse {
  data: SignedDocumentResult[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalCount: number;
    itemsPerPage: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}


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
    
    if (!session || !session.user?.email) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Extract username from email (remove @ and everything after, then uppercase)
    const username = session.user.email.split('@')[0].toUpperCase();

    // Extract query parameters
    const { page, pageSize, startDate, endDate } = req.query;

    // Validate and set defaults
    const pageNumber = parseInt(page as string, 10) || 1;
    const itemsCount = parseInt(pageSize as string, 10) || 15;

    if (pageNumber < 1 || itemsCount < 1 || itemsCount > 100) {
      return res.status(400).json({ error: "Invalid pagination parameters" });
    }

    const offset = (pageNumber - 1) * itemsCount;

    // Default to last month if no date range provided
    const defaultEndDate = new Date();
    const defaultStartDate = new Date();
    defaultStartDate.setMonth(defaultStartDate.getMonth() - 1);

    const filterStartDate = startDate ? new Date(startDate as string) : defaultStartDate;
    const filterEndDate = endDate ? new Date(endDate as string) : defaultEndDate;

    // Validate dates
    if (isNaN(filterStartDate.getTime()) || isNaN(filterEndDate.getTime())) {
      return res.status(400).json({ error: "Invalid date format" });
    }

    if (filterStartDate > filterEndDate) {
      return res.status(400).json({ error: "Start date must be before end date" });
    }

    // Initialize Oracle client and get connection
    oracledb.initOracleClient();
    connection = await oracledb.getConnection({
      user: process.env.NODE_ORACLEDB_USER,
      password: process.env.NODE_ORACLEDB_PASSWORD,
      connectString: process.env.NODE_ORACLEDB_CONNECTIONSTRING,
    });

    // Build the Oracle query with pagination and date filtering
    const sql = `
      SELECT * FROM (
        SELECT 
          d.id,
          d.numero,
          d.motivo,
          d.fechacreacion,
          tip.nombre as tipo_documento,
          COUNT(*) OVER() as total_count,
          ROW_NUMBER() OVER (ORDER BY d.fechacreacion DESC) as rn
        FROM gedo_ged.gedo_documento d 
        INNER JOIN gedo_ged.gedo_firmantes f ON f.workflowid = d.workfloworigen 
        INNER JOIN gedo_ged.gedo_tipodocumento tip ON d.tipo = tip.id
        WHERE f.USUARIOFIRMANTE = '${username}'
          AND d.fechacreacion >= TO_DATE('${filterStartDate.toISOString().split('T')[0]}', 'YYYY-MM-DD')
          AND d.fechacreacion <= TO_DATE('${filterEndDate.toISOString().split('T')[0]}', 'YYYY-MM-DD')
      ) 
      WHERE rn > ${offset} AND rn <= ${offset + itemsCount}
    `;

    const result = await connection.execute(sql, [], {
      outFormat: oracledb.OUT_FORMAT_OBJECT,
    });

    const rows = result.rows as any[];
    
    // Process results with object format
    const data: SignedDocumentResult[] = rows.map(row => ({
      id: row.ID,
      numero: row.NUMERO,
      motivo: row.MOTIVO,
      fechacreacion: row.FECHACREACION,
      total_count: row.TOTAL_COUNT?.toString() || '0',
      tipo_documento: row.TIPO_DOCUMENTO
    }));

    // Calculate pagination info
    const totalCount = data.length > 0 ? parseInt(data[0].total_count) : 0;
    const totalPages = Math.ceil(totalCount / itemsCount);
    const hasNextPage = pageNumber < totalPages;
    const hasPreviousPage = pageNumber > 1;

    const response: SignedDocumentsResponse = {
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
    console.error('Database error:', error);
    res.status(500).json({ error: "Internal server error" });
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (err) {
        console.error('Error closing connection:', err);
      }
    }
  }
}