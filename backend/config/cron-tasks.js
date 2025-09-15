const axios = require("axios");
const qs = require("qs");
const { differenceInDays } = require("date-fns");
const { parseISO } = require("date-fns");

const listsReqOpts = {
  filters: {
    expedientes: {
      duracion_esperada: { $null: false }, // duracion_esperada is not null
      send_reminder: { $eq: true }, // send_reminder is true
    },
  },
  populate: {
    usuario: {
      fields: ["email"],
    },
    expedientes: {
      fields: [
        "id_expediente",
        "duracion_esperada",
        "send_reminder",
        "reminder_sent_at",
      ],
      // es necesario filtrar nuevamente la relacion para evitar que se agreguen expedientes que no cumplen con los requisitos
      filters: {
        duracion_esperada: { $null: false },
        send_reminder: { $eq: true },
      },
    },
  },
};

const GDE_EXPS_URL = process.env.FRONTEND_URL + "/api/gdeexps";
const GET_EXP_HAS_MOVS_URL = process.env.FRONTEND_URL + "/api/getExpHasMovs";

const expedientesReqOpts = {
  filters: {
    send_reminder_mov: { $eq: true },
  },
  populate: {
    usuario: {
      fields: ["email"],
    },
  },
  fields: ["id_expediente", "ult_mov_id"],
};

function getIsOverdue(initial, last, expected) {
  const elapsed = differenceInDays(parseISO(last), parseISO(initial));

  if (elapsed > expected) {
    return true;
  }
  return false;
}

