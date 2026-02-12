import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface RequestBody {
  weight?: number;
  height?: number;
  age?: number;
  activityLevel?: string;
  goal?: string;
}

export async function POST(req: Request) {
  try {
    const body: RequestBody = await req.json();
    const { weight, height, age, activityLevel, goal } = body;

    const prompt = `You are an evidence-based sports nutrition expert. Based on the following profile, recommend a daily protein intake in grams.

Use these well-established guidelines:
- BULKING / MUSCLE GAIN: 1.0 to 1.4 grams per pound of body weight. For most people bulking, default to at least 1g/lb. Lean individuals or hard gainers should aim for 1.2-1.4g/lb.
- MAINTENANCE: 0.8 to 1.0 grams per pound of body weight.
- CUTTING / FAT LOSS: 1.0 to 1.3 grams per pound of body weight (higher protein preserves muscle during a deficit).

Higher activity levels should push toward the upper end of each range.

Profile:
- Weight: ${weight ?? "unknown"} lbs
- Height: ${height ?? "unknown"} inches
- Age: ${age ?? "unknown"}
- Activity level: ${activityLevel ?? "unknown"}
- Fitness goal: ${goal ?? "maintain"}

Respond with ONLY a valid JSON object (no markdown, no extra text) in this exact format:
{"proteinGoal": <number>, "reasoning": "<2-3 sentence explanation referencing the g/lb calculation>"}

The protein goal must be a whole number. For a bulking goal, it should be AT LEAST equal to body weight in pounds.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-5-mini",
      messages: [{ role: "user", content: prompt }],
    });

    const content = completion.choices[0]?.message?.content?.trim();
    if (!content) throw new Error("No response from AI");

    const parsed = JSON.parse(content) as {
      proteinGoal: number;
      reasoning: string;
    };

    return NextResponse.json(parsed);
  } catch (err) {
    console.error("protein-goal error:", err);
    return NextResponse.json(
      { error: "Failed to calculate protein goal" },
      { status: 500 }
    );
  }
}
