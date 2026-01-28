import NextAuth, { DefaultSession } from "next-auth";
import { DefaultJWT } from "next-auth/jwt";

declare module "next-auth" {
  /**
   * Extends the default session object to include custom fields
   */
  interface Session extends DefaultSession {
    /** Strapi JWT token */
    jwt: string;
    /** User ID from Strapi */
    id: string;
    /** 
     * Strapi JWT expiration timestamp in milliseconds
     * Decoded from the JWT's 'exp' claim (converted from seconds to ms)
     */
    azureTokenExpires: number;
    /** User role from Strapi */
    role: string;
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
  /**
   * Extends the default JWT token object to include custom fields
   */
  interface JWT extends DefaultJWT {
    /** Strapi JWT token */
    jwt?: string;
    /** User ID from Strapi */
    id?: string;
    /** 
     * Strapi JWT expiration timestamp in milliseconds
     * Decoded from the JWT's 'exp' claim (converted from seconds to ms)
     */
    azureTokenExpires?: number;
    /** User role from Strapi */
    role?: string;
  }
}
