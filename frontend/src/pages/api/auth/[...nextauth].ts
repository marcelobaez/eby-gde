import NextAuth, { NextAuthOptions } from "next-auth";
import AzureADProvider from "next-auth/providers/azure-ad";
import axios from "axios";
import url from "url";
import { NextApiRequest, NextApiResponse } from "next";

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
      session.jwt = token.jwt;
      session.id = token.id;
      session.azureTokenExpires = token.azureTokenExpires;
      session.role = token.role;

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
          token.azureTokenExpires = account.expires_at * 1000;
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