module.exports = {
  sendOverdueEmail: {
    task: async ({ strapi }) => {
      try {
        console.log("cron started");
        // Obtener todas las listas con expedientes que tengan duracion_esperada y send_reminder = true
        const listas = await strapi.entityService.findMany(
          "api::lista.lista",
          listsReqOpts
        );

        if (listas.length === 0) return;

        // reduce listas to expIds (ID's sin repetir)
        const expIds = listas.reduce(
          (acc, lista) =>
            acc.concat([
              ...new Set(lista.expedientes.map((exp) => exp.id_expediente)),
            ]),
          []
        );

        // Obtener informacion de todos los expedientes desde oracle GDE (a traves de nextjs API route /api/gdeexps)
        const { data } = await axios.get(GDE_EXPS_URL, {
          params: {
            expIds,
          },
          paramsSerializer: function (params) {
            return qs.stringify(params, { arrayFormat: "brackets" });
          },
        });

        // loop through exptes and create a resulting array combined with data from oracle GDE
        const exptesWithGdeData = listas.map((list) => {
          // Map through each lista's expedientes and augment with GDE data
          const augmentedExpedientes = list.expedientes.map((expediente) => {
            const gdeExp = data.find(
              (gdeEntry) => gdeEntry.ID === Number(expediente.id_expediente)
            );
            return {
              ...expediente,
              gdeExp,
            };
          });

          // filter out expedientes that are overdue
          const overdueExpedientes = augmentedExpedientes
            .filter((expediente) => {
              return (
                getIsOverdue(
                  expediente.gdeExp.FECHA_CREACION,
                  expediente.gdeExp.FECHA_OPERACION,
                  expediente.duracion_esperada
                ) && expediente.gdeExp.ESTADO !== "Guarda Temporal"
              );
            })
            .map((exp) => ({
              ...exp,
              days_overdue:
                differenceInDays(
                  parseISO(exp.gdeExp.FECHA_OPERACION),
                  parseISO(exp.gdeExp.FECHA_CREACION)
                ) - exp.duracion_esperada,
            }));

          return {
            ...list,
            expedientes: overdueExpedientes,
          };
        });

        // determine if there are any overdue expedientes
        const hasOverdueExpedientes = exptesWithGdeData.some(
          (el) => el.expedientes.length > 0
        );

        if (!hasOverdueExpedientes) return;

        // Group lists by user email
        const listsByUser = exptesWithGdeData
          .filter((list) => list.expedientes.length > 0)
          .reduce((acc, list) => {
            const userEmail = list.usuario.email;
            if (!acc[userEmail]) {
              acc[userEmail] = {
                email: userEmail,
                lists: [],
              };
            }
            acc[userEmail].lists.push({
              name: list.titulo,
              expedientes: list.expedientes,
            });
            return acc;
          }, {});

        // Send one email per user with all their lists
        await Promise.all(
          Object.values(listsByUser).map(async (userData) => {
            await strapi
              .plugin("email-designer")
              .service("email")
              .sendTemplatedEmail(
                {
                  to: userData.email,
                  from: "expedientes@eby.org.ar",
                },
                {
                  templateReferenceId: 1,
                  subject: "Expedientes Vencidos",
                },
                {
                  lists: userData.lists,
                }
              );
          })
        ).then(() => {
          console.log("Emails sent");
        });

        // flat map of all expedientes id
        const flattenExpIds = exptesWithGdeData.flatMap((root) =>
          root.expedientes.map((item) => item.id)
        );

        // update expedientes reminder_sent_at
        await strapi.db.query("api::expediente.expediente").updateMany({
          where: {
            id: {
              $in: flattenExpIds,
            },
          },
          data: {
            reminder_sent_at: new Date(),
          },
        });
      } catch (error) {
        console.log(error);
      }
    },
    options: {
      // every tuesday at 5:00am (UTC-3)
      rule: "0 0 8 * * 1,3,5",
    },
  },
  sendNewMovEmail: {
    task: async ({ strapi }) => {
      try {
        console.log("sendNewMovEmail cron iniciado");

        // Get all expedientes with send_reminder_mov = true
        const expedientes = await strapi.entityService.findMany(
          "api::expediente.expediente",
          expedientesReqOpts
        );

        if (expedientes.length === 0) return;

        // Check each expediente for new movements
        const expedientesWithNewMovs = [];

        for (const expediente of expedientes) {
          try {
            const { data } = await axios.get(
              `${GET_EXP_HAS_MOVS_URL}/${expediente.id_expediente}/${expediente.ult_mov_id}`
            );

            if (data.hasMovs && data.count > 0) {
              expedientesWithNewMovs.push({
                ...expediente,
                newMovsCount: data.count,
                lastMovId: data.lastId,
                codigo: data.codigo,
                descripcion: data.descripcion,
              });
            }
          } catch (error) {
            console.error(
              `Error checking movements for expediente ${expediente.id_expediente}:`,
              error
            );
          }
        }

        if (expedientesWithNewMovs.length === 0) return;

        // Group expedientes by user email
        const expedientesByUser = expedientesWithNewMovs.reduce(
          (acc, expediente) => {
            const userEmail = expediente.usuario.email;
            if (!acc[userEmail]) {
              acc[userEmail] = {
                email: userEmail,
                expedientes: [],
              };
            }
            acc[userEmail].expedientes.push({
              titulo: expediente.descripcion,
              codigo: expediente.codigo,
              id_expediente: expediente.id_expediente,
              newMovsCount: expediente.newMovsCount,
              descripcion: expediente.descripcion,
            });
            return acc;
          },
          {}
        );

        // Send one email per user with all their expedientes
        await Promise.all(
          Object.values(expedientesByUser).map(async (userData) => {
            console.log(JSON.stringify(userData, null, 4));
            await strapi
              .plugin("email-designer")
              .service("email")
              .sendTemplatedEmail(
                {
                  to: userData.email,
                  from: "expedientes@eby.org.ar",
                },
                {
                  templateReferenceId: 2,
                  subject: "Nuevos Movimientos de Expedientes",
                },
                {
                  expedientes: userData.expedientes,
                }
              );
          })
        ).then(() => {
          console.log("New movement emails sent ");
        });

        // Update expedientes ult_mov_id with the latest movement ID
        for (const expediente of expedientesWithNewMovs) {
          if (expediente.lastMovId) {
            await strapi.db.query("api::expediente.expediente").update({
              where: { id: expediente.id },
              data: { ult_mov_id: expediente.lastMovId },
            });
          }
        }
      } catch (error) {
        console.log("Error in sendNewMovEmail:", error);
      }
    },
    options: {
      // every day at 8:00am (UTC-3) - same schedule as sendOverdueEmail
      rule: "0 0 11,17 * * *",
    },
  },
};
