const oracledb = require("oracledb");

export default async function movsHandler(req, res) {
  let connection;
  let ids = req.query["expIds[]"];

  if (Array.isArray(ids)) {
    ids = ids.join(" ,");
  }

  try {
    oracledb.initOracleClient({ libDir: "/opt/oracle/instantclient_21_11" });
    connection = await oracledb.getConnection({
      user: process.env.NODE_ORACLEDB_USER,
      password: process.env.NODE_ORACLEDB_PASSWORD,
      connectString: process.env.NODE_ORACLEDB_CONNECTIONSTRING,
    });

    const sql = `select * from 
    (select mov.id as id_mov, ee.id, ee.descripcion, mov.expediente, mov.motivo, mov.usuario, mov.estado, ee.fecha_creacion, mov.id_expediente, mov.ord_hist,mov.descripcion_reparticion_destin,mov.destinatario,mov.fecha_operacion, row_number ()  
    over (partition by id_expediente order by ord_hist desc)
    rn from ee_ged.historialoperacion mov 
    INNER JOIN ee_ged.ee_expediente_electronico ee ON ee.id = mov.id_expediente
    where id_expediente in (${ids}) )
    where  rn<=10`;

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
