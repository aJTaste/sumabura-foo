// ステージの一覧。拒否されているステージは取り消し線と文字で区別する。
export default function StageList({
  title,
  note,
  stages,
  mine,
  theirs,
}: {
  title: string;
  note?: string;
  stages: readonly string[];
  mine: string[];
  theirs: string[];
}) {
  return (
    <section className="panel">
      <h3 className="mb-2 font-bold">{title}</h3>
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {stages.map((s) => {
          const m = mine.includes(s);
          const t = theirs.includes(s);
          const banned = m || t;
          return (
            <li
              key={s}
              className={`rounded-md border px-3 py-2 text-sm ${
                banned ? "border-lose/30 bg-lose/5 text-mute" : "border-win/40 bg-win/5"
              }`}
            >
              <div className={banned ? "line-through" : "font-medium"}>{s}</div>
              {banned && <div className="text-xs text-lose">{m && t ? "両者が拒否" : m ? "あなたが拒否" : "相手が拒否"}</div>}
            </li>
          );
        })}
      </ul>
      {note && <p className="mt-2 text-xs text-mute">{note}</p>}
    </section>
  );
}
