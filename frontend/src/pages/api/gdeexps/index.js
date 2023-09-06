const oracledb = require("oracledb");

export default async function handler(req, res) {
  let connection;
  let ids = req.query["expIds[]"];

  if (Array.isArray(ids)) {
    ids = ids.join(" ,");
  }

  try {
    oracledb.initOracleClient({ libDir: "/opt/oracle/instantclient" });
    connection = await oracledb.getConnection({
      user: process.env.NODE_ORACLEDB_USER,
      password: process.env.NODE_ORACLEDB_PASSWORD,
      connectString: process.env.NODE_ORACLEDB_CONNECTIONSTRING,
    });

    const sql = `select * from 
    (select ee.id, ee.descripcion, mov.expediente, mov.estado, ee.fecha_creacion, mov.descripcion_reparticion_destin,mov.destinatario,mov.fecha_operacion, row_number ()  
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
