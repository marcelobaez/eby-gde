import { useQuery } from "react-query";
import { getArbolExpById, getExpRelationById } from "../lib/fetchers";

export function useGetArbolExpByGdeId(id, options = {}) {
  return useQuery(["arbolExp", id], async () => getArbolExpById(id), {
    ...options,
  });
}

export function useGetExpRelationById(id, options = {}) {
  return useQuery(["expRelDetails", id], async () => getExpRelationById(id), {
    ...options,
  });
}
