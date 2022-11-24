import axios from "axios";
import url from "url";
import { setCookie } from "cookies-next";

const handler = async (req, res) => {
  const params = new url.URLSearchParams({
    client_id: process.env.AZURE_CLIENT_ID,
    refresh_token: req.body.token,
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

  // set Azure-AD access token in a secure cookie
  setCookie("azureTkn", refreshedTokens.access_token, {
    req,
    res,
    httpOnly: true,
  });

  setCookie("tknExp", Date.now() + refreshedTokens.expires_in * 1000, {
    req,
    res,
    httpOnly: true,
  });

  res.status(201).json({ token: refreshedTokens.access_token });
};

export default handler;
