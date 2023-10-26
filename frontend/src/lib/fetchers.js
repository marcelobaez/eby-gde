import axios from "axios";
import { parseISO, differenceInDays, formatDistance } from "date-fns";
import { setStatus, getStatusByGivenDates } from "../utils/index";
import esLocale from "date-fns/locale/es";
import { api } from "./axios";
import qs from "qs";

export const getListas = async () => {
  const { data } = await api.get("/listas");

  return data.data;
};

export const getListInfoByID = async (id) => {
  const { data } = await api.get(`/listas/${id}`);

  let listData = data.data[0];

  const expIds = listData.attributes.expedientes.data.map(
    (exp) => exp.attributes.id_expediente
  );

  if (expIds.length > 0) {
    const { data: expedientes } = await axios.get("/api/gdeexps", {
      params: {
        expIds,
      },
      paramsSerializer: function (params) {
        return qs.stringify(params, { arrayFormat: "brackets" });
      },
    });

    const normalizedExps = expedientes.map((exp) => {
      const matchingEl = listData.attributes.expedientes.data.find(
        (el) => parseInt(el.attributes.id_expediente) === exp.ID
      );

      return {
        ...exp,
        id_exp_list: matchingEl.id,
        duracion_esperada: matchingEl.attributes.duracion_esperada,
        lifetime: formatDistance(
          parseISO(exp.FECHA_OPERACION),
          parseISO(exp.FECHA_CREACION),
          { locale: esLocale }
        ),
        stateColor: setStatus(exp.ESTADO),
        lifetimeColor: matchingEl.attributes.duracion_esperada
          ? getStatusByGivenDates(
              exp.FECHA_CREACION,
              exp.FECHA_OPERACION,
              matchingEl.attributes.duracion_esperada
            )
          : "",
        daysOverdue:
          matchingEl.attributes.duracion_esperada &&
          exp.ESTADO !== "Guarda Temporal"
            ? differenceInDays(
                parseISO(exp.FECHA_OPERACION),
                parseISO(exp.FECHA_CREACION)
              ) - matchingEl.attributes.duracion_esperada
            : null,
      };
    });

    listData.attributes.expedientes.data = normalizedExps;
  }

  return listData;
};

export const getMovs = async () => {
  const { data } = await api.get("/expedientes");

  let expedientes = data.data;

  if (expedientes.length > 0) {
    const expIds = expedientes.map((exp) => exp.attributes.id_expediente);

    const { data: gdeexps } = await axios.get(`/api/gdemovs`, {
      params: {
        expIds,
      },
      paramsSerializer: function (params) {
        return qs.stringify(params, { arrayFormat: "brackets" });
      },
    });

    const normalizedExps = gdeexps.map((exp) => {
      const matchingEl = expedientes.find(
        (el) => parseInt(el.attributes.id_expediente) === exp.ID
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

export const getMovsById = async (id) => {
  const { data } = await api.get(`/expedientes`);

  let expedientes = data.data;

  if (expedientes.length > 0) {
    const { data: gdeexps } = await axios.get(`/api/gdemovs/${id}`);

    const normalizedExps = gdeexps.map((exp) => {
      const matchingEl = expedientes.find(
        (el) => parseInt(el.attributes.id_expediente) === exp.ID
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

export const getDocsById = async (id) => {
  const { data: gdedocs } = await axios.get(`/api/gdedocs/${id}`);

  return gdedocs;
};

export const getArbolExpById = async (id) => {
  const query = qs.stringify(
    {
      filters: {
        expId: {
          $eq: id,
        },
      },
      populate: [
        "parent",
        "parent.expediente_tipo",
        "expediente_tipo",
        "children.expediente_tipo",
        "children.children.expediente_tipo",
        "children.children.children",
        "children.children.children.expediente_tipo",
        "author",
      ],
    },
    {
      encodeValuesOnly: true, // prettify URL
    }
  );

  const { data } = await api.get(`/expedientes-relaciones?${query}`);

  return data.data;
};

export const getExpRelationById = async (id) => {
  const { data } = await api.get(`/expedientes-relaciones/${id}?populate=*`);

  return data.data;
};
