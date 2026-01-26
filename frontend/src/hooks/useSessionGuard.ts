/**
 * Session Guard Hook
 * 
 * Monitors the user's session and automatically signs them out when the
 * Azure AD token expires. This is especially important for pages that
 * make direct API calls (not through the Strapi axios instance).
 * 
 * Features:
 * - Checks session expiry every 30 seconds
 * - Silently redirects to login when token expires
 * - Runs only on client-side
 * - Lightweight and non-intrusive
 * 
 * Usage:
 * ```tsx
 * function MyPage() {
 *   useSessionGuard();
 *   // ... rest of component
 * }
 * ```
 */

import { useEffect } from "react";
import { useSession, signOut } from "next-auth/react";

const CHECK_INTERVAL = 30000; // Check every 30 seconds

export function useSessionGuard() {
  const { data: session, status } = useSession();

  useEffect(() => {
    // Only run on client-side and when session is loaded
    if (status === "loading" || typeof window === "undefined") {
      return;
    }

    // If no session, user will be redirected by NextAuth
    if (status === "unauthenticated") {
      return;
    }

    // Function to check if session has expired
    const checkSessionExpiry = async () => {
      if (!session?.azureTokenExpires) {
        return;
      }

      const now = Date.now();
      const hasExpired = now >= session.azureTokenExpires;

      if (hasExpired) {
        // Session has expired, sign out silently
        await signOut({
          callbackUrl: "/login",
          redirect: true,
        });
      }
    };

    // Check immediately
    checkSessionExpiry();

    // Set up interval to check periodically
    const intervalId = setInterval(checkSessionExpiry, CHECK_INTERVAL);

    // Cleanup interval on unmount
    return () => {
      clearInterval(intervalId);
    };
  }, [session, status]);
}
