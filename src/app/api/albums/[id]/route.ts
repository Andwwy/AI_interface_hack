import { NextResponse } from "next/server";
import { getRedis, type Album } from "@/lib/redis";

export const dynamic = "force-dynamic";

const REDIS_KEY = "vinyl:albums";

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const redis = getRedis();
    const albums = (await redis.get<Album[]>(REDIS_KEY)) ?? [];
    const filtered = albums.filter((a) => a.id !== params.id);
    await redis.set(REDIS_KEY, filtered);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete album:", error);
    return NextResponse.json(
      { error: "Failed to delete album" },
      { status: 500 }
    );
  }
}
