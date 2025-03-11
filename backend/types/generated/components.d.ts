import type { Attribute, Schema } from '@strapi/strapi';

export interface RelationsExpRel extends Schema.Component {
  collectionName: 'components_relations_exp_rels';
  info: {
    displayName: 'ExpRel';
    icon: 'archive';
  };
  attributes: {
    descripcion: Attribute.String;
    expId: Attribute.BigInteger & Attribute.Required & Attribute.Unique;
    notas: Attribute.String;
  };
}

declare module '@strapi/types' {
  export module Shared {
    export interface Components {
      'relations.exp-rel': RelationsExpRel;
    }
  }
}
