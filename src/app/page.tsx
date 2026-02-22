"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Plus, Disc, ChevronLeft, ChevronRight } from "lucide-react";
import dynamic from "next/dynamic";
import { useGalleryStore } from "@/store/useGalleryStore";
import { VinylRecordVisual } from "@/components/vinyl-record";
import { LiquidGradient } from "@/components/liquid-gradient";
import { useColorExtractor } from "@/components/use-color-extractor";
import { getCoverStyle } from "@/components/use-coverflow";
import { AddAlbumModal } from "@/components/add-album-modal";
import type { Album } from "@/lib/redis";

const GestureController = dynamic(
  () => import("@/components/gesture-controller"),
  { ssr: false }
);

const PLACEHOLDER_COVER =
  "https://placehold.co/400x400/1a1a2e/4a4a6a?text=No+Cover";

const DEFAULT_ALBUMS: Album[] = [
  { id: "default-1", title: "WASTELAND", artist: "Brent Faiyaz", year: "2022", genre: "R&B/Soul", coverUrl: "https://is1-ssl.mzstatic.com/image/thumb/Music112/v4/30/1b/30/301b30ef-9bb5-8fbd-6bdc-30552aefd0c6/8DrDvnuaSqqztj1vOGwY_Wasteland-Final6.jpg/600x600bb.jpg" },
  { id: "default-3", title: "Son Of Spergy", artist: "Daniel Caesar", year: "2025", genre: "R&B/Soul", coverUrl: "https://is1-ssl.mzstatic.com/image/thumb/Music221/v4/83/ca/bb/83cabb97-8289-4a91-4d3b-4760b64d2971/25UMGIM90844.rgb.jpg/600x600bb.jpg" },
  { id: "default-4", title: "Take Care (Deluxe Version)", artist: "Drake", year: "2011", genre: "Hip-Hop/Rap", coverUrl: "https://is1-ssl.mzstatic.com/image/thumb/Music124/v4/d2/53/62/d2536245-b94c-b3fd-7168-9512f655f6d4/00602527899091.rgb.jpg/600x600bb.jpg" },
  { id: "default-5", title: "ten", artist: "Fred again.. & Jozzy", year: "2023", genre: "Electronic", coverUrl: "https://is1-ssl.mzstatic.com/image/thumb/Music116/v4/e7/09/da/e709da20-1748-1845-b304-422667d242e4/5054197812194.jpg/600x600bb.jpg" },
  { id: "default-6", title: "808s & Heartbreak", artist: "Kanye West", year: "2008", genre: "Hip-Hop/Rap", coverUrl: "https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/4d/75/2d/4d752db1-022d-f65d-40a1-a2390f01427a/13UAEIM26465.rgb.jpg/600x600bb.jpg" },
  { id: "default-7", title: "The Best of Sade", artist: "Sade", year: "1994", genre: "R&B/Soul", coverUrl: "https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/5f/ad/2a/5fad2aca-d998-701d-7b27-c074339d5fd0/886972262628.jpg/600x600bb.jpg" },
];

async function fetchItunesCover(artist: string, title: string): Promise<{ coverUrl: string; year: string; genre: string } | null> {
  try {
    const q = encodeURIComponent(`${artist} ${title}`);
    const res = await fetch(`https://itunes.apple.com/search?term=${q}&entity=album&limit=5`);
    const data = await res.json();
    if (data.results?.length > 0) {
      const titleLower = title.toLowerCase();
      const match =
        data.results.find((r: Record<string, string>) => r.collectionName?.toLowerCase() === titleLower) ??
        data.results.find((r: Record<string, string>) => r.collectionName?.toLowerCase().includes(titleLower)) ??
        data.results[0];
      return {
        coverUrl: match.artworkUrl100?.replace("100x100bb", "600x600bb") || "",
        year: match.releaseDate ? match.releaseDate.substring(0, 4) : "",
        genre: match.primaryGenreName || "",
      };
    }
  } catch (e) {
    console.warn("iTunes fetch failed:", e);
  }
  return null;
}

