import { NextResponse } from "next/server";
import OpenAI from "openai";
import { getExerciseCache, upsertExerciseCache, exerciseCacheKey } from "@/lib/database";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface RequestBody {
  exerciseName: string;
}

export async function POST(req: Request) {
  try {
    const body: RequestBody = await req.json();
    const { exerciseName } = body;

    if (!exerciseName || typeof exerciseName !== "string" || !exerciseName.trim()) {
      return NextResponse.json(
        { error: "exerciseName is required" },
        { status: 400 }
      );
    }

    const nameKey = exerciseCacheKey(exerciseName.trim());
    try {
      const cached = await getExerciseCache(nameKey);
      if (cached?.steps?.length) {
        return NextResponse.json({ steps: cached.steps });
      }
    } catch (cacheErr) {
      console.warn("exercise-steps: cache lookup failed", cacheErr);
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-5-mini",
      messages: [
        {
          role: "system",
          content: `You are a fitness coach. For any exercise name, provide 1–3 concise steps on how to perform it correctly. Each step should be a single clear sentence. Output ONLY a valid JSON array of strings, e.g. ["Step 1...", "Step 2...", "Step 3..."]. No markdown, no extra text. Maximum 3 steps.`,
        },
        {
          role: "user",
          content: `How do I perform "${exerciseName.trim()}"? Give 1–3 steps.`,
        },
      ],
    });

    const content = completion.choices[0]?.message?.content?.trim();
    if (!content) throw new Error("No response from AI");

    const steps = JSON.parse(content) as string[];
    if (!Array.isArray(steps) || steps.length === 0) {
      throw new Error("Invalid steps format");
    }

    const validSteps = steps.slice(0, 3).filter((s) => typeof s === "string" && s.trim());

    try {
      await upsertExerciseCache(nameKey, {
        nameDisplay: exerciseName.trim(),
        steps: validSteps,
      });
    } catch (cacheErr) {
      console.warn("exercise-steps: cache save failed", cacheErr);
    }

    return NextResponse.json({ steps: validSteps });
  } catch (err) {
    console.error("exercise-steps error:", err);
    return NextResponse.json(
      { error: "Failed to get exercise steps" },
      { status: 500 }
    );
  }
}
