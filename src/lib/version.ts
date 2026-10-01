// アプリのバージョンと更新内容。
// 更新するときは、RELEASES の「先頭」に新しい版を追加するだけです。
// 先頭が「現在のバージョン」になり、ヘッダーの表示と更新内容ダイアログに反映されます。
// date は "YYYY-MM-DD" 形式で書きます。
export type Release = { version: string; date: string; items: string[] };

export const RELEASES: Release[] = [
  {
    version: "1.0.0",
    date: "2026-10-01",
    items: [
      "バージョン表記を追加しました（ヘッダーのバージョンをタップすると、この画面が開きます）",
      "画面の表示速度を改善しました",
      "サイトのアイコンを変更しました",
    ],
  },
];

export const LATEST_RELEASE: Release = RELEASES[0];
export const APP_VERSION = LATEST_RELEASE.version;
