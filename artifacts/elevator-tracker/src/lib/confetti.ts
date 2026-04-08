import confetti from "canvas-confetti";

export function fireCompletionConfetti() {
  const scalar = 3;
  const thumbsUp = confetti.shapeFromText({ text: "👍", scalar });

  confetti({
    particleCount: 40,
    spread: 80,
    origin: { x: 0.35, y: 0.6 },
    angle: 60,
    startVelocity: 45,
    decay: 0.9,
    scalar,
    shapes: [thumbsUp],
    flat: true,
  });

  confetti({
    particleCount: 40,
    spread: 80,
    origin: { x: 0.65, y: 0.6 },
    angle: 120,
    startVelocity: 45,
    decay: 0.9,
    scalar,
    shapes: [thumbsUp],
    flat: true,
  });
}
