export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST requests allowed" });
  }

  try {
    const { text, writingType, tone } = req.body;

    if (!text || text.trim().length < 3) {
      return res.status(400).json({ error: "No writing provided" });
    }

    const aiResponse = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-5.5",
        input: [
          {
            role: "system",
            content:
              "You are ClarityCheck, an AI proofreading judge. Return only valid JSON matching the schema. Be strict for emails to teachers, bosses, adults, or formal people. Rude, demanding, immature, or disrespectful emails should be Do Not Send. Polite but imperfect writing can be Usable. Give simple, helpful feedback."
          },
          {
            role: "user",
            content: `Writing type: ${writingType}
Target tone: ${tone}

Text:
${text}`
          }
        ],
        text: {
          format: {
            type: "json_schema",
            name: "proofread_result",
            strict: true,
            schema: {
              type: "object",
              additionalProperties: false,
              properties: {
                score: {
                  type: "number"
                },
                verdict: {
                  type: "string",
                  enum: ["Do Not Send", "Bad Draft", "Needs Work", "Usable", "Polished"]
                },
                grammar: {
                  type: "string"
                },
                clarity: {
                  type: "string"
                },
                tone: {
                  type: "string"
                },
                structure: {
                  type: "string"
                },
                rewrite: {
                  type: "string"
                }
              },
              required: [
                "score",
                "verdict",
                "grammar",
                "clarity",
                "tone",
                "structure",
                "rewrite"
              ]
            }
          }
        }
      })
    });

    const data = await aiResponse.json();

    if (!aiResponse.ok) {
      return res.status(500).json({
        error: "OpenAI request failed",
        details: data
      });
    }

    const outputText =
      data.output_text ||
      data.output?.[0]?.content?.[0]?.text ||
      data.output?.[1]?.content?.[0]?.text ||
      "";

    const result = JSON.parse(outputText);

    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({
      error: "Server error",
      message: error.message
    });
  }
}
