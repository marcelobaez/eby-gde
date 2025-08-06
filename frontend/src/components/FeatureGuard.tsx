import React from 'react';
import { useSession } from 'next-auth/react';
import { Role } from '@/utils/featureGuards';

interface FeatureGuardProps {
  /** Children to render when feature access is granted */
  children: React.ReactNode;
  /** 
   * Feature guard function that takes a role and returns boolean
   * Example: canEditAsociaciones, canAccessCategorias
   */
  guard: (role: Role) => boolean;
  /** 
   * Fallback content to render when access is denied
   * If not provided, nothing will be rendered
   */
  fallback?: React.ReactNode;
  /** 
   * Optional: Override the session role for testing
   * Only use this for development/testing purposes
   */
  overrideRole?: Role;
}

/**
 * FeatureGuard component that conditionally renders children based on user role permissions
 * 
 * @example
 * // Basic usage - only show for users who can edit associations
 * <FeatureGuard guard={canEditAsociaciones}>
 *   <Button>Edit Association</Button>
 * </FeatureGuard>
 * 
 * @example
 * // With fallback content
 * <FeatureGuard 
 *   guard={canAccessCategorias}
 *   fallback={<Text type="secondary">Access denied</Text>}
 * >
 *   <CategoryManager />
 * </FeatureGuard>
 */
export const FeatureGuard: React.FC<FeatureGuardProps> = ({
  children,
  guard,
  fallback = null,
  overrideRole,
}) => {
  const { data: session } = useSession();
  
  // Use override role for testing, otherwise use session role
  const userRole = overrideRole !== undefined ? overrideRole : session?.role;
  
  // Check if user has access using the provided guard function
  const hasAccess = guard(userRole);
  
  // Render children if access granted, otherwise render fallback
  return hasAccess ? <>{children}</> : <>{fallback}</>;
};

/**
 * Hook version of FeatureGuard for more complex conditional logic
 * 
 * @example
 * const canEdit = useFeatureGuard(canEditAsociaciones);
 * 
 * return (
 *   <div>
 *     <ViewComponent />
 *     {canEdit && <EditComponent />}
 *   </div>
 * );
 */
export const useFeatureGuard = (
  guard: (role: Role) => boolean,
  overrideRole?: Role
): boolean => {
  const { data: session } = useSession();
  const userRole = overrideRole !== undefined ? overrideRole : session?.role;
  return guard(userRole);
};

/**
 * Higher-order component version of FeatureGuard
 * Useful for wrapping entire components
 * 
 * @example
 * const ProtectedAdminPanel = withFeatureGuard(AdminPanel, isAdmin);
 */
export const withFeatureGuard = <P extends object>(
  Component: React.ComponentType<P>,
  guard: (role: Role) => boolean,
  fallback?: React.ReactNode
) => {
  const WrappedComponent: React.FC<P> = (props) => (
    <FeatureGuard guard={guard} fallback={fallback}>
      <Component {...props} />
    </FeatureGuard>
  );
  
  WrappedComponent.displayName = `withFeatureGuard(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
};

export default FeatureGuard;