import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface GeneratedSet {
  reps?: number;
  weight?: number;
  distance?: number;
  time?: number;
}

interface GeneratedExercise {
  name: string;
  type: "strength" | "cardio";
  sets: GeneratedSet[];
}

interface RequestBody {
  userInput: string;
  durationMinutes?: number;
}

export async function POST(req: Request) {
  try {
    const body: RequestBody = await req.json();
    const { userInput, durationMinutes = 30 } = body;

    const systemPrompt = `You are a knowledgeable personal trainer creating workout plans for a home/lighter gym setup.

EQUIPMENT AVAILABLE (use ONLY these):
- Dumbbells: up to 25 lbs each
- Bench press bar (standard bar)
- Squat rack
- Olympic bar: up to 75 lbs per side (150 lbs total)
- Ab area (floor space for planks, etc.)
- Sit-up bench / decline bench

TARGET: Design a workout that takes approximately ${durationMinutes} minutes to complete (unless the user specifies a different duration). Account for rest between sets (~60–90 sec).

OUTPUT: Respond with ONLY a valid JSON object (no markdown, no extra text):
{
  "exercises": [
    {
      "name": "<exercise name>",
      "type": "strength" | "cardio",
      "sets": [
        {"reps": <number>, "weight": <number>}  // for strength
        // OR {"distance": <miles>, "time": <minutes>} for cardio
      ]
    }
  ]
}

RULES:
- For strength: 3–4 sets per exercise. Use reps in 8–15 range typically. Weight in lbs matching the equipment limits.
- For cardio: use type "cardio", sets with "distance" (miles) and/or "time" (minutes). One set is fine for cardio blocks.
- Use common exercise names (e.g. "Bench Press", "Squat", "Dumbbell Row", "Plank", "Sit-up").
- Match the user's stated goals (e.g. "upper body", "leg day", "full body", "abs", "quick cardio").
- Keep total exercises reasonable: 4–8 for a 30-min session. Fewer if user wants longer rests or heavier work.`;

    const userPrompt = `User's request: "${userInput || "Give me a general full-body workout"}"

Generate a workout that accomplishes their goals using only the equipment listed. Default to ~${durationMinutes} minutes unless they asked for a specific duration.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-5-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });

    const content = completion.choices[0]?.message?.content?.trim();
    if (!content) throw new Error("No response from AI");

    const parsed = JSON.parse(content) as {
      exercises: GeneratedExercise[];
    };

    if (!Array.isArray(parsed.exercises) || parsed.exercises.length === 0) {
      throw new Error("Invalid workout format");
    }

    // Normalize: ensure each exercise has valid sets
    const exercises = parsed.exercises.map((ex) => {
      const isCardio = ex.type === "cardio";
      const defaultSet = isCardio ? { distance: 0, time: 0 } : { reps: 0, weight: 0 };
      const rawSets = ex.sets && ex.sets.length > 0 ? ex.sets : [defaultSet];
      const sets = rawSets.map((s) =>
        isCardio
          ? { distance: s.distance ?? 0, time: s.time ?? 0 }
          : { reps: s.reps ?? 0, weight: s.weight ?? 0 }
      );
      return { ...ex, sets };
    });

    return NextResponse.json({ exercises });
  } catch (err) {
    console.error("workout-generate error:", err);
    return NextResponse.json(
      { error: "Failed to generate workout" },
      { status: 500 }
    );
  }
}
