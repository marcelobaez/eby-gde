import { ExtendedLista } from "@/lib/fetchers";
import { ExpRelacion } from "@/types/expRelacion";
import { FileTwoTone, FolderTwoTone } from "@ant-design/icons";
import { BasicDataNode, DataNode } from "antd/es/tree";
import { parseISO, differenceInDays } from "date-fns";

export type TreeNode = (BasicDataNode | DataNode) & {
  title: string;
  key: string;
  icon: any;
  desc: string;
  notes: string;
  expId: number;
  tag: string;
  isEditable: boolean;
  isExp: boolean;
  isFirst?: boolean;
  isLast?: boolean;
  created: string;
  children: TreeNode[];
};

export const setStatus = (state: string) => {
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

// export const getCountByState = (data, state: string) => {
//   return data.reduce((a: number, v) => (v.ESTADO === state ? a + 1 : a), 0);
// };

export const getCountDelayed = (data: ExtendedLista[]) => {
  const filtered = data.filter((item) => item.duracion_esperada !== null);
  return filtered.reduce(
    (a, v) =>
      v.duracion_esperada
        ? differenceInDays(
            parseISO(v.FECHA_OPERACION),
            parseISO(v.FECHA_CREACION)
          ) > v.duracion_esperada
          ? a + 1
          : a
        : a,
    0
  );
};

// export const getCountWarn = (data) => {
//   const filtered = data.filter((item) => item.duracion_esperada !== null);
//   return filtered.reduce(
//     (a, v) =>
//       differenceInDays(
//         parseISO(v.FECHA_OPERACION),
//         parseISO(v.FECHA_CREACION)
//       ) === v.duracion_esperada
//         ? a + 1
//         : a,
//     0
//   );
// };

export const getCountOnTime = (data: ExtendedLista[]) => {
  const filtered = data.filter((item) => item.duracion_esperada !== null);
  return filtered.reduce(
    (a, v) =>
      v.duracion_esperada
        ? differenceInDays(
            parseISO(v.FECHA_OPERACION),
            parseISO(v.FECHA_CREACION)
          ) < v.duracion_esperada
          ? a + 1
          : a
        : a,
    0
  );
};

export const getStatusByGivenDates = (
  initial: string,
  last: string,
  expected: number
) => {
  const elapsed = differenceInDays(parseISO(last), parseISO(initial));

  if (elapsed < expected) {
    return "green";
  } else if (elapsed === expected) {
    return "orange";
  } else {
    return "red";
  }
};

export function createTreeNodes(
  response: ExpRelacion,
  maxDepth = 0,
  currentDepth = 0
) {
  let hasChildren =
    response.attributes.children &&
    Array.isArray(response.attributes.children.data) &&
    response.attributes.children.data.length > 0;

  let formattedResponse: TreeNode = {
    title: response.attributes.expCode ?? response.attributes.title,
    key:
      String(response.attributes.expId) ??
      `${response.id} - ${response.attributes.title}`,
    icon: response.attributes.isExp ? (
      <FolderTwoTone twoToneColor="#f59e0b" />
    ) : (
      <FileTwoTone />
    ),
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
    children: [],
  };

  if (hasChildren && currentDepth < maxDepth) {
    formattedResponse.children = [];
    const totalChildren = response.attributes.children.data.length;
    response.attributes.children.data.forEach((child, index) => {
      const childNode = createTreeNodes(child, maxDepth, currentDepth + 1);
      childNode.isFirst = index === 0;
      childNode.isLast = index === totalChildren - 1;
      formattedResponse.children.push(childNode);
    });
  }

  return formattedResponse;
}

export function reverseJsonTree(jsonObj: ExpRelacion, seenExpIds = new Map()) {
  const reversedJson = { ...jsonObj }; // Create a copy of the original JSON
  const expId = reversedJson.attributes.expId;

  if (expId) {
    if (!seenExpIds.has(expId)) {
      seenExpIds.set(expId, reversedJson);
    }
    const parentData = reversedJson.attributes.parent?.data || null;
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
export function getTreeDepth(treeData: TreeNode) {
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

export function getKeys(obj: TreeNode) {
  let keys: string[] = [];
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

// export function findId(key: string, obj) {
//   if (key === obj.attributes.expId) {
//     return obj.id;
//   }

//   if (obj.attributes.children && obj.attributes.children.data) {
//     for (let i = 0; i < obj.attributes.children.data.length; i++) {
//       let result = findId(key, obj.attributes.children.data[i]);
//       if (result) {
//         return result;
//       }
//     }
//   }

//   if (obj.attributes.parent && obj.attributes.parent.data) {
//     let result = findId(key, obj.attributes.parent.data);
//     if (result) {
//       return result;
//     }
//   }

//   return null;
// }
export function findAdjacentExpId(
  tree: TreeNode[],
  expId: number,
  direction: "before" | "after"
): number | null {
  for (let i = 0; i < tree.length; i++) {
    if (tree[i].expId === expId) {
      if (direction === "before" && i > 0) {
        return tree[i - 1].expId;
      } else if (direction === "after" && i < tree.length - 1) {
        return tree[i + 1].expId;
      }
      return null;
    }

    if (tree[i].children) {
      const result = findAdjacentExpId(tree[i].children!, expId, direction);
      if (result) {
        return result;
      }
    }
  }

  return null;
}

export function findParentExpId(
  tree: TreeNode[],
  expId: number
): number | null {
  for (let i = 0; i < tree.length; i++) {
    if (tree[i].children) {
      for (let j = 0; j < tree[i].children.length; j++) {
        if (tree[i].children[j].expId === expId) {
          return tree[i].expId;
        }
      }

      const result = findParentExpId(tree[i].children, expId);
      if (result) {
        return result;
      }
    }
  }

  return null;
}
