// ステージ一覧。ここを編集すると、拒否ステージの設定と対戦画面の表に反映されます。
// 1戦目に使えるステージ
export const GAME1_STAGES = ["戦場", "終点", "ポケスタ2", "小戦場", "ホロバスティオン", "村と街"] as const;
// 2戦目以降に使えるステージ（1戦目のステージ + すま村）
export const LATER_STAGES = [...GAME1_STAGES, "すま村"] as const;
// 拒否ステージとして選べるステージ
export const STAGES = LATER_STAGES;

export const MAX_BANNED_STAGES = 2;
export const MAX_ALT_CHARACTERS = 10;
