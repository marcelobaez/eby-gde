import axios from "axios";
import qs from "qs";
import { parseISO, differenceInDays, formatDistance } from "date-fns";
import { setStatus, getStatusByGivenDates } from "../utils/index";
import esLocale from "date-fns/locale/es";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

export const getListas = async () => {
  const { data: listas } = await axios.get(`api/listas`);

  if (listas.length) {
    const expIds = listas[0].expedientes.map((exp) => exp.id_expediente);

    if (expIds.length > 0) {
      const { data: expedientes } = await axios.get(`/api/gdeexps`, {
        params: {
          expIds,
        },
        paramsSerializer: function (params) {
          return qs.stringify(params, { arrayFormat: "brackets" });
        },
      });

      const normalizedExps = expedientes.map((exp) => {
        const matchingEl = listas[0].expedientes.find(
          (el) => parseInt(el.id_expediente) === exp.ID
        );

        return {
          ...exp,
          id_exp_list: matchingEl.id,
          duracion_esperada: matchingEl.duracion_esperada,
          lifetime: formatDistance(parseISO(exp.FECHA_OPERACION), parseISO(exp.FECHA_CREACION), {locale: esLocale}),
          stateColor: setStatus(exp.ESTADO),
          lifetimeColor: matchingEl.duracion_esperada ? getStatusByGivenDates(exp.FECHA_CREACION, exp.FECHA_OPERACION, matchingEl.duracion_esperada) : '',
          daysOverdue: (matchingEl.duracion_esperada && exp.ESTADO !== 'Guarda Temporal') ? differenceInDays(parseISO(exp.FECHA_OPERACION), parseISO(exp.FECHA_CREACION)) - matchingEl.duracion_esperada : null
        };
      });

      listas[0].expedientes = normalizedExps;
    }
  }

  return listas;
};

export const getMovs = async () => {
  const { data: expedientes } = await axios.get(
    `${siteUrl}/api/expedientes`
  );

  if (expedientes.length > 0) {
    const expIds = expedientes.map((exp) => exp.id_expediente);

    const { data: gdeexps } = await axios.get(
      `${siteUrl}/api/gdemovs`,
      {
        params: {
          expIds,
        },
        paramsSerializer: function (params) {
          return qs.stringify(params, { arrayFormat: "brackets" });
        },
      }
    );

    const normalizedExps = gdeexps.map((exp) => {
      const matchingEl = expedientes.find(
        (el) => parseInt(el.id_expediente) === exp.ID
      );

      return {
        ...exp,
        id_exp_list: matchingEl.id,
      };
    });

    return normalizedExps;
  }

  return expedientes;
};
