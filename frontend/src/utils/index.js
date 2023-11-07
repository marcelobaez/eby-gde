import { FileOutlined, FolderOutlined } from "@ant-design/icons";
import { parseISO, differenceInDays } from "date-fns";

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
    title: response.attributes.expCode ?? response.attributes.title,
    key:
      response.attributes.expId ??
      `${response.id} - ${response.attributes.title}`,
    icon: response.attributes.isExp ? <FolderOutlined /> : <FileOutlined />,
    desc: response.attributes.descripcion,
    notes: response.attributes.notas,
    expId: response.id,
    tag:
      response.attributes.expediente_tipo &&
      response.attributes.expediente_tipo.data
        ? response.attributes.expediente_tipo.data.attributes.nombre
        : "",
    isEditable: currentDepth < maxDepth,
    isExp: response.attributes.isExp,
    created: response.attributes.fechaCreacion,
  };

  if (hasChildren && currentDepth < maxDepth) {
    formattedResponse.children = [];
    response.attributes.children.data.forEach((child) => {
      formattedResponse.children.push(
        createTreeNodes(child, maxDepth, currentDepth + 1)
      );
    });
  }

  return formattedResponse;
}

export function reverseJsonTree(jsonObj, seenExpIds = new Map()) {
  const reversedJson = { ...jsonObj }; // Create a copy of the original JSON
  const expId = reversedJson.attributes.expId;

  if (expId) {
    if (!seenExpIds.has(expId)) {
      seenExpIds.set(expId, reversedJson);
    }
    const parentData = reversedJson.attributes.parent.data;
    if (parentData) {
      if (!parentData.attributes.children)
        parentData.attributes.children = { data: [] };
      const existingChild = parentData.attributes.children.data.find(
        (child) => child.attributes.expId === expId
      );
      if (existingChild) {
        parentData.attributes.children.data[
          parentData.attributes.children.data.indexOf(existingChild)
        ] = seenExpIds.get(expId);
      } else {
        parentData.attributes.children.data.push(seenExpIds.get(expId));
      }
      return reverseJsonTree(parentData, seenExpIds);
    }
  }

  return reversedJson;
}
export function getTreeDepth(treeData) {
  if (!treeData || !treeData.children) {
    return 0;
  }

  let maxDepth = 0;
  treeData.children.forEach((child) => {
    const childDepth = getTreeDepth(child);
    if (childDepth > maxDepth) {
      maxDepth = childDepth;
    }
  });

  return maxDepth + 1;
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
