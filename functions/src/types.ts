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

export interface BattleRequest {
  rapperA: RapperConfig;
  rapperB: RapperConfig;
}

export interface VoiceOption {
  id: string;
  name: string;
  labels: string;
}

export interface JudgeVerdict {
  winner: RapperId;
  scores: {
    punchlines: number;
    rebuttal: number;
    style: number;
  };
  critique: string;
  announcerLine: string;
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

export const LANGUAGE_LABEL: Record<LanguageCode, string> = {
  "pt-BR": "Brazilian Portuguese",
  en: "English",
  it: "Italian",
};

/** ElevenLabs language_code for Flash multilingual TTS */
export const ELEVEN_LANG: Record<LanguageCode, string> = {
  "pt-BR": "pt",
  en: "en",
  it: "it",
};
