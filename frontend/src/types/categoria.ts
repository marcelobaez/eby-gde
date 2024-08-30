import { MetaData } from "./common";

export type Categoria = {
  id: number;
  attributes: {
    nombre: string;
    createdAt: string;
    updatedAt: string;
    publishedAt: string;
  };
};

export type CategoriaResponse = {
  data: Categoria[];
  meta: MetaData;
};

export type CategoriaDetailResponse = {
  data: Categoria;
};
