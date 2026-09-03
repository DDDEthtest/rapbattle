export interface BattleHandlers {
  onEvent: (event: string, data: unknown) => void;
}
