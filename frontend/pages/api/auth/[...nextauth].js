import NextAuth from "next-auth";
import Providers from "next-auth/providers";

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
      session.name = user.name;

      return session;
    },
    jwt: async (token, user, account) => {
      console.log('USER: ', user)
      if (account) {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/auth/microsoft/callback?access_token=${account?.accessToken}`
        );
        const data = await response.json();
        token.jwt = data.jwt;
        token.id = data.user.id;
        token.name = user.name
      }
      return token;
    },
  },
});
