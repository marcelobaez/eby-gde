import {
  belongsTo,
  createServer,
  hasMany,
  Model,
  RestSerializer,
  Serializer,
  schema,
} from "miragejs";

export function makeServer({ environment = "test" } = {}) {
  let server = createServer({
    environment,

    models: {
      user: Model.extend({
        lists: hasMany(),
      }),
      expediente: Model,
      item: Model.extend({
        list: belongsTo(),
      }),
      list: Model.extend({
        user: belongsTo(),
        items: hasMany(),
      }),
    },
    serializers: {
      application: RestSerializer,
      list: Serializer.extend({
        include: ["items"],
      }),
      item: Serializer.extend({
        include: ["list"],
      }),
    },
    seeds(server) {
      const usuario = server.schema.users.create({ id: 1, name: "Marcelo" });
      server.schema.lists.create({
        id: 1,
        title: "Mi lista",
        user: usuario,
      });
      server.create("expediente", {
        id: 1639064,
        code: "EX2021108264GDEEBY-MENT",
        description:
          "Solicitud de pago por movilización ENTIDAD 1 - ENTIDAD 2. Convenio Especifico",
        state: "Tramitación",
      });
      server.create("expediente", {
        id: 1639075,
        code: "EX2021108948GDEEBY-MENT",
        description: "Renovación Servicio Empresa ejemplo",
        state: "Guarda Temporal",
      });
      server.create("expediente", {
        id: 1639065,
        code: "EX2021111185GDEEBY-MENT",
        description:
          "EXPTE.Nº 1111/12 EMPRESA SRL C/ JUAN PEREZ S/ EJECUTIVO AMPLIACION DE EMBARGO- OFICIO Nº XX",
        state: "Tramitación",
      });
      server.create("item", {
        id: 1639065,
        descripcion:
          "EXPTE.Nº 1111/12 EMPRESA SRL C/ JUAN PEREZ S/ EJECUTIVO AMPLIACION DE EMBARGO- OFICIO Nº XX",
        fecha_creacion: "13/04/2021",
        anio: 2021,
        numero: 72,
        estado: "Tramitación",
        expediente: "EX2021111185GDEEBY-MENT",
        ord_hist: 5,
        descripcion_reparticion_destin:
          "Sector de Innovación Tecnológica y Sistemas",
        destinatario: "JALVAREZ",
        fecha_operacion: "10/05/2021",
      });
      server.create("item", {
        id: 1639075,
        descripcion: "Renovación Servicio Empresa ejemplo",
        fecha_creacion: "13/04/2021",
        anio: 2021,
        numero: 72,
        estado: "Guarda Temporal",
        expediente: "EX2021108948GDEEBY-MENT",
        ord_hist: 1,
        descripcion_reparticion_destin:
          "Sector de Innovación Tecnológica y Sistemas",
        destinatario: "JALVAREZ",
        fecha_operacion: "13/04/2021",
      });
      server.create("item", {
        id: 1639064,
        descripcion:
          "Solicitud de pago por movilización ENTIDAD 1 - ENTIDAD 2. Convenio Especifico",
        fecha_creacion: "27/01/2021",
        anio: 2021,
        numero: 43,
        estado: "Tramitación",
        expediente: "EX2021108264GDEEBY-MENT",
        ord_hist: 1,
        descripcion_reparticion_destin: "Area de Modernización",
        destinatario: "MBAEZ",
        fecha_operacion: "27/01/2021",
      });
    },
    routes() {
      this.namespace = "api";

      this.get("/lists", (schema) => {
        return schema.lists.find(1);
      });

      this.get("/expedientes", (schema, request) => {
        const { year, number } = request.queryParams;

        return schema.expedientes.where({
          code: `EX${year}${number}GDEEBY-MENT`,
        });
      });

      this.get("/items", (schema) => {
        return schema.lists.find(1);
      });

      this.post("/items", (schema, request) => {
        const attrs = JSON.parse(request.requestBody);

        const list = schema.lists.find(1);

        const exists = list.itemIds.indexOf(attrs.id) !== -1;
        const emptyList = list.itemIds.length === 0;

        if (!exists || emptyList) {
          list.itemIds = [...list.itemIds, attrs.id];
          list.save();
        }
      });

      this.delete("/items", (schema, request) => {
        const attrs = JSON.parse(request.requestBody);

        const list = schema.lists.find(1);

        list.itemIds = list.itemIds.filter((item) => item !== attrs.id);
        list.save();
      });
    },
  });

  return server;
}
