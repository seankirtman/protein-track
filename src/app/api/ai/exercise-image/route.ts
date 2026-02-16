import { NextResponse } from "next/server";
import OpenAI from "openai";
import { getExerciseCache, upsertExerciseCache, exerciseCacheKey } from "@/lib/database";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface RequestBody {
  exerciseName: string;
  steps: string[];
  forceRefresh?: boolean;
}

export async function POST(req: Request) {
  try {
    const body: RequestBody = await req.json();
    const { exerciseName, steps, forceRefresh } = body;

    if (!exerciseName || typeof exerciseName !== "string" || !exerciseName.trim()) {
      return NextResponse.json(
        { error: "exerciseName is required" },
        { status: 400 }
      );
    }

    const nameKey = exerciseCacheKey(exerciseName.trim());
    if (!forceRefresh) {
      try {
        const cached = await getExerciseCache(nameKey);
        if (cached?.imageDataUrl) {
          return NextResponse.json({ imageDataUrl: cached.imageDataUrl });
        }
      } catch (cacheErr) {
        console.warn("exercise-image: cache lookup failed", cacheErr);
      }
    }

    const stepsList = Array.isArray(steps)
      ? steps.filter((s) => typeof s === "string" && s.trim())
      : [];

    const stepsBlock =
      stepsList.length > 0
        ? `\nSteps:\n${stepsList.map((s, i) => `${i + 1}. ${s}`).join("\n")}`
        : "";
    const imagePrompt = `Exercise: "${exerciseName.trim()}"${stepsBlock}

Create two images that showcase this exercise in an informational way.`;

    let imageDataUrl: string | null = null;

    const tryGenerate = async (prompt: string, size: "1792x1024" | "1024x1024" = "1792x1024") => {
      const res = await openai.images.generate({
        model: "dall-e-3",
        prompt,
        size,
        n: 1,
        response_format: "b64_json",
        style: "natural",
      });
      const b64 = res.data?.[0]?.b64_json;
      if (b64) return `data:image/png;base64,${b64}`;
      return null;
    };

    try {
      imageDataUrl = await tryGenerate(imagePrompt);
    } catch (firstErr) {
      console.warn("exercise-image: primary generation failed, trying fallback", firstErr);
      // Fallback: simpler, more abstract prompt to avoid content policy rejections
      const fallbackPrompt = `Simple educational fitness diagram. Two panels side by side. Left: schematic figure in starting position for "${exerciseName.trim()}". Right: same figure in end position. Clean line art, white background, instructional style like a textbook illustration. No text.`;
      try {
        imageDataUrl = await tryGenerate(fallbackPrompt, "1024x1024");
      } catch (fallbackErr) {
        console.error("exercise-image: fallback also failed", fallbackErr);
        throw firstErr;
      }
    }

    if (!imageDataUrl) {
      throw new Error("No image data returned");
    }

    try {
      await upsertExerciseCache(nameKey, { imageDataUrl });
    } catch (cacheErr) {
      console.warn("exercise-image: cache save failed", cacheErr);
    }

    return NextResponse.json({ imageDataUrl });
  } catch (err) {
    console.error("exercise-image error:", err);
    const message = err instanceof Error ? err.message : "Failed to generate exercise image";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
