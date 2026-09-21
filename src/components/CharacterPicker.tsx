"use client";

import { useState } from "react";

// 変更キャラなど、複数のキャラを選ぶための入力欄。選んだキャラは hidden で送信される。
export default function CharacterPicker({
  name,
  options,
  initial,
  max,
}: {
  name: string;
  options: readonly string[];
  initial: string[];
  max: number;
}) {
  const [chosen, setChosen] = useState<string[]>(initial);
  const remaining = options.filter((o) => !chosen.includes(o));
  const full = chosen.length >= max;

  return (
    <div>
      <ul className="mb-2 flex flex-wrap gap-2">
        {chosen.map((c) => (
          <li key={c} className="inline-flex items-center gap-1 rounded-full border border-line bg-paper py-1 pl-3 pr-1.5 text-sm">
            {c}
            <button
              type="button"
              aria-label={`${c}を外す`}
              className="rounded-full px-1.5 text-mute hover:text-lose"
              onClick={() => setChosen(chosen.filter((x) => x !== c))}
            >
              ×
            </button>
            <input type="hidden" name={name} value={c} />
          </li>
        ))}
        {chosen.length === 0 && <li className="text-sm text-mute">まだ選ばれていません</li>}
      </ul>
      <select
        className="input"
        value=""
        disabled={full}
        aria-label="キャラを追加"
        onChange={(e) => e.target.value && setChosen([...chosen, e.target.value])}
      >
        <option value="">{full ? `上限（${max}体）に達しました` : "キャラを追加する"}</option>
        {remaining.map((c) => (
          <option key={c} value={c}>{c}</option>
        ))}
      </select>
      <p className="num mt-1 text-xs text-mute">{chosen.length}/{max}体</p>
    </div>
  );
}
