'use strict';

const _ = require('lodash');
const utils = require('@strapi/utils');

const getService = (name) => {
  return strapi.plugin('users-permissions').service(name);
};

const { yup, validateYupSchema } = utils;

const callbackSchema = yup.object({
  identifier: yup.string().required(),
  password: yup.string().required(),
});

const validateCallbackBody = validateYupSchema(callbackSchema);

const { sanitize } = utils;
const { ApplicationError, ValidationError, ForbiddenError } = utils.errors;

const sanitizeUser = (user, ctx) => {
  const { auth } = ctx.state;
  const userSchema = strapi.getModel('plugin::users-permissions.user');

  return sanitize.contentAPI.output(user, userSchema, { auth });
};

module.exports = (plugin) => {
  const originalAuthController = plugin.controllers.auth;
  
  return {
    ...originalAuthController,
    async callback(ctx) {
    const provider = ctx.params.provider || 'local';
    const params = ctx.request.body;

    const store = strapi.store({ type: 'plugin', name: 'users-permissions' });
    const grantSettings = await store.get({ key: 'grant' });

    const grantProvider = provider === 'local' ? 'email' : provider;

    if (!_.get(grantSettings, [grantProvider, 'enabled'])) {
      throw new ApplicationError('This provider is disabled');
    }

    if (provider === 'local') {
      await validateCallbackBody(params);

      const { identifier } = params;

      // Check if the user exists and populate role
      const user = await strapi.query('plugin::users-permissions.user').findOne({
        where: {
          provider,
          $or: [{ email: identifier.toLowerCase() }, { username: identifier }],
        },
        populate: ['role']
      });

      if (!user) {
        throw new ValidationError('Invalid identifier or password');
      }

      if (!user.password) {
        throw new ValidationError('Invalid identifier or password');
      }

      const validPassword = await getService('user').validatePassword(
        params.password,
        user.password
      );

      if (!validPassword) {
        throw new ValidationError('Invalid identifier or password');
      }

      const advancedSettings = await store.get({ key: 'advanced' });
      const requiresConfirmation = _.get(advancedSettings, 'email_confirmation');

      if (requiresConfirmation && user.confirmed !== true) {
        throw new ApplicationError('Your account email is not confirmed');
      }

      if (user.blocked === true) {
        throw new ApplicationError('Your account has been blocked by an administrator');
      }

      // Sanitize user and ensure role is included
      const sanitizedUser = await sanitizeUser(user, ctx);
      
      return ctx.send({
        jwt: getService('jwt').issue({ id: user.id }),
        user: {
          ...sanitizedUser,
          role: user.role
        }
      });
    }

    // Connect the user with the third-party provider.
    try {
      const user = await getService('providers').connect(provider, ctx.query);

      if (user.blocked) {
        throw new ForbiddenError('Your account has been blocked by an administrator');
      }

      // For third-party providers, also populate role
      const userWithRole = await strapi.query('plugin::users-permissions.user').findOne({
        where: { id: user.id },
        populate: ['role']
      });

      const sanitizedUser = await sanitizeUser(userWithRole, ctx);

      return ctx.send({
        jwt: getService('jwt').issue({ id: user.id }),
        user: {
          ...sanitizedUser,
          role: userWithRole.role
        }
      });
    } catch (error) {
      throw new ApplicationError(error.message);
    }
  },
  };
};