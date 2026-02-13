import { NextResponse } from "next/server";
import OpenAI from "openai";
import { getFoodLookupCache, upsertFoodLookupCache } from "@/lib/database";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface RequestBody {
  foodName: string;
  quantity?: string;
}

export async function POST(req: Request) {
  try {
    const body: RequestBody = await req.json();
    const { foodName, quantity } = body;

    if (!foodName?.trim()) {
      return NextResponse.json(
        { error: "Food name is required" },
        { status: 400 }
      );
    }

    const quantityStr = quantity?.trim() || "1 standard serving";

    // Check cache first
    const cached = await getFoodLookupCache(foodName.trim(), quantity);
    if (cached) {
      return NextResponse.json({
        protein: cached.protein,
        calories: cached.calories,
        carbs: cached.carbs,
        fat: cached.fat,
      });
    }

    const prompt = `You are a sports nutrition expert. Estimate the macronutrient content for this food as accurately as possible.

CRITICAL: The PROTEIN value must be as accurate as possible — this is the most important number. The user is tracking protein for muscle gain and needs precise data to hit their daily target. Use well-known nutritional databases (USDA, nutrition labels) as your reference. Do NOT round protein loosely — be precise to the nearest gram.

Food: ${foodName}
Quantity: ${quantityStr}

Important guidelines:
- Base your estimate on the EXACT quantity provided, not a generic serving.
- For example, "2 chicken breasts" is roughly 2x ~185g each = ~370g cooked chicken ≈ 88g protein, NOT a vague "30g."
- For packaged/branded foods, use typical nutrition label data.
- For homemade or restaurant meals, estimate based on typical ingredient amounts.
- If the quantity is ambiguous (e.g. "a bowl"), use a realistic typical portion.

Respond with ONLY a valid JSON object (no markdown, no extra text):
{"protein": <number in grams - BE PRECISE>, "calories": <number>, "carbs": <number>, "fat": <number>}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-5-mini",
      messages: [{ role: "user", content: prompt }],
    });

    const content = completion.choices[0]?.message?.content?.trim();
    if (!content) throw new Error("No response from AI");

    const parsed = JSON.parse(content) as {
      protein: number;
      calories: number;
      carbs: number;
      fat: number;
    };

    // Cache for future lookups
    await upsertFoodLookupCache({
      foodName: foodName.trim(),
      quantity: quantityStr,
      protein: parsed.protein,
      calories: parsed.calories,
      carbs: parsed.carbs,
      fat: parsed.fat,
    });

    return NextResponse.json(parsed);
  } catch (err) {
    console.error("food-lookup error:", err);
    return NextResponse.json(
      { error: "Failed to look up food" },
      { status: 500 }
    );
  }
}
