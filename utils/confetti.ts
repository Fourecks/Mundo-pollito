// Add this declaration to avoid TypeScript errors for the global confetti function
declare const confetti: (options: any) => Promise<null>;

export const triggerConfetti = (): void => {
  const count = 200;
  const defaults = {
    origin: { y: 0.7 },
    colors: ['#FBBF24', '#F472B6', '#FEF3C7', '#FFFFFF', '#FB923C']
  };

  const fire = (particleRatio: number, opts: object) => {
    confetti({
      ...defaults,
      ...opts,
      particleCount: Math.floor(count * particleRatio),
    });
  }

  fire(0.25, {
    spread: 26,
    startVelocity: 55,
  });
  fire(0.2, {
    spread: 60,
  });
  fire(0.35, {
    spread: 100,
    decay: 0.91,
    scalar: 0.8,
  });
  fire(0.1, {
    spread: 120,
    startVelocity: 25,
    decay: 0.92,
    scalar: 1.2,
  });
  fire(0.1, {
    spread: 120,
    startVelocity: 45,
  });
};
