import { NextApiRequest } from "next";

export type AttachedFile = {
  attributes: {
    alternativeText: string | null;
    caption: string | null;
    ext: string;
    hash: string;
    mime: string;
    name: string;
    url: string;
    size: number;
  };
  id: number;
};

// common metadata for all responses
export type MetaData = {
  pagination: {
    page: number;
    pageCount: number;
    pageSize: number;
    total: number;
  };
};

export type ResponseError = {
  data: null,
  error: {
    status: number, // HTTP status
    name: 'ApplicationError' | 'ValidationError', // Strapi error name ('ApplicationError' or 'ValidationError')
    message: string, // A human readable error message
    details: unknown
  }
};

export type FilterOperand = "$eq" | "$eqi" | "$ne" | "$and" | "$in";

// type FilterObject = Record<FilterOperand, string | number>;
type FilterObject = {[key in FilterOperand]?: string | number | number[] | string[]};

export interface RecursiveFilter {
  [key: string]: RecursiveFilter | FilterObject;
}

// used for backend pagination, sorting and filtering
export type FilterSortRequest = {
  populate?: string;
  sort?: string[];
  pagination?: {
    pageSize?: number;
    page?: number;
  };
  filters?: RecursiveFilter;
};

export type CustomRequest = NextApiRequest & {
  query: Required<FilterSortRequest> & NextApiRequest["query"];
};
