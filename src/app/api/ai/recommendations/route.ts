import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface Recommendation {
  name: string;
  description: string;
  estimatedProtein: number;
}

interface RequestBody {
  foodsEaten: string[];
  proteinGoal: number;
  proteinCurrent: number;
  currentRecommendations?: Recommendation[];
  followUp?: string;
}

export async function POST(req: Request) {
  try {
    const body: RequestBody = await req.json();
    const { foodsEaten, proteinGoal, proteinCurrent, currentRecommendations, followUp } = body;

    const proteinRemaining = Math.max(0, proteinGoal - proteinCurrent);

    const messages: { role: "system" | "user"; content: string }[] = [];

    const systemPrompt = `You are a sports nutrition assistant helping a user hit their daily protein goal. Always respond with ONLY a valid JSON object (no markdown, no extra text) in this format:
{"recommendations": [{"name": "<meal/snack name>", "description": "<brief description including key ingredients>", "estimatedProtein": <grams>}]}

Guidelines:
- Suggest 3-5 high-protein meals or snacks.
- Be practical — easy to prepare, realistic portions.
- You CAN reuse or build on ingredients the user already ate.
- Prioritize satisfying options that close the protein gap.
- If the user asks a question about a numbered item, answer it in the description of that item while keeping all items in the list.
- If the user gives constraints (e.g. "no dairy", "I have chicken and rice"), respect them.
- If the user asks to modify the list, return the updated list.`;

    messages.push({ role: "system", content: systemPrompt });

    let userMsg = `Foods eaten today: ${foodsEaten.join(", ") || "nothing yet"}.
Protein goal: ${proteinGoal}g. Current intake: ${proteinCurrent}g. Remaining: ${proteinRemaining}g.`;

    if (currentRecommendations?.length && followUp) {
      const listStr = currentRecommendations
        .map((r, i) => `${i + 1}. ${r.name} — ${r.description} (~${r.estimatedProtein}g protein)`)
        .join("\n");
      userMsg += `\n\nCurrent suggestions:\n${listStr}\n\nUser says: "${followUp}"`;
    } else if (followUp) {
      userMsg += `\n\nUser says: "${followUp}"`;
    } else {
      userMsg += "\n\nSuggest high-protein meals or snacks to help close the gap.";
    }

    messages.push({ role: "user", content: userMsg });

    const completion = await openai.chat.completions.create({
      model: "gpt-5-mini",
      messages,
    });

    const content = completion.choices[0]?.message?.content?.trim();
    if (!content) throw new Error("No response from AI");

    const parsed = JSON.parse(content) as {
      recommendations: Recommendation[];
    };

    return NextResponse.json(parsed);
  } catch (err) {
    console.error("recommendations error:", err);
    return NextResponse.json(
      { error: "Failed to get recommendations" },
      { status: 500 }
    );
  }
}
