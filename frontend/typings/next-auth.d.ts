import NextAuth, { DefaultSession } from "next-auth";
import { DefaultJWT } from "next-auth/jwt";

declare module "next-auth" {
  /**
   * Returned by `useSession`, `getSession` and received as a prop on the `SessionProvider` React Context
   */
  interface Session extends DefaultSession {
    jwt: string;
    id: string;
    role: string;
    azureTokenExpires: number;
  }

  interface Profile extends DefaultProfile {
    oid: string;
  }

  interface Account {
    refresh_token: string;
    access_token: string;
    expires_at: number;
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    jwt: string;
    id: string;
    role: string;
    azureTokenExpires: number;
  }
}
