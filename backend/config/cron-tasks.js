const axios = require("axios");
const qs = require("qs");
const { differenceInDays, sub } = require("date-fns");
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
          const overdueExpedientes = augmentedExpedientes.filter(
            (expediente) => {
              return (
                getIsOverdue(
                  expediente.gdeExp.FECHA_CREACION,
                  expediente.gdeExp.FECHA_OPERACION,
                  expediente.duracion_esperada
                ) && expediente.gdeExp.ESTADO !== "Guarda Temporal"
              );
            }
          ).map(exp => ({
            ...exp,
            days_overdue: differenceInDays(
              parseISO(exp.gdeExp.FECHA_OPERACION),
              parseISO(exp.gdeExp.FECHA_CREACION)
            ) - exp.duracion_esperada
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

        await Promise.all(
          exptesWithGdeData.map(async (el, idx) => {
            await strapi
              .plugin("email-designer")
              .service("email")
              .sendTemplatedEmail(
                {
                  // required
                  to: el.usuario.email,
                  from: "expedientes@eby.org.ar",
                },
                {
                  // required - Ref ID defined in the template designer (won't change on import)
                  templateReferenceId: 1,
                  subject: `Expedientes Vencidos - ${el.titulo}`,
                },
                {
                  // this object must include all variables you're using in your email template
                  list: {
                    name: el.titulo,
                    expedientes: el.expedientes,
                  },
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
      // every tuesday at 1:45pm (UTC-3)
      rule: "0 15 9 * * 1,3,5",
    },
  },
};
