// Centralized feature guards for role-based access

export type Role = string | undefined | null;

// Role constants
export const ROLE_ADMIN = "admin";
export const ROLE_GENERAL_OPERATOR = "authenticated";
export const ROLE_OBYA_OPERATOR = "operador-obya";
export const ROLE_FULL_VIEW = "full-view";
export const ROLE_FULL_VIEW_RESTRICT = "restricted-view";
export const ROLE_FULL_VIEW_RESTRICT_DADM = "restricted-view-dadm";
export const ROLE_MESA_OPERATOR = "operador-dadm";

export const isAdmin = (role: Role) => role === ROLE_ADMIN;

export const isGeneralOperator = (role: Role) =>
  role === ROLE_GENERAL_OPERATOR;

export const isObyaOperator = (role: Role) =>
  role === ROLE_OBYA_OPERATOR;

export const isFullView = (role: Role) =>
  role === ROLE_FULL_VIEW;

export const isFullViewRestrict = (role: Role) =>
  role === ROLE_FULL_VIEW_RESTRICT;

export const isFullViewRestrictDadm = (role: Role) =>
  role === ROLE_FULL_VIEW_RESTRICT_DADM;

export const isMesaOperator = (role: Role) => role === ROLE_MESA_OPERATOR;

export const canSearchDocsAll = (role: Role) =>
  isAdmin(role) || isFullView(role);

export const canSearchDocs = (role: Role) =>
  isAdmin(role) || isFullView(role) || isFullViewRestrict(role) || isFullViewRestrictDadm(role);

export const canDownloadDocsAll = (role: Role) =>
  isAdmin(role) || isFullView(role);

// Feature guards
export const canSearchExp = (role: Role) =>
  isAdmin(role) || isFullView(role) || isFullViewRestrict(role) || isFullViewRestrictDadm(role);

export const canSearchExpAll = (role: Role) =>
  isAdmin(role) || isFullView(role);

export const canViewAsociaciones = (role: Role) =>
  isAdmin(role) || isFullView(role) || isObyaOperator(role) || isFullViewRestrict(role) || isFullViewRestrictDadm(role);

export const canEditAsociaciones = (role: Role) =>
  isAdmin(role) || isObyaOperator(role);

export const canAccessCategorias = (role: Role) =>
  isAdmin(role) || isObyaOperator(role);

export const canAccessMesas = (role: Role) =>
  isAdmin(role) || isFullViewRestrictDadm(role) || isMesaOperator(role);

// Add more guards as needed for other features
