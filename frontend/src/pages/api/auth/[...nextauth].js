import NextAuth from "next-auth";
import AzureADProvider from "next-auth/providers/azure-ad";
import axios from "axios";
import url from "url";

// For more information on each option (and a full list of options) go to
// https://next-auth.js.org/configuration/options
export const authOptions = {
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
      session.azureId = token.azureId;
      session.refreshToken = token.refreshToken;
      session.azureToken = token.azureToken;
      session.azureTokenExpires = token.azureTokenExpires;

      return session;
    },
    jwt: async ({ token, account, profile }) => {
      if (account) {
        try {
          const { data } = await axios.get(
            `${process.env.NEXTAUTH_URL_INTERNAL}/api/auth/microsoft/callback?access_token=${account.access_token}`
          );

          token.jwt = data.jwt;
          token.id = data.user.id;
          token.azureId = profile.oid;
          token.refreshToken = account.refresh_token;
          token.azureToken = account.access_token;
          token.azureTokenExpires = account.expires_at * 1000;
        } catch (error) {
          console.log("error res:", error);
        }
      } else if (Date.now() < token.azureTokenExpires) {
        return token;
      } else {
        try {
          const params = new url.URLSearchParams({
            client_id: process.env.AZURE_CLIENT_ID,
            refresh_token: token.refreshToken,
            grant_type: "refresh_token",
            client_Secret: process.env.AZURE_CLIENT_SECRET,
          });
          const { data: refreshedTokens } = await axios.post(
            `https://login.microsoftonline.com/a5b5ffd5-3a5c-44f9-9602-d7419e23274f/oauth2/v2.0/token`,
            params.toString(),
            {
              headers: {
                "Content-Type": "application/x-www-form-urlencoded",
              },
            }
          );

          return {
            ...token,
            azureToken: refreshedTokens.access_token,
            azureTokenExpires: Math.floor(
              Date.now() / 1000 + refreshedTokens.expires_in
            ),
            refreshToken: refreshedTokens.refresh_token ?? token.refreshToken, // Fall back to old refresh token
          };
        } catch (error) {
          console.log("error renewing token:", error);

          return {
            ...token,
            error: "RefreshAccessTokenError",
          };
        }
      }

      return token;
    },
  },
};

const authHandler = NextAuth(authOptions);
export default async function handler(...params) {
  await authHandler(...params);
}
