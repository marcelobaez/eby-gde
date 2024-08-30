import { MetaData } from "./common";

export type Expediente = {
  id: number;
  attributes: {
    id_expediente: string;
    duracion_esperada: number;
  };
};

export type ExpedienteResponse = {
  data: Expediente[];
  meta: MetaData;
};

export type ExpedienteDetailResponse = {
  data: Expediente;
};
