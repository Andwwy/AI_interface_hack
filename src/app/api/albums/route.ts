import { NextResponse } from "next/server";
import { getRedis, type Album } from "@/lib/redis";
import { randomUUID } from "crypto";

export const dynamic = "force-dynamic";

const REDIS_KEY = "vinyl:albums";

export async function GET() {
  try {
    const redis = getRedis();
    const albums = await redis.get<Album[]>(REDIS_KEY);
    const sorted = (albums ?? []).sort((a, b) =>
      a.artist.localeCompare(b.artist)
    );
    return NextResponse.json(sorted);
  } catch (error) {
    console.error("Failed to fetch albums:", error);
    return NextResponse.json([], { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const redis = getRedis();
    const body = await request.json();
    const album: Album = {
      id: randomUUID(),
      title: body.title,
      artist: body.artist,
      year: body.year || "",
      genre: body.genre || "",
      coverUrl: body.coverUrl || "",
    };
    const albums = (await redis.get<Album[]>(REDIS_KEY)) ?? [];
    albums.push(album);
    await redis.set(REDIS_KEY, albums);
    return NextResponse.json(album, { status: 201 });
  } catch (error) {
    console.error("Failed to add album:", error);
    return NextResponse.json(
      { error: "Failed to add album" },
      { status: 500 }
    );
  }
}
