import { parseISO, differenceInDays } from "date-fns";
import esLocale from "date-fns/locale/es";

export const setStatus = (state) => {
  switch (state) {
    case "Iniciación":
      return "default";
    case "Tramitación":
      return "processing";
    case "Guarda Temporal":
      return "warning";
    default:
      return "default";
  }
};

export const getCountByState = (data, state) => {
  return data.reduce((a, v) => (v.ESTADO === state ? a + 1 : a), 0);
};

export const getCountDelayed = (data) => {
  const filtered = data.filter(item => item.duracion_esperada !== null)
  return filtered.reduce((a, v) => (differenceInDays(new Date(), parseISO(v.FECHA_CREACION, "P", {locale: esLocale})) > v.duracion_esperada ? a + 1 : a), 0);
}

export const getCountWarn = (data) => {
  const filtered = data.filter(item => item.duracion_esperada !== null)
  return filtered.reduce((a, v) => (differenceInDays(new Date(), parseISO(v.FECHA_CREACION, "P", {locale: esLocale})) === v.duracion_esperada ? a + 1 : a), 0);
}

export const getCountOnTime = (data) => {
  const filtered = data.filter(item => item.duracion_esperada !== null)
  return filtered.reduce((a, v) => (differenceInDays(new Date(), parseISO(v.FECHA_CREACION, "P", {locale: esLocale})) < v.duracion_esperada ? a + 1 : a), 0);
}

export const getStatusByGivenDates = (initial, expected) => {
  if (expected) {
    const elapsed = differenceInDays(
      new Date(),
      parseISO(initial, "P", {
        locale: esLocale,
      })
    );

    if (elapsed < expected) {
      return "green";
    } else if (elapsed === expected) {
      return "orange";
    } else {
      return "red";
    }
  } else {
    return "";
  }
};