export default function GalleryPage() {
  const [albums, setAlbums] = useState<Album[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showSplash, setShowSplash] = useState(true);
  const [splashFading, setSplashFading] = useState(false);

  useEffect(() => {
    const fadeTimer = setTimeout(() => setSplashFading(true), 2400);
    const hideTimer = setTimeout(() => setShowSplash(false), 3200);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(hideTimer);
    };
  }, []);

  const {
    selectedIndex,
    setSelectedIndex,
    nextAlbum,
    prevAlbum,
    setTotalAlbums,
  } = useGalleryStore();

  const activeAlbum = albums[selectedIndex] ?? null;

  // Load from Redis, fall back to hardcoded defaults
  useEffect(() => {
    fetch("/api/albums")
      .then((res) => res.json())
      .then((data: Album[]) => {
        if (data.length > 0) {
          setAlbums(data);
          setTotalAlbums(data.length);
        } else {
          setAlbums(DEFAULT_ALBUMS);
          setTotalAlbums(DEFAULT_ALBUMS.length);
        }
      })
      .catch(() => {
        setAlbums(DEFAULT_ALBUMS);
        setTotalAlbums(DEFAULT_ALBUMS.length);
      })
      .finally(() => setIsLoading(false));
  }, [setTotalAlbums]);

  // Fetch cover art from iTunes for any album missing a cover
  useEffect(() => {
    if (albums.length === 0) return;
    let cancelled = false;

    const fetchCovers = async () => {
      for (let i = 0; i < albums.length; i++) {
        if (cancelled) break;
        if (albums[i].coverUrl) continue;
        const result = await fetchItunesCover(albums[i].artist, albums[i].title);
        if (cancelled) break;
        if (result) {
          setAlbums((prev) =>
            prev.map((a, idx) =>
              idx === i && !a.coverUrl
                ? { ...a, coverUrl: result.coverUrl, year: a.year || result.year, genre: a.genre || result.genre }
                : a
            )
          );
        }
        if (i < albums.length - 1) await new Promise((r) => setTimeout(r, 150));
      }
    };

    fetchCovers();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [albums.length]);

  useEffect(() => {
    if (isModalOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") nextAlbum();
      if (e.key === "ArrowLeft") prevAlbum();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isModalOpen, nextAlbum, prevAlbum]);

  const onWheel = useCallback(
    (e: React.WheelEvent) => {
      if (Math.abs(e.deltaY) > 10) {
        e.deltaY > 0 ? nextAlbum() : prevAlbum();
      }
    },
    [nextAlbum, prevAlbum]
  );

  const currentCoverUrl = useMemo(
    () => [activeAlbum?.coverUrl || PLACEHOLDER_COVER],
    [activeAlbum?.coverUrl]
  );

  const extractedColors = useColorExtractor(currentCoverUrl);

  const gradientColors = useMemo((): [string, string, string] => {
    const tuple = extractedColors[0];
    if (tuple && tuple[0] !== "#667788") return tuple;
    return ["#667788", "#556677", "#445566"];
  }, [extractedColors]);

  const handleAdd = useCallback(
    (album: Album) => {
      setAlbums((prev) => {
        const updated = [...prev, album].sort((a, b) =>
          a.artist.localeCompare(b.artist)
        );
        setTotalAlbums(updated.length);
        const newIndex = updated.findIndex((a) => a.id === album.id);
        if (newIndex >= 0) setSelectedIndex(newIndex);
        return updated;
      });
    },
    [setTotalAlbums, setSelectedIndex]
  );

  return (
    <div
      className="relative h-screen bg-black text-white overflow-hidden select-none"
      style={{
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
        fontWeight: 100,
      }}
    >
      <LiquidGradient colors={gradientColors} />

      {/* Add button — top right */}
      <button
        onClick={() => setIsModalOpen(true)}
        className="absolute top-5 right-5 z-30 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 flex items-center justify-center transition-all hover:scale-110 active:scale-95"
        title="Add Vinyl"
      >
        <Plus size={18} className="text-white/70" />
      </button>

      {/* Coverflow */}
      <div
        className="absolute inset-0 flex items-center justify-center z-10"
        onWheel={onWheel}
        style={{ perspective: "1000px" }}
      >
        {isLoading ? (
          <div
            className="text-white/50 text-sm"
            style={{ fontWeight: 100 }}
          >
            Loading collection…
          </div>
        ) : albums.length === 0 ? (
          <EmptyState onAdd={() => setIsModalOpen(true)} />
        ) : (
          <div
            className="relative w-full h-[320px] md:h-[400px]"
            style={{ transformStyle: "preserve-3d" }}
          >
            {albums.map((album, index) => {
              if (Math.abs(selectedIndex - index) > 6) return null;
              const isSelected = index === selectedIndex;

              return (
                <div
                  key={album.id}
                  className="absolute w-48 h-48 md:w-64 md:h-64 cursor-pointer group"
                  style={{
                    ...getCoverStyle(index, selectedIndex),
                    left: "50%",
                    top: "calc(50% - 10px)",
                  }}
                  onClick={() => setSelectedIndex(index)}
                >
                  {isSelected && (
                    <div className="absolute inset-0 z-[-1] transition-transform duration-700 ease-out group-hover:translate-x-[45%] flex items-center justify-center">
                      <div className="w-[90%] h-[90%]">
                        <VinylRecordVisual isSpinning />
                      </div>
                    </div>
                  )}

                  <div
                    className="relative w-full h-full bg-white overflow-hidden shadow-none"
                    style={{ borderRadius: "2px" }}
                  >
                    <img
                      src={album.coverUrl || PLACEHOLDER_COVER}
                      alt={album.title}
                      className="w-full h-full object-cover select-none"
                      style={{ borderRadius: "2px" }}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = PLACEHOLDER_COVER;
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Bottom Info */}
      <div className="absolute bottom-0 left-0 right-0 pb-16 pt-8 flex flex-col items-center justify-center z-30 pointer-events-none">
        {activeAlbum && (
          <div className="text-center space-y-2 max-w-lg px-6">
            <h1
              className="text-[1.125rem] md:text-[1.25rem] text-white tracking-tight drop-shadow-lg"
              style={{ fontWeight: 100, lineHeight: 1 }}
            >
              {activeAlbum.title}
            </h1>
            <h2
              className="text-xs md:text-sm text-white/70 tracking-tight drop-shadow-md"
              style={{ fontWeight: 100 }}
            >
              {activeAlbum.artist}
            </h2>
            <div className="flex items-center justify-center gap-3 mt-4 opacity-70">
              {activeAlbum.genre && (
                <>
                  <span
                    className="text-xs text-white/50 drop-shadow"
                    style={{ fontWeight: 100 }}
                  >
                    {activeAlbum.genre}
                  </span>
                  <span
                    className="text-white/30 drop-shadow"
                    style={{ fontWeight: 100 }}
                  >
                    &bull;
                  </span>
                </>
              )}
              {activeAlbum.year && (
                <span
                  className="text-xs text-white/50 drop-shadow"
                  style={{ fontWeight: 100 }}
                >
                  {activeAlbum.year}
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Mobile Nav */}
      <div className="md:hidden flex justify-between px-4 absolute top-1/2 -translate-y-1/2 w-full z-20 pointer-events-none">
        <button
          onClick={prevAlbum}
          className="pointer-events-auto p-4 text-white/40 hover:text-white transition-colors drop-shadow-lg"
        >
          <ChevronLeft size={32} />
        </button>
        <button
          onClick={nextAlbum}
          className="pointer-events-auto p-4 text-white/40 hover:text-white transition-colors drop-shadow-lg"
        >
          <ChevronRight size={32} />
        </button>
      </div>

      {/* Add Modal */}
      <AddAlbumModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAdd={handleAdd}
      />

      {/* Gesture Controller (headless — swipe to browse) */}
      <GestureController />

      {/* Splash screen */}
      {showSplash && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#e8e8e8]"
          style={{
            transition: "opacity 0.8s ease-out",
            opacity: splashFading ? 0 : 1,
          }}
        >
          <img
            src="/splash.png"
            alt="Use index finger hand gesture for browsing"
            className="max-w-[80%] max-h-[80%] object-contain"
          />
        </div>
      )}
    </div>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="text-center space-y-6 z-10">
      <div className="w-48 h-48 mx-auto bg-white/5 border-2 border-dashed border-white/10 rounded-2xl flex items-center justify-center">
        <Disc size={48} className="text-white/20" />
      </div>
      <div>
        <h2
          className="text-[1.25rem] text-white/80"
          style={{ fontWeight: 100 }}
        >
          Your Collection is Empty
        </h2>
        <p
          className="text-white/40 text-sm mt-1"
          style={{ fontWeight: 100 }}
        >
          Add your first vinyl record.
        </p>
      </div>
      <button
        onClick={onAdd}
        className="px-6 py-2.5 bg-white/10 hover:bg-white/20 text-white/80 rounded-full text-sm transition-all active:scale-95 backdrop-blur-md border border-white/20"
        style={{ fontWeight: 100 }}
      >
        Add First Vinyl
      </button>
    </div>
  );
}
