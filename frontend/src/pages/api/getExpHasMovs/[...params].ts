const oracledb = require("oracledb");
import { NextApiRequest, NextApiResponse } from "next";

export default async function hasMovsHandler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  let connection;
  const { params } = req.query;

  // Extract parameters: params[0] = expediente_id, params[1] = last_mov_id
  const expedienteId = params?.[0];
  const lastMovId = params?.[1];

  if (!expedienteId || !lastMovId) {
    return res.status(400).json({
      error: "Missing required parameters: expediente_id and last_mov_id",
    });
  }

  try {
    oracledb.initOracleClient();
    connection = await oracledb.getConnection({
      user: process.env.NODE_ORACLEDB_USER,
      password: process.env.NODE_ORACLEDB_PASSWORD,
      connectString: process.env.NODE_ORACLEDB_CONNECTIONSTRING,
    });

    const sql = `select mov.id as id_mov, ee.descripcion, mov.id_expediente as exp_id, ee.tipo_documento || '-' || ee.anio || '-' || ee.numero || '--' || ee.codigo_reparticion_actuacion || '-MENT' as codigo from ee_ged.historialoperacion mov
    INNER JOIN ee_ged.ee_expediente_electronico ee ON ee.id = mov.id_expediente
    where mov.id_expediente = ${expedienteId} AND mov.id > ${lastMovId}
    order by ord_hist desc`;

    const result = await connection.execute(sql, [], {
      outFormat: oracledb.OUT_FORMAT_OBJECT,
    });

    const hasMovs = result.rows && result.rows.length > 0;
    const count = result.rows ? result.rows.length : 0;
    const lastId = hasMovs ? result.rows[0].ID_MOV : null;
    const codigo = hasMovs ? result.rows[0].CODIGO : null;
    const exp_id = hasMovs ? result.rows[0].EXP_ID : null;
    const descripcion = hasMovs ? result.rows[0].DESCRIPCION : null;

    res
      .status(200)
      .json({ hasMovs, count, lastId, codigo, exp_id, descripcion });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
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
