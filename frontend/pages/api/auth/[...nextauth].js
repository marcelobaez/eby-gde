import NextAuth from "next-auth";
import Providers from "next-auth/providers";
import axios from "axios";

/**
 * Takes a token, and returns a new token with updated
 * `accessToken` and `accessTokenExpires`. If an error occurs,
 * returns the old token and an error property
 */
async function refreshAccessToken(token) {
  try {
    const { data: refreshedTokens } = await axios.post(
      `https://login.microsoftonline.com/common/oauth2/v2.0/token`,
      {
        client_id: process.env.AZURE_CLIENT_ID,
        // scope: 'offline_access User.Read',
        refresh_token: session.refreshToken,
        grant_type: "refresh_token",
      },
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    return {
      ...token,
      accessToken: refreshedTokens.access_token,
      accessTokenExpires: Date.now() + refreshedTokens.expires_in * 1000,
      refreshToken: refreshedTokens.refresh_token ?? token.refreshToken, // Fall back to old refresh token
    };
  } catch (error) {
    console.log(error);

    return {
      ...token,
      error: "RefreshAccessTokenError",
    };
  }
}

export default NextAuth({
  providers: [
    Providers.AzureADB2C({
      clientId: process.env.AZURE_CLIENT_ID,
      clientSecret: process.env.AZURE_CLIENT_SECRET,
      scope: "offline_access User.Read",
      tenantId: process.env.AZURE_TENANT_ID,
    }),
  ],
  database: process.env.DATABASE_URL,
  pages: {
    signIn: "/login",
  },
  session: {
    jwt: true,
  },
  callbacks: {
    session: async (session, user) => {
      session.jwt = user.jwt;
      session.id = user.id;
      session.azureId = user.azureId;
      session.azureJwt = user.azureJwt;

      return session;
    },
    jwt: async (token, user, account) => {
      if (account && user) {
        const { data } = await axios.get(
          `${process.env.NEXT_PUBLIC_API_URL}/auth/microsoft/callback?access_token=${account?.accessToken}`
        );

        token.jwt = data.jwt;
        token.id = data.user.id;
        token.azureId = account.id;
        token.azureJwt = account.access_token;
      }
      return token;
    },
  },
});
