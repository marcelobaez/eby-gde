import { useQuery } from "@tanstack/react-query";
import {
  getArbolExpByExpCode,
  getArbolExpById,
  getExpRelationById,
} from "../lib/fetchers";

export function useGetArbolExpByGdeId(id: string, options = {}) {
  return useQuery({
    queryKey: ["arbolExp", id],
    queryFn: async () => getArbolExpById(id),
    ...options,
  });
}

export function useGetArbolExpByExpCode(code: string, options = {}) {
  return useQuery({
    queryKey: ["arbolExpcode", code],
    queryFn: async () => getArbolExpByExpCode(code),
    ...options,
  });
}

export function useGetExpRelationById(id: number, options = {}) {
  return useQuery({
    queryKey: ["expRelDetails", id],
    queryFn: async () => getExpRelationById(id),
    ...options,
  });
}
