import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]";
import { canDownloadDocsAll } from "@/utils/featureGuards";

const oracledb = require("oracledb");

interface DocRow {
  ID: number;
  MOTIVO: string;
  NOMBRE_ARCHIVO: string;
  NUMERO_SADE: string;
  FECHA_CREACION: string;
  FECHA_ASOCIACION: string;
  NOMBRE: string;
  ACRONIMO: string;
  POSICION: number;
  ES_RESERVADO: string;
}

export default async function movsHandler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  let connection;
  let { id } = req.query;

  const session = await getServerSession(req, res, authOptions);

  if (session) {
    try {
      oracledb.initOracleClient();
      connection = await oracledb.getConnection({
        user: process.env.NODE_ORACLEDB_USER,
        password: process.env.NODE_ORACLEDB_PASSWORD,
        connectString: process.env.NODE_ORACLEDB_CONNECTIONSTRING,
      });

      const docsSql = `select DOC.id, DOC.motivo,DOC.Nombre_Archivo,DOC.numero_sade,DOC.Fecha_creacion,DOC.Fecha_asociacion, DOC.nombre, DOC.acronimo, ED.posicion from  EE_GED.ee_expediente_documentos ED 
    inner join (select D.id, D.motivo,D.Nombre_Archivo,D.numero_sade,D.Fecha_creacion,D.Fecha_asociacion, TD.nombre, TD.acronimo from EE_GED.documento D  inner join (select  acronimo,nombre from GEDO_GED.GEDO_TIPODOCUMENTO where id in(select  MAX(ID) from GEDO_GED.GEDO_TIPODOCUMENTO group by acronimo)) 
    TD on TD.ACRONIMO=D.TIPO_DOC_ACRONIMO 
    where D.id in (select id_documento from EE_GED.ee_expediente_documentos where id=${id}) ) DOC on ED.ID_documento=DOC.id order by ed.posicion desc`;

      const reservadoSql = `select es_reservado from EE_GED.ee_expediente_electronico where id = ${id}`;

      const [docsResult, reservadoResult] = await Promise.all([
        connection.execute(docsSql, [], {
          outFormat: oracledb.OUT_FORMAT_OBJECT,
        }),
        connection.execute(reservadoSql, [], {
          outFormat: oracledb.OUT_FORMAT_OBJECT,
        }),
      ]);

      const esReservado =
        reservadoResult.rows.length > 0
          ? reservadoResult.rows[0].ES_RESERVADO === 1
          : false;

      const canDownload = canDownloadDocsAll(session?.role) || !esReservado;

      const response = docsResult.rows.map(
        (row: Omit<DocRow, "ES_RESERVADO">) => ({
          ID: row.ID,
          MOTIVO: row.MOTIVO,
          NOMBRE_ARCHIVO: row.NOMBRE_ARCHIVO,
          NUMERO_SADE: row.NUMERO_SADE,
          FECHA_CREACION: row.FECHA_CREACION,
          FECHA_ASOCIACION: row.FECHA_ASOCIACION,
          NOMBRE: row.NOMBRE,
          ACRONIMO: row.ACRONIMO,
          POSICION: row.POSICION,
          DOWNLOADABLE: canDownload,
        })
      );

      res.status(200).json(response);
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
  } else {
    res.status(401).json({ error: "Unauthorized" });
  }
}
