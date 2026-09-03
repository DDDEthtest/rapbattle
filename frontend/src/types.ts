export type RapperId = "a" | "b";

export type Personality =
  | "Cocky"
  | "Witty"
  | "Aggressive"
  | "Chill"
  | "Philosophical"
  | "Playful"
  | "Boastful"
  | "Underdog";

export type RapStyle =
  | "Boom bap"
  | "Trap"
  | "Drill"
  | "Old school"
  | "Melodic"
  | "Grime"
  | "Conscious"
  | "Party";

export type LanguageCode = "pt-BR" | "en" | "it";

export interface RapperConfig {
  name: string;
  personality: Personality;
  style: RapStyle;
  language: LanguageCode;
  voiceId: string;
}

export interface VoiceOption {
  id: string;
  name: string;
  labels: string;
}

export interface JudgeVerdict {
  winner: RapperId;
  winnerName: string;
  scores: {
    punchlines: number;
    rebuttal: number;
    style: number;
  };
  critique: string;
  announcerLine: string;
}

export interface TurnState {
  id: string;
  rapper: RapperId;
  round: number;
  name: string;
  lyrics: string;
  audioChunks: Uint8Array[];
  done: boolean;
}

export const PERSONALITIES: Personality[] = [
  "Cocky",
  "Witty",
  "Aggressive",
  "Chill",
  "Philosophical",
  "Playful",
  "Boastful",
  "Underdog",
];

export const RAP_STYLES: RapStyle[] = [
  "Boom bap",
  "Trap",
  "Drill",
  "Old school",
  "Melodic",
  "Grime",
  "Conscious",
  "Party",
];

export const LANGUAGES: { code: LanguageCode; label: string }[] = [
  { code: "pt-BR", label: "Brazilian Portuguese" },
  { code: "en", label: "English" },
  { code: "it", label: "Italian" },
];

export const DEFAULT_A: RapperConfig = {
  name: "Víscera",
  personality: "Aggressive",
  style: "Trap",
  language: "pt-BR",
  voiceId: "N2lVS1w4EtoT3dr4eOWO",
};

export const DEFAULT_B: RapperConfig = {
  name: "Coldframe",
  personality: "Witty",
  style: "Boom bap",
  language: "en",
  voiceId: "JBFqnCBsd6RMkjVDRZzb",
};
