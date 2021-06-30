import axios from "axios";
import qs from "qs";

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
        };
      });

      listas[0].expedientes = normalizedExps;
    }
  }

  return listas;
};

export const getMovs = async () => {
  const { data: expedientes } = await axios.get(
    `http://localhost:3000/api/expedientes`
  );

  if (expedientes.length > 0) {
    const expIds = expedientes.map((exp) => exp.id_expediente);

    const { data: gdeexps } = await axios.get(
      `http://localhost:3000/api/gdemovs`,
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
