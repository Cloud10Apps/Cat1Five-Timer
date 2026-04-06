import confetti from "canvas-confetti";

export function fireCompletionConfetti() {
  const colors = ["#22c55e", "#16a34a", "#fbbf24", "#f59e0b", "#34d399", "#6ee7b7", "#fde68a"];

  confetti({
    particleCount: 80,
    spread: 70,
    origin: { x: 0.35, y: 0.6 },
    colors,
    angle: 60,
    startVelocity: 45,
    decay: 0.92,
    scalar: 1.1,
  });

  confetti({
    particleCount: 80,
    spread: 70,
    origin: { x: 0.65, y: 0.6 },
    colors,
    angle: 120,
    startVelocity: 45,
    decay: 0.92,
    scalar: 1.1,
  });
}
