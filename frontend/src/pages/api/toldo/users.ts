const oracledb = require("oracledb");
import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]";
import { canSearchDocs } from "@/utils/featureGuards";

// Location mapping: ID_SECTOR_INTERNO -> location code
const LOCATION_MAP: Record<number, string> = {
  100299711: "ITU", // Ituzaingo
  100299710: "POS", // Posadas
  100299709: "BUE", // Buenos Aires
};

export type UserByLocation = {
  nombre_usuario: string;
  location: string;
};

export interface UsersByLocationResponse {
  ITU: string[];
  POS: string[];
  BUE: string[];
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

    if (!session) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const canAccess = canSearchDocs(session.role);
    if (!canAccess) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Initialize Oracle client and get connection
    oracledb.initOracleClient();
    connection = await oracledb.getConnection({
      user: process.env.NODE_ORACLEDB_USER,
      password: process.env.NODE_ORACLEDB_PASSWORD,
      connectString: process.env.NODE_ORACLEDB_CONNECTIONSTRING,
    });

    // Query to get users grouped by location
    const sql = `
      SELECT NOM.NOMBRE_USUARIO, NOM.ID_SECTOR_INTERNO
      FROM (
        SELECT NOMBRE_USUARIO, CODIGO_REPARTICION, ID_SECTOR_INTERNO
        FROM (
          SELECT NOMBRE_USUARIO, CODIGO_REPARTICION, ID_SECTOR_INTERNO
          FROM (
            SELECT ID_REPARTICION, NOMBRE_USUARIO, ID_SECTOR_INTERNO
            FROM track_ged.SADE_USR_REPA_HABILITADA
            UNION
            SELECT ID_REPARTICION, NOMBRE_USUARIO, ID_SECTOR_INTERNO
            FROM "TRACK_GED"."SADE_REPARTICION_SELECCIONADA"
          ) RP
          INNER JOIN track_ged.sade_REPARTICION R ON RP.ID_REPARTICION = R.ID_REPARTICION
          ORDER BY NOMBRE_USUARIO
        )
        UNION
        (
          SELECT USUARIO AS NOMBRE_USUARIO, R.CODIGO_REPARTICION, S.ID_SECTOR_INTERNO
          FROM co_ged.datos_usuario U
          INNER JOIN track_ged.SADE_SECTOR_INTERNO S ON S.ID_sector_interno = U.ID_sector_interno
          INNER JOIN track_ged.sade_REPARTICION R ON S.codigo_reparticion = R.id_reparticion
        )
        ORDER BY NOMBRE_USUARIO
      ) NOM
      INNER JOIN co_ged.datos_usuario US ON NOM.NOMBRE_USUARIO = US.USUARIO
      WHERE NOM.CODIGO_REPARTICION = 'MENT'
        AND NOM.ID_SECTOR_INTERNO IN (100299711, 100299710, 100299709)
    `;

    const result = await connection.execute(sql, [], {
      outFormat: oracledb.OUT_FORMAT_OBJECT,
    });

    const rows = result.rows as any[];

    // Group users by location
    const usersByLocation: UsersByLocationResponse = {
      ITU: [],
      POS: [],
      BUE: [],
    };

    rows.forEach((row) => {
      const location = LOCATION_MAP[row.ID_SECTOR_INTERNO];
      const username = row.NOMBRE_USUARIO;
      if (location && username && !usersByLocation[location as keyof UsersByLocationResponse].includes(username)) {
        usersByLocation[location as keyof UsersByLocationResponse].push(username);
      }
    });

    res.status(200).json(usersByLocation);
  } catch (error) {
    console.error("Database error:", error);
    res.status(500).json({ error: "Internal server error" });
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (err) {
        console.error("Error closing connection:", err);
      }
    }
  }
}
