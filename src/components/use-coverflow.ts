export function getCoverStyle(index: number, selectedIndex: number) {
  const diff = index - selectedIndex;

  if (diff === 0) {
    return {
      transform: "translate(-50%, -50%) translateZ(100px) rotateY(0deg)",
      zIndex: 100,
      opacity: 1,
      transition: "all 0.4s cubic-bezier(0.25, 1, 0.5, 1)",
    };
  }

  const sign = diff < 0 ? -1 : 1;
  const absDiff = Math.abs(diff);

  return {
    transform: `translate(-50%, -50%) translate3d(${sign * (80 + absDiff * 80)}px, 0, -250px) rotateY(${-sign * 55}deg)`,
    zIndex: 10 - absDiff,
    opacity: 1,
    transition: "all 0.4s cubic-bezier(0.25, 1, 0.5, 1)",
  };
}
