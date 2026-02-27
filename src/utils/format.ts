export function formatWpm(wpm: number): string {
  return wpm.toFixed(1);
}

export function formatAccuracy(accuracy: number): string {
  return `${(accuracy * 100).toFixed(1)}%`;
}

export function formatSeconds(seconds: number): string {
  return String(seconds).padStart(2, "0");
}
