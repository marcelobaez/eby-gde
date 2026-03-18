import { MetaData } from "./common";

export type Expediente = {
  id: number;
  attributes: {
    id_expediente: string;
    duracion_esperada: number;
    send_reminder: boolean | null;
    send_reminder_mov: boolean | null;
    reminder_sent_at: string | null;
    ult_mov_id: number | null;
    observaciones: string | null;
    alt_desc: string | null;
  };
};

export type ExpedienteUpdateRequest = {
  id: number;
  send_reminder?: boolean | null;
  send_reminder_mov?: boolean | null;
  reminder_sent_at?: string | null;
  duracion_esperada?: number | null;
  observaciones?: string | null;
  alt_desc?: string | null;
};

export type ExpedienteResponse = {
  data: Expediente[];
  meta: MetaData;
};

export type ExpedienteDetailResponse = {
  data: Expediente;
};
