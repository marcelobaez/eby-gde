const oracledb = require("oracledb");

export default async function handler(req, res) {
  let connection;
  let ids = req.query["expIds[]"];

  if (Array.isArray(ids)) {
    ids = ids.join(" ,");
  }

  try {
    connection = await oracledb.getConnection({
      user: process.env.NODE_ORACLEDB_USER,
      password: process.env.NODE_ORACLEDB_PASSWORD,
      connectString: process.env.NODE_ORACLEDB_CONNECTIONSTRING,
    });

    const sql = `select * from ee_ged.ee_expediente_electronico
    where id in (${ids})`;

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
