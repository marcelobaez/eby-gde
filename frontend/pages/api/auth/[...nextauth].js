import NextAuth from "next-auth";
import Providers from "next-auth/providers";
import axios from "axios";
import { setCookie, getCookie } from "cookies-next";
import url from "url";
import { getSession } from "next-auth/client";

/**
 * Takes a token, and returns a new token with updated
 * `accessToken` and `accessTokenExpires`. If an error occurs,
 * returns the old token and an error property
 */
async function refreshAccessToken(token) {
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
      accessToken: refreshedTokens.access_token,
      // accessTokenExpires: Date.now() + refreshedTokens.expires_in * 1000,
      accessTokenExpires: Date.now() + 60 * 1000,
      refreshToken: refreshedTokens.refresh_token ?? token.refreshToken, // Fall back to old refresh token
    };
  } catch (error) {
    // console.log(error);

    return {
      ...token,
      error: "RefreshAccessTokenError",
    };
  }
}

const getOptions = (req, res) => ({
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
    session: async (session, token) => {
      session.jwt = token.jwt;
      session.id = token.id;
      session.azureId = token.azureId;
      session.refreshToken = token.refreshToken;

      return session;
    },
    jwt: async (token, user, account) => {
      if (account && user) {
        const { data } = await axios.get(
          `${process.env.NEXT_PUBLIC_API_URL}/auth/microsoft/callback?access_token=${account.accessToken}`
        );

        // set Azure-AD access token in a secure cookie
        setCookie("azureTkn", account.accessToken, {
          req,
          res,
          httpOnly: true,
        });

        setCookie("tknExp", Date.now() + account.expires_in * 1000, {
          req,
          res,
          httpOnly: true,
        });

        token.jwt = data.jwt;
        token.id = data.user.id;
        token.azureId = account.id;
        token.refreshToken = account.refresh_token;
      }

      return token;
    },
  },
});

export default (req, res) => NextAuth(req, res, getOptions(req, res));
