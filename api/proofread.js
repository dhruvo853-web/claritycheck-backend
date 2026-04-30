export default async function handler(req, res) {
  // Allows your CodePen site to call this backend
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

    const prompt = `
You are ClarityCheck, an AI proofreading judge.

Analyze this writing:
Writing type: ${writingType}
Target tone: ${tone}

Text:
${text}

Return ONLY valid JSON in this exact format:
{
  "score": number from 0 to 100,
  "verdict": "Do Not Send" or "Bad Draft" or "Needs Work" or "Usable" or "Polished",
  "grammar": "simple grammar feedback",
  "clarity": "simple clarity feedback",
  "tone": "simple tone feedback",
  "structure": "simple structure feedback",
  "rewrite": "clean improved version"
}

Rules:
- Be strict for emails to teachers, bosses, adults, or formal people.
- Rude, demanding, immature, or disrespectful emails should be Do Not Send.
- Polite but imperfect writing can be Usable.
- Give feedback in simple language.
- The rewrite should fix grammar, tone, clarity, and structure.
- Do not roast the user. Be helpful.
`;

    const aiResponse = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-5.5",
        input: prompt
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
      "";

    let result;

    try {
      result = JSON.parse(outputText);
    } catch (error) {
      return res.status(500).json({
        error: "AI did not return valid JSON",
        raw: outputText
      });
    }

    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({
      error: "Server error",
      message: error.message
    });
  }
}
