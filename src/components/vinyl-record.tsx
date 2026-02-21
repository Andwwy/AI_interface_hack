"use client";

interface VinylRecordVisualProps {
  isSpinning?: boolean;
}

export function VinylRecordVisual({ isSpinning }: VinylRecordVisualProps) {
  const spinClass = isSpinning ? "animate-spin-slow" : "";

  return (
    <div
      className={`relative w-full h-full rounded-full overflow-hidden ${spinClass}`}
      style={{ background: "#000" }}
    >
      <img
        src="/vinyl.png"
        alt=""
        className="absolute top-1/2 left-1/2 select-none pointer-events-none"
        style={{
          width: "110%",
          height: "110%",
          transform: "translate(-50%, -50%)",
          objectFit: "cover",
        }}
        draggable={false}
      />

      <div
        className="absolute inset-0 rounded-full pointer-events-none"
        style={{
          boxShadow:
            "inset 0 0 0 2px rgba(0,0,0,0.9), inset 0 0 6px 2px rgba(0,0,0,0.5)",
        }}
      />

      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-black z-10"
        style={{
          width: "3.5%",
          height: "3.5%",
          minWidth: "5px",
          minHeight: "5px",
        }}
      />
    </div>
  );
}
