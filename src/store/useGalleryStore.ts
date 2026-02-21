import { create } from "zustand";

interface GalleryState {
  selectedIndex: number;
  totalAlbums: number;
  setTotalAlbums: (n: number) => void;
  nextAlbum: () => void;
  prevAlbum: () => void;
  setSelectedIndex: (i: number) => void;
}

export const useGalleryStore = create<GalleryState>((set, get) => ({
  selectedIndex: 0,
  totalAlbums: 0,

  setTotalAlbums: (n) => {
    set({ totalAlbums: n });
    const { selectedIndex } = get();
    if (n > 0 && selectedIndex >= n) set({ selectedIndex: n - 1 });
  },

  nextAlbum: () => {
    const { selectedIndex, totalAlbums } = get();
    if (selectedIndex < totalAlbums - 1) {
      set({ selectedIndex: selectedIndex + 1 });
    }
  },

  prevAlbum: () => {
    const { selectedIndex } = get();
    if (selectedIndex > 0) {
      set({ selectedIndex: selectedIndex - 1 });
    }
  },

  setSelectedIndex: (i) => set({ selectedIndex: i }),
}));
