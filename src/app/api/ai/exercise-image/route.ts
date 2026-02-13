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
      ? steps.filter((s) => typeof s === "string" && s.trim()).slice(0, 3)
      : [];

    // Use LLM to turn steps into a precise visual prompt for WorkoutLabs-style two-panel diagram
    let imagePrompt: string;
    if (stepsList.length > 0) {
      const chat = await openai.chat.completions.create({
        model: "gpt-5-mini",
        messages: [
          {
            role: "system",
            content: `You create DALL-E prompts for fitness instructional diagrams. Given an exercise and its steps, describe exactly what the image must show. CRITICAL: Output a description for a TWO-PANEL image (two illustrations side by side) showing the main phases: panel 1 = starting/extended position, panel 2 = contracted/peak position. Be extremely specific about body posture (e.g. "bent forward at hips, torso at 45 degrees" NOT "standing upright"), equipment position, and what makes this exercise visually distinct. Never describe a generic standing pose if the exercise requires bending, hinging, or another position. Output ONLY the prompt text, no other text.`,
          },
          {
            role: "user",
            content: `Exercise: "${exerciseName.trim()}"\nSteps:\n${stepsList.map((s, i) => `${i + 1}. ${s}`).join("\n")}\n\nWrite the two-panel image prompt:`,
          },
        ],
      });
      imagePrompt = (chat.choices[0]?.message?.content?.trim() || "").replace(/^["']|["']$/g, "") || `Person performing ${exerciseName.trim()} with correct form in two panels.`;
    } else {
      imagePrompt = `Person performing ${exerciseName.trim()} with correct form in two panels.`;
    }

    const fullPrompt = `Professional fitness instructional diagram in WorkoutLabs style. Two side-by-side panels: left panel shows starting position, right panel shows contracted position. ${imagePrompt} Clean vector-style figure illustrations, grayscale or simple colors, white background. No text or watermarks. The image MUST accurately show the exercise position described.`;

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
      const b64 = res.data[0]?.b64_json;
      if (b64) return `data:image/png;base64,${b64}`;
      return null;
    };

    try {
      imageDataUrl = await tryGenerate(fullPrompt);
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
