export type Round = {
  id: string;
  roundNumber: number;
  startAt: string;
  endAt: string;
  sentence: {
    id: string;
    text: string;
    source: string | null;
  };
};

export type BroadcastPayload = {
  roundId: string;
  userId: string;
  username: string;
  typedText: string;
  correctChars: number;
  typedChars: number;
  wpm: number;
  accuracy: number;
  updatedAt: string;
};

export type PlayerState = {
  userId: string;
  username: string;
  typedText: string;
  correctChars: number;
  typedChars: number;
  wpm: number;
  accuracy: number;
  finished: boolean;
  isOnline: boolean;
  updatedAt: string;
};
