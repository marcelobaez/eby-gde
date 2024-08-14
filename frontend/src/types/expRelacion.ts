import { Categoria } from "./categoria";
import { MetaData } from "./common";

export type ExpRelacion = {
  id: number;
  attributes: {
    expId: number;
    expCode: string;
    descripcion: string;
    parent: {
      data: ExpRelacion;
    };
    children: { data: ExpRelacion[] };
    notas: string;
    expediente_tipo: {
      data: Categoria;
    };
    isExp: boolean;
    isExpDoc: boolean | null;
    title: string;
    fechaCreacion: string;
  };
};

export type ExpRelacionCreateRequest = {
  expId?: number;
  expCode?: string;
  descripcion?: string;
  notas?: string;
  expediente_tipo?: number;
  isExp: boolean;
  isExpDoc: boolean | null;
  title?: string;
  fechaCreacion?: string;
};

export type ExpRelacionResponse = {
  data: ExpRelacion[];
  meta: MetaData;
};

export type ExpRelacionDetailResponse = {
  data: ExpRelacion;
};
