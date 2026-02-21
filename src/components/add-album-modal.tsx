"use client";

import React, { useState, useEffect } from "react";
import { X, Loader2, Search, Plus, RotateCcw } from "lucide-react";
import type { Album } from "@/lib/redis";

interface AddAlbumModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (album: Album) => void;
}

interface ItunesResult {
  collectionName: string;
  artistName: string;
  artworkUrl100: string;
  releaseDate: string;
  primaryGenreName: string;
  collectionId: number;
}

async function searchItunes(artist: string, title: string): Promise<ItunesResult[]> {
  try {
    const q = encodeURIComponent(`${artist} ${title}`);
    const res = await fetch(
      `https://itunes.apple.com/search?term=${q}&entity=album&limit=8`
    );
    const data = await res.json();
    if (!data.results || data.results.length === 0) return [];

    const artistLower = artist.toLowerCase().trim();
    const titleLower = title.toLowerCase().trim();

    const scored = (data.results as ItunesResult[]).map((r) => {
      const rArtist = (r.artistName || "").toLowerCase();
      const rTitle = (r.collectionName || "").toLowerCase();
      let score = 0;

      if (rArtist === artistLower) score += 10;
      else if (rArtist.includes(artistLower) || artistLower.includes(rArtist)) score += 5;

      if (rTitle === titleLower) score += 10;
      else if (rTitle.includes(titleLower) || titleLower.includes(rTitle)) score += 5;

      return { result: r, score };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored.map((s) => s.result);
  } catch (e) {
    console.warn("iTunes search failed:", e);
    return [];
  }
}

export function AddAlbumModal({ isOpen, onClose, onAdd }: AddAlbumModalProps) {
  const [artist, setArtist] = useState("");
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [results, setResults] = useState<ItunesResult[]>([]);
  const [step, setStep] = useState<"search" | "pick">("search");

  useEffect(() => {
    if (isOpen) {
      setArtist("");
      setTitle("");
      setLoading(false);
      setSaving(false);
      setError("");
      setResults([]);
      setStep("search");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!artist.trim() || !title.trim()) return;

    setLoading(true);
    setError("");

    try {
      const found = await searchItunes(artist.trim(), title.trim());
      if (found.length === 0) {
        setError("No albums found on iTunes. Try different spelling.");
      } else {
        setResults(found);
        setStep("pick");
      }
    } catch {
      setError("Search failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handlePick = async (result: ItunesResult) => {
    setSaving(true);
    const albumData = {
      title: result.collectionName,
      artist: result.artistName,
      year: result.releaseDate ? result.releaseDate.substring(0, 4) : "",
      genre: result.primaryGenreName || "",
      coverUrl: result.artworkUrl100
        ? result.artworkUrl100.replace("100x100bb", "600x600bb")
        : "",
    };

    let savedAlbum: Album | null = null;
    try {
      const res = await fetch("/api/albums", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(albumData),
      });
      if (res.ok) savedAlbum = await res.json();
    } catch {
      // Redis unavailable
    }

    const album: Album = savedAlbum ?? {
      id: `local-${Date.now()}`,
      ...albumData,
    };

    onAdd(album);
    setSaving(false);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-zinc-900 border border-white/10 rounded-xl w-full max-w-sm overflow-hidden shadow-2xl">
        <div className="flex justify-between items-center p-4 border-b border-white/5">
          <h3 className="text-base text-white/90" style={{ fontWeight: 100 }}>
            Add Vinyl
          </h3>
          <button
            onClick={onClose}
            className="text-white/40 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {step === "search" ? (
          <form onSubmit={handleSearch} className="p-5 space-y-4">
            <div>
              <label
                className="block text-xs text-white/40 mb-1.5 uppercase tracking-wider"
                style={{ fontWeight: 100 }}
              >
                Artist
              </label>
              <input
                type="text"
                required
                autoFocus
                value={artist}
                onChange={(e) => setArtist(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white/90 focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-white/20 transition-all placeholder:text-white/20"
                style={{ fontWeight: 100 }}
                placeholder="e.g. Drake"
              />
            </div>

            <div>
              <label
                className="block text-xs text-white/40 mb-1.5 uppercase tracking-wider"
                style={{ fontWeight: 100 }}
              >
                Album Name
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white/90 focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-white/20 transition-all placeholder:text-white/20"
                style={{ fontWeight: 100 }}
                placeholder="e.g. Take Care"
              />
            </div>

            {error && (
              <p className="text-[11px] text-red-400/80" style={{ fontWeight: 100 }}>
                {error}
              </p>
            )}

            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2.5 text-white/50 hover:text-white/80 hover:bg-white/5 rounded-lg transition-all"
                style={{ fontWeight: 100 }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !artist.trim() || !title.trim()}
                className="flex-1 px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white/90 rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
                style={{ fontWeight: 100 }}
              >
                {loading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Search size={16} />
                )}
                {loading ? "Searching..." : "Search"}
              </button>
            </div>
          </form>
        ) : (
          <div className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs text-white/40" style={{ fontWeight: 100 }}>
                Pick the correct album:
              </p>
              <button
                onClick={() => { setStep("search"); setResults([]); setError(""); }}
                className="text-xs text-white/40 hover:text-white/70 flex items-center gap-1 transition-colors"
                style={{ fontWeight: 100 }}
              >
                <RotateCcw size={12} /> Back
              </button>
            </div>

            <div className="space-y-1.5 max-h-[320px] overflow-y-auto pr-1">
              {results.map((r) => (
                <button
                  key={r.collectionId}
                  onClick={() => handlePick(r)}
                  disabled={saving}
                  className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-white/5 transition-all text-left group disabled:opacity-50"
                >
                  <img
                    src={r.artworkUrl100}
                    alt={r.collectionName}
                    className="w-12 h-12 rounded object-cover bg-white/5 shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <p
                      className="text-sm text-white/90 truncate"
                      style={{ fontWeight: 100 }}
                    >
                      {r.collectionName}
                    </p>
                    <p
                      className="text-xs text-white/40 truncate"
                      style={{ fontWeight: 100 }}
                    >
                      {r.artistName}
                      {r.releaseDate && ` · ${r.releaseDate.substring(0, 4)}`}
                    </p>
                  </div>
                  <Plus
                    size={16}
                    className="text-white/20 group-hover:text-white/60 shrink-0 transition-colors"
                  />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
