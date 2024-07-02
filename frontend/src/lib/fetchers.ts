import axios from "axios";
import { parseISO, differenceInDays, formatDistance } from "date-fns";
import { setStatus, getStatusByGivenDates } from "../utils/index";
import esLocale from "date-fns/locale/es";
import { api } from "./axios";
import qs from "qs";
import { ExpRelacion, ExpRelacionResponse } from "@/types/expRelacion";
import { ExpedienteResponse } from "@/types/expediente";
import {
  DocsResponse,
  GDEExpResponse,
  GDEMovsResponse as GDEMovsResponse,
} from "@/types/apiGde";
import { ListaDetailResponse, ListasResponse } from "@/types/lista";
import { useQuery } from "@tanstack/react-query";

export type ExtendedLista = GDEExpResponse & {
  list_name: string;
  id_exp_list: number;
  duracion_esperada: number | null;
  lifetime: string;
  lifetimeDays: number;
  stateColor: string;
  lifetimeColor: string;
  daysOverdue: number | null;
};

export const getListas = async () => {
  const { data } = await api
    .get<ListasResponse>("/listas")
    .then((res) => res.data);

  return data;
};

export const useListInfoByID = (id: string) => {
  const { data: listData } = useQuery({
    queryKey: ["listas", id],
    queryFn: async () => {
      const { data } = await api.get<ListaDetailResponse>(
        `/listas/${id}?populate=*`
      );
      return data;
    },
    enabled: Boolean(id),
  });

  const expIds = listData
    ? listData.data.attributes.expedientes.data.map(
        (exp) => exp.attributes.id_expediente
      )
    : [];

  return useQuery({
    queryKey: ["expedientes", id],
    queryFn: async () => {
      const { data } = await axios.get<GDEExpResponse[]>("/api/gdeexps", {
        params: {
          expIds,
        },
        paramsSerializer: function (params) {
          return qs.stringify(params, { arrayFormat: "brackets" });
        },
      });
      return data;
    },
    select: (data) => {
      if (!listData || expIds.length === 0) return;
      const extendedExps: ExtendedLista[] = data
        .map((exp) => {
          const matchingEl = listData.data.attributes.expedientes.data.find(
            (el) => parseInt(el.attributes.id_expediente) === exp.ID
          );

          if (!matchingEl) return null;

          return {
            ...exp,
            id_exp_list: matchingEl.id,
            list_name: listData.data.attributes.titulo,
            duracion_esperada: matchingEl.attributes.duracion_esperada,
            lifetime: formatDistance(
              parseISO(exp.FECHA_OPERACION),
              parseISO(exp.FECHA_CREACION),
              { locale: esLocale }
            ),
            lifetimeDays: differenceInDays(
              parseISO(exp.FECHA_OPERACION),
              parseISO(exp.FECHA_CREACION)
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
        })
        .filter((exp) => exp) as ExtendedLista[];

      return extendedExps;
    },
    enabled: Boolean(expIds.length > 0),
  });
};

export const getMovs = async () => {
  const { data } = await api
    .get<ExpedienteResponse>("/expedientes")
    .then((res) => res.data);

  let expedientes = data;

  if (expedientes.length > 0) {
    const expIds = expedientes.map((exp) => exp.attributes.id_expediente);

    const { data: gdeexps } = await axios.get<GDEMovsResponse[]>(
      `/api/gdemovs`,
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
        (el) => parseInt(el.attributes.id_expediente) === exp.ID
      );

      return {
        ...exp,
        id_exp_list: matchingEl ? matchingEl.id : null,
      };
    });

    return normalizedExps;
  }

  return expedientes;
};

export const useExpMovsById = (id: string) => {
  return useQuery({
    queryKey: ["gdemovs", id],
    queryFn: async () => {
      const { data } = await axios.get<GDEMovsResponse[]>(`/api/gdemovs/${id}`);
      return data;
    },
    enabled: !!id,
  });
};

export const useGetDocsByExpId = (id: string) => {
  return useQuery({
    queryKey: ["gdedocs", id],
    queryFn: async () => {
      const { data } = await axios.get<DocsResponse[]>(`/api/gdedocs/${id}`);
      return data;
    },
    enabled: !!id,
  });
};

export const getArbolExpById = async (id: string) => {
  const query = qs.stringify(
    {
      filters: {
        expId: {
          $eq: id,
        },
      },
      populate: [
        //root
        "parent",
        "children",
        "expediente_tipo",
        "parent.children",
        "parent.expediente_tipo",
        "parent.children.expediente_tipo",
        "parent.children.children",
        "parent.children.children.expediente_tipo",
        "parent.children.children.children",
        "parent.children.children.children.expediente_tipo",
        "parent.children.children.children.children",
        "parent.children.children.children.children.expediente_tipo",
        //level 1
        "parent.parent",
        "parent.parent.expediente_tipo",
        "parent.parent.children",
        "parent.parent.children.expediente_tipo",
        "parent.parent.children.children",
        "parent.parent.children.children.expediente_tipo",
        "parent.parent.children.children.children",
        "parent.parent.children.children.children.expediente_tipo",
        //level 2
        "parent.parent.parent",
        "parent.parent.parent.expediente_tipo",
        "parent.parent.parent.children",
        "parent.parent.parent.children.expediente_tipo",
        "parent.parent.parent.children.children",
        "parent.parent.parent.children.children.expediente_tipo",
        "parent.parent.parent.children.children.children",
        "parent.parent.parent.children.children.children.expediente_tipo",
        //level 3
        "parent.parent.parent.parent",
        "parent.parent.parent.parent.expediente_tipo",
        "parent.parent.parent.parent.children",
        "parent.parent.parent.parent.children.expediente_tipo",
        "parent.parent.parent.parent.children.children",
        "parent.parent.parent.parent.children.children.expediente_tipo",
        "parent.parent.parent.parent.children.children.children",
        "parent.parent.parent.parent.children.children.children.expediente_tipo",
        //all children
        "children.expediente_tipo",
        "children.children",
        "children.children.expediente_tipo",
        "children.children.children",
        "children.children.children.expediente_tipo",
        "children.children.children.children",
        "children.children.children.children.expediente_tipo",
      ],
    },
    {
      encodeValuesOnly: true, // prettify URL
    }
  );

  const { data } = await api
    .get<ExpRelacionResponse>(`/expedientes-relaciones?${query}`)
    .then((res) => res.data);

  return data;
};

export const getExpRelationById = async (id: number) => {
  const { data } = await api.get(`/expedientes-relaciones/${id}?populate=*`);

  return data.data;
};
