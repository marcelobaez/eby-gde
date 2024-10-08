const oracledb = require("oracledb");
import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  let connection;

  try {
    oracledb.initOracleClient();
    connection = await oracledb.getConnection({
      user: process.env.NODE_ORACLEDB_USER,
      password: process.env.NODE_ORACLEDB_PASSWORD,
      connectString: process.env.NODE_ORACLEDB_CONNECTIONSTRING,
    });

    const { year: anio, number: numero } = req.query;

    const sql = `SELECT id, descripcion, tipo_documento || '-' || anio || '-' || numero || '--' || codigo_reparticion_actuacion || '-MENT' as codigo, estado, fecha_creacion
    FROM EE_GED.EE_EXPEDIENTE_ELECTRONICO
    WHERE ANIO = :anio
    AND NUMERO = :numero
    FETCH FIRST 1 ROWS ONLY
    `;

    const result = await connection.execute(sql, [anio, numero], {
      maxRows: 1,
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
