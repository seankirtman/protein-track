import { NextResponse } from "next/server";
import { upsertFoodLookupCache } from "@/lib/database";

interface RequestBody {
  foodName: string;
  quantity?: string;
  protein: number;
  calories: number;
}

export async function POST(req: Request) {
  try {
    const body: RequestBody = await req.json();
    const { foodName, quantity, protein, calories } = body;

    if (!foodName?.trim()) {
      return NextResponse.json({ error: "Food name is required" }, { status: 400 });
    }
    if (
      !Number.isFinite(protein) ||
      !Number.isFinite(calories) ||
      protein < 0 ||
      calories < 0
    ) {
      return NextResponse.json(
        { error: "Valid protein and calories are required" },
        { status: 400 }
      );
    }

    await upsertFoodLookupCache({
      foodName: foodName.trim(),
      quantity: quantity?.trim() || undefined,
      protein,
      calories,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("food-cache error:", err);
    return NextResponse.json(
      { error: "Failed to cache food" },
      { status: 500 }
    );
  }
}
