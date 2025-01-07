import { NextResponse } from "next/server";

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const YOUR_SITE_URL = "https://poidh.xyz";
const YOUR_SITE_NAME = "BountyLens";

export async function POST(request: Request) {
  try {
    const { idea } = await request.json();

    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          "HTTP-Referer": YOUR_SITE_URL,
          "X-Title": YOUR_SITE_NAME,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "openai/gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: `You are an AI assistant for POIDH (Pics or It Didn't Happen). Generate concise bounty ideas that require photo/video proof. Format your response exactly like this example:

{
  "title": "24-Hour Coding Marathon",
  "description": "Stream yourself coding for 24 hours straight. Must show a public GitHub repository with consistent commits throughout the period, and maintain a live stream showing your screen and face. Take breaks only for essential needs and document them."
}

Keep titles under 50 characters and descriptions under 200 characters. Focus on clear, verifiable actions.`,
            },
            {
              role: "user",
              content: `Generate a POIDH bounty based on this idea: ${idea}`,
            },
          ],
        }),
      }
    );

    if (!response.ok) {
      throw new Error("Failed to generate bounty");
    }

    const data = await response.json();
    const generatedContent = data.choices[0].message.content;

    // Parse the JSON response
    try {
      const bounty = JSON.parse(generatedContent);
      return NextResponse.json(bounty);
    } catch (parseError) {
      console.error("Error parsing AI response:", parseError);
      throw new Error("Invalid response format from AI");
    }
  } catch (error) {
    console.error("Error generating bounty:", error);
    return NextResponse.json(
      { error: "Failed to generate bounty" },
      { status: 500 }
    );
  }
}
