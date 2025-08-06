import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]";
import axios from "axios";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: `Method ${req.method} not allowed.` });
  }

  try {
    const session = await getServerSession(req, res, authOptions);

    if (!session || !session.user?.email) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { data } = req.body;

    // Validate required fields
    if (!data.page || !data.query) {
      return res
        .status(400)
        .json({ error: "Missing required fields: page, query" });
    }

    // Prepare payload for Strapi
    const strapiPayload = {
      data: {
        page: data.page,
        query: data.query,
        logTime: data.logTime || new Date().toISOString(),
        userId: session.id || null,
        userEmail: session.user.email,
        filters: data.filters || null,
        resultCount: data.resultCount || null,
      },
    };

    // Validate environment variables
    if (!process.env.STRAPI_API_TOKEN) {
      console.error("STRAPI_API_TOKEN environment variable is not set");
      return res.status(200).json({
        success: false,
        error: "Server configuration error",
      });
    }

    const strapiUrl =
      process.env.NEXT_PUBLIC_API_URL || "http://localhost:1337";

    // Send to Strapi backend
    const strapiResponse = await axios.post(
      `${strapiUrl}/api/logs-de-auditorias`,
      strapiPayload,
      {
        headers: {
          Authorization: `Bearer ${process.env.STRAPI_API_TOKEN}`,
          "Content-Type": "application/json",
        },
        timeout: 10000,
      }
    );

    res.status(200).json({ success: true, id: strapiResponse.data.data.id });
  } catch (error) {
    console.error("Search logging error:", error);

    // Return success even if logging fails to not disrupt user experience
    res.status(200).json({
      success: false,
      error: "Logging failed but search completed successfully",
    });
  }
}
