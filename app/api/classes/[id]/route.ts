import { db } from "@/lib/db";
import * as schema from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  console.log("API Route /api/classes/[id] hit");
  try {
    const { id } = await params;
    const [classData] = await db
      .select({
        id: schema.classes.id,
        name: schema.classes.name,
        description: schema.classes.description,
      })
      .from(schema.classes)
      .where(eq(schema.classes.id, id))
      .limit(1);

    if (!classData) {
      return NextResponse.json({ error: "Class not found" }, { status: 404 });
    }

    return NextResponse.json(classData);
  } catch (error) {
    console.error("Error fetching class:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
