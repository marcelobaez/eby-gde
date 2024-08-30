import { MetaData } from "./common";

export type ExpDoc = {
  id: number;
  attributes: {
    NRO_ORDEN: number;
    TIPO_DOC: string;
    NRO_DOC: number;
    SEDE: number;
    LETRA: string;
    CONTRATO: string;
    CAUSANTE: string;
    ASUNTO: string;
    IMPORTE: number;
    NRO_EXPE: number;
    CORRESPO: number;
    N_RESOLUC: number;
  };
};

export type ExpDocsResponse = {
  data: ExpDoc[];
  meta: MetaData;
};

export type ExpDocDetailResponse = {
  data: ExpDoc;
  meta: MetaData;
};
