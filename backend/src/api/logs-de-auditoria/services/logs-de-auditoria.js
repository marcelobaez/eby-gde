'use strict';

/**
 * logs-de-auditoria service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::logs-de-auditoria.logs-de-auditoria');
