const oracledb = require("oracledb");
import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Validate session or API key
  const apiKey = req.headers["x-api-key"];
  if (apiKey !== process.env.CRON_API_KEY) {
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
      return res.status(401).json({ error: "Unauthorized" });
    }
  }

  let connection;
  let ids = req.query["expIds[]"];

  if (Array.isArray(ids)) {
    ids = ids.join(" ,");
  }

  try {
    oracledb.initOracleClient();
    connection = await oracledb.getConnection({
      user: process.env.NODE_ORACLEDB_USER,
      password: process.env.NODE_ORACLEDB_PASSWORD,
      connectString: process.env.NODE_ORACLEDB_CONNECTIONSTRING,
    });

    const sql = `select * from 
    (select ee.id, ee.descripcion, ee.tipo_documento || '-' || ee.anio || '-' || ee.numero || '--' ||
            ee.codigo_reparticion_actuacion || '-' || ee.codigo_reparticion_usuario as EXPEDIENTE, mov.estado, ee.fecha_creacion, mov.descripcion_reparticion_destin,mov.destinatario,mov.fecha_operacion, row_number ()  
    over (partition by id_expediente order by ord_hist desc)
    rn from ee_ged.historialoperacion mov 
    INNER JOIN ee_ged.ee_expediente_electronico ee ON ee.id = mov.id_expediente
    where id_expediente in (${ids}) )
    where  rn = 1`;

    const result = await connection.execute(sql, [], {
      outFormat: oracledb.OUT_FORMAT_OBJECT,
    });

    res.status(200).json(result.rows);
  } catch (error) {
    console.error(error);
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (err) {
        console.error(err);
      }
    }
  }
}
