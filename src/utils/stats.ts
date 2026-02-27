export type TypingStats = {
  correctChars: number;
  accuracy: number; // 0–1
  wpm: number;
};

/**
 * Compute WPM, accuracy, and correct character count.
 *
 * Position-based correctness: typed[i] === sentence[i].
 * WPM = (correctChars / 5) / minutes.
 * Clamped: elapsed < 1 second → wpm = 0.
 */
export function computeStats(
  typed: string,
  sentence: string,
  elapsedSeconds: number,
): TypingStats {
  const capped = typed.slice(0, sentence.length);

  let correctChars = 0;
  for (let i = 0; i < capped.length; i++) {
    if (capped[i] === sentence[i]) correctChars++;
  }

  const accuracy = sentence.length > 0 ? correctChars / sentence.length : 0;

  let wpm = 0;
  if (elapsedSeconds >= 1) {
    const minutes = elapsedSeconds / 60;
    wpm = correctChars / 5 / minutes;
  }

  return { correctChars, accuracy, wpm };
}
