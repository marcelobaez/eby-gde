import { FolderOutlined } from "@ant-design/icons";
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
  const filtered = data.filter((item) => item.duracion_esperada !== null);
  return filtered.reduce(
    (a, v) =>
      differenceInDays(
        parseISO(v.FECHA_OPERACION),
        parseISO(v.FECHA_CREACION)
      ) > v.duracion_esperada
        ? a + 1
        : a,
    0
  );
};

export const getCountWarn = (data) => {
  const filtered = data.filter((item) => item.duracion_esperada !== null);
  return filtered.reduce(
    (a, v) =>
      differenceInDays(
        parseISO(v.FECHA_OPERACION),
        parseISO(v.FECHA_CREACION)
      ) === v.duracion_esperada
        ? a + 1
        : a,
    0
  );
};

export const getCountOnTime = (data) => {
  const filtered = data.filter((item) => item.duracion_esperada !== null);
  return filtered.reduce(
    (a, v) =>
      differenceInDays(
        parseISO(v.FECHA_OPERACION),
        parseISO(v.FECHA_CREACION)
      ) < v.duracion_esperada
        ? a + 1
        : a,
    0
  );
};

export const getStatusByGivenDates = (initial, last, expected) => {
  const elapsed = differenceInDays(parseISO(last), parseISO(initial));

  if (elapsed < expected) {
    return "green";
  } else if (elapsed === expected) {
    return "orange";
  } else {
    return "red";
  }
};

export function createTreeNodes(response, maxDepth = 0, currentDepth = 0) {
  let hasChildren =
    response.attributes.children &&
    Array.isArray(response.attributes.children.data) &&
    response.attributes.children.data.length > 0;

  let formattedResponse = {
    title: response.attributes.expCode,
    key: response.attributes.expId,
    // icon: <FolderOutlined />,
    desc: response.attributes.descripcion,
    notes: response.attributes.notas,
    expId: response.id,
    tag:
      response.attributes.expediente_tipo &&
      response.attributes.expediente_tipo.data
        ? response.attributes.expediente_tipo.data.attributes.nombre
        : "",
    isEditable: currentDepth < maxDepth,
  };

  if (hasChildren && currentDepth < maxDepth) {
    formattedResponse.children = [];
    response.attributes.children.data.forEach((child) => {
      formattedResponse.children.push(
        createTreeNodes(child, maxDepth, currentDepth + 1)
      );
    });
  }

  if (response.attributes.parent && response.attributes.parent.data) {
    let parent = createTreeNodes(
      response.attributes.parent.data,
      maxDepth,
      currentDepth - 1
    );
    if (!parent.children) {
      parent.children = [];
    }
    parent.children.push(formattedResponse);
    return parent;
  } else {
    return formattedResponse;
  }
}

export function getKeys(obj) {
  let keys = [];
  if (obj.hasOwnProperty("key")) {
    keys.push(obj.key);
  }
  if (Array.isArray(obj.children)) {
    for (let child of obj.children) {
      keys = keys.concat(getKeys(child));
    }
  }
  return keys;
}

export function findId(key, obj) {
  if (key === obj.attributes.expId) {
    return obj.id;
  }

  if (obj.attributes.children && obj.attributes.children.data) {
    for (let i = 0; i < obj.attributes.children.data.length; i++) {
      let result = findId(key, obj.attributes.children.data[i]);
      if (result) {
        return result;
      }
    }
  }

  if (obj.attributes.parent && obj.attributes.parent.data) {
    let result = findId(key, obj.attributes.parent.data);
    if (result) {
      return result;
    }
  }

  return null;
}
