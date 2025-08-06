export type GDEMovsResponse = {
  ID_MOV: number;
  ID: number;
  DESCRIPCION: string;
  EXPEDIENTE: string;
  USUARIO: string;
  MOTIVO: string;
  ESTADO: string;
  FECHA_CREACION: string;
  ID_EXPEDIENTE: number;
  ORD_HIST: number;
  DESCRIPCION_REPARTICION_DESTIN: string;
  DESTINATARIO: string;
  FECHA_OPERACION: string;
};

export type DocsResponse = {
  ID: number;
  NUMERO_SADE: string;
  MOTIVO: string;
  NOMBRE_ARCHIVO: string;
  FECHA_CREACION: string;
  FECHA_ASOCIACION: string;
  NOMBRE: string;
  ACRONIMO: string;
  POSICION: number;
  DOWNLOADABLE: boolean;
};

export type GDEExpResponse = {
  ID: number;
  DESCRIPCION: string;
  EXPEDIENTE: string;
  ESTADO: string;
  FECHA_CREACION: string;
  DESCRIPCION_REPARTICION_DESTIN: string;
  DESTINATARIO: string;
  FECHA_OPERACION: string;
  RN: number;
};

export type ExpSearchResponse = {
  CODIGO: string;
  DESCRIPCION: string;
  ESTADO: string;
  FECHA_CREACION: string;
  ID: number;
};
