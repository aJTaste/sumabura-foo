// 「勝った / 負けた」ボタン。2本先取のマッチ全体の結果だけを入力する（各ゲームの結果は不要）。
export default function ResultButtons({
  action,
  matchId,
  extra,
  myReport,
}: {
  action: (formData: FormData) => void | Promise<void>;
  matchId: string;
  extra?: Record<string, string>;
  myReport: string | null;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {(
        [
          ["win", "勝った"],
          ["lose", "負けた"],
        ] as const
      ).map(([value, label]) => (
        <form key={value} action={action}>
          <input type="hidden" name="matchId" value={matchId} />
          <input type="hidden" name="result" value={value} />
          {Object.entries(extra ?? {}).map(([k, v]) => (
            <input key={k} type="hidden" name={k} value={v} />
          ))}
          <button
            className={`btn w-full py-3 text-base ${myReport === value ? "btn-primary" : ""}`}
            aria-current={myReport === value}
          >
            {label}
          </button>
        </form>
      ))}
    </div>
  );
}
