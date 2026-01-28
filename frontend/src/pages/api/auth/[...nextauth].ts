import NextAuth, { NextAuthOptions } from "next-auth";
import AzureADProvider from "next-auth/providers/azure-ad";
import axios from "axios";
import url from "url";
import { NextApiRequest, NextApiResponse } from "next";
import { decodeJwt } from "jose";

// For more information on each option (and a full list of options) go to
// https://next-auth.js.org/configuration/options
export const authOptions: NextAuthOptions = {
  // https://next-auth.js.org/configuration/providers/oauth
  providers: [
    AzureADProvider({
      clientId: process.env.AZURE_CLIENT_ID ?? "",
      clientSecret: process.env.AZURE_CLIENT_SECRET ?? "",
      tenantId: process.env.AZURE_TENANT_ID ?? "",
      authorization: {
        params: {
          scope: "offline_access profile openid email User.Read",
        },
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  callbacks: {
    session: async ({ session, token }) => {
      session.jwt = token.jwt as string;
      session.id = token.id as string;
      session.azureTokenExpires = token.azureTokenExpires as number;
      session.role = token.role as string;

      return session;
    },
    jwt: async ({ token, account, profile }) => {
      if (account && profile) {
        try {
          const { data } = await axios.get(
            `${process.env.NEXTAUTH_URL_INTERNAL}/api/auth/microsoft/callback?access_token=${account.access_token}`
          );
          token.jwt = data.jwt;
          token.id = data.user.id;
          
          // Decode the Strapi JWT to extract the expiration claim
          // The JWT contains an 'exp' claim (expiration time in seconds since epoch)
          const decodedJwt = decodeJwt(data.jwt);
          if (decodedJwt.exp) {
            // Convert exp (seconds) to milliseconds for consistency with Date.now()
            token.azureTokenExpires = decodedJwt.exp * 1000;
          } else {
            // Fallback: if exp claim is missing, log warning and use default 8 hours
            console.warn("JWT missing 'exp' claim, using default 8h expiration");
            token.azureTokenExpires = Date.now() + (8 * 60 * 60 * 1000);
          }
          
          token.role = data.user.role.name.toLowerCase();
        } catch (error) {
          console.log("error res:", error);
        }
      }

      return token;
    },
  },
};

const authHandler = NextAuth(authOptions);
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  await authHandler(req, res, authOptions);
}
