import { Categoria } from "./categoria";
import { MetaData } from "./common";
import { Expediente } from "./expediente";

export type Lista = {
  id: number;
  attributes: {
    titulo: string;
    expedientes: {
      data: Expediente[];
    };
  };
};

export type ListasResponse = {
  data: Lista[];
  meta: MetaData;
};

export type ListaDetailResponse = {
  data: Lista;
  meta: MetaData;
};
