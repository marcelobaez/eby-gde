const oracledb = require("oracledb");
import { NextApiRequest, NextApiResponse } from "next";

export default async function lastMovHandler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  let connection;
  let { expId } = req.query;

  try {
    oracledb.initOracleClient();
    connection = await oracledb.getConnection({
      user: process.env.NODE_ORACLEDB_USER,
      password: process.env.NODE_ORACLEDB_PASSWORD,
      connectString: process.env.NODE_ORACLEDB_CONNECTIONSTRING,
    });

    const sql = `select mov.id from ee_ged.historialoperacion mov 
    INNER JOIN ee_ged.ee_expediente_electronico ee ON ee.id = mov.id_expediente
    where id_expediente = ${expId}
    order by ord_hist desc
    FETCH FIRST 1 ROWS ONLY`;

    const result = await connection.execute(sql, [], {
      outFormat: oracledb.OUT_FORMAT_OBJECT,
    });

    if (result.rows && result.rows.length > 0) {
      res.status(200).json({ lastMovId: result.rows[0].ID });
    } else {
      res.status(404).json({ error: "No movements found for this expediente" });
    }
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