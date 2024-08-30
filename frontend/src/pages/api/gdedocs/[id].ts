import { NextApiRequest, NextApiResponse } from "next";

const oracledb = require("oracledb");

export default async function movsHandler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  let connection;
  let { id } = req.query;

  try {
    oracledb.initOracleClient();
    connection = await oracledb.getConnection({
      user: process.env.NODE_ORACLEDB_USER,
      password: process.env.NODE_ORACLEDB_PASSWORD,
      connectString: process.env.NODE_ORACLEDB_CONNECTIONSTRING,
    });

    const sql = `select DOC.id, DOC.motivo,DOC.Nombre_Archivo,DOC.Fecha_creacion,DOC.Fecha_asociacion, DOC.nombre, DOC.acronimo, ED.posicion from  EE_GED.ee_expediente_documentos ED 
    inner join (select D.id, D.motivo,D.Nombre_Archivo,D.Fecha_creacion,D.Fecha_asociacion, TD.nombre, TD.acronimo from EE_GED.documento D  inner join (select  acronimo,nombre from GEDO_GED.GEDO_TIPODOCUMENTO where id in(select  MAX(ID) from GEDO_GED.GEDO_TIPODOCUMENTO group by acronimo)) 
    TD on TD.ACRONIMO=D.TIPO_DOC_ACRONIMO 
    where D.id in (select id_documento from EE_GED.ee_expediente_documentos where id=${id}) ) DOC on ED.ID_documento=DOC.id order by ed.posicion desc`;

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
