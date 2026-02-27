export type SentenceRow = {
  id: string;
  text: string;
  source: string | null;
  created_at: string;
};

export type RoundRow = {
  id: string;
  sentence_id: string;
  round_number: number;
  start_at: string;
  end_at: string;
  created_at: string;
};

export type ProfileRow = {
  user_id: string;
  username: string;
  created_at: string;
};

export type RoundResultRow = {
  id: string;
  round_id: string;
  user_id: string;
  username: string;
  typed_text: string;
  correct_chars: number;
  accuracy: number;
  wpm: number;
  finished: boolean;
  created_at: string;
  updated_at: string;
};
