import { NextResponse } from "next/server";
import OpenAI from "openai";
import { getExerciseCache, upsertExerciseCache, exerciseCacheKey } from "@/lib/database";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface RequestBody {
  exerciseName: string;
  steps: string[];
}

export async function POST(req: Request) {
  try {
    const body: RequestBody = await req.json();
    const { exerciseName, steps } = body;

    if (!exerciseName || typeof exerciseName !== "string" || !exerciseName.trim()) {
      return NextResponse.json(
        { error: "exerciseName is required" },
        { status: 400 }
      );
    }

    const nameKey = exerciseCacheKey(exerciseName.trim());
    try {
      const cached = await getExerciseCache(nameKey);
      if (cached?.imageDataUrl) {
        return NextResponse.json({ imageDataUrl: cached.imageDataUrl });
      }
    } catch (cacheErr) {
      console.warn("exercise-image: cache lookup failed", cacheErr);
    }

    const stepsList = Array.isArray(steps)
      ? steps.filter((s) => typeof s === "string" && s.trim()).slice(0, 3)
      : [];

    // Use LLM to turn steps into a precise visual prompt so the image matches the instructions
    let imagePrompt: string;
    if (stepsList.length > 0) {
      const chat = await openai.chat.completions.create({
        model: "gpt-5-mini",
        messages: [
          {
            role: "system",
            content: `You create short image-generation prompts for DALL-E. Given an exercise name and its how-to steps, output a single 1-2 sentence description that precisely captures the key VISUAL elements: body position, equipment placement, and what distinguishes this exercise from similar ones. Be specific about pose (e.g. "bent forward at hips" vs "standing upright", "bar in hands hanging down" vs "bar on upper back"). Output ONLY the prompt text, no other text.`,
          },
          {
            role: "user",
            content: `Exercise: "${exerciseName.trim()}"\nSteps:\n${stepsList.map((s, i) => `${i + 1}. ${s}`).join("\n")}\n\nWrite the image prompt:`,
          },
        ],
      });
      imagePrompt = (chat.choices[0]?.message?.content?.trim() || "").replace(/^["']|["']$/g, "") || `Person performing ${exerciseName.trim()} with correct form.`;
    } else {
      imagePrompt = `Person performing ${exerciseName.trim()} with correct form.`;
    }

    const fullPrompt = `Clear instructional fitness illustration. ${imagePrompt} Simple, clean diagram or figure drawing style. White or light neutral background. No text in the image.`;

    const imageResponse = await openai.images.generate({
      model: "dall-e-3",
      prompt: fullPrompt,
      size: "1024x1024",
      n: 1,
      response_format: "b64_json",
      style: "natural",
    });

    const b64 = imageResponse.data[0]?.b64_json;
    if (!b64) {
      throw new Error("No image data returned");
    }

    const imageDataUrl = `data:image/png;base64,${b64}`;

    try {
      await upsertExerciseCache(nameKey, { imageDataUrl });
    } catch (cacheErr) {
      console.warn("exercise-image: cache save failed", cacheErr);
    }

    return NextResponse.json({ imageDataUrl });
  } catch (err) {
    console.error("exercise-image error:", err);
    return NextResponse.json(
      { error: "Failed to generate exercise image" },
      { status: 500 }
    );
  }
}
