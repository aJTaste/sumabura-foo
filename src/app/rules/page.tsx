import Link from "next/link";
import { cookies } from "next/headers";
import { RULES_TITLE, RULES_LEAD, RULES_SECTIONS } from "@/lib/rules";
import { acceptRules } from "./actions";

export default async function RulesPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const accepted = (await cookies()).has("rules_ok");

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <header>
        <h1 className="text-2xl font-bold">{RULES_TITLE}</h1>
        <p className="mt-2">{RULES_LEAD}</p>
      </header>

      {RULES_SECTIONS.map((s) => (
        <section key={s.title} className="panel space-y-2">
          <h2 className="font-bold">{s.title}</h2>
          {s.paragraphs.map((t, i) => (
            <p key={i} className="leading-relaxed">{t}</p>
          ))}
        </section>
      ))}

      {accepted ? (
        <Link href="/" className="btn">ランキングに戻る</Link>
      ) : (
        <form action={acceptRules}>
          <input type="hidden" name="next" value={next ?? "/"} />
          <button className="btn btn-primary px-5 py-2.5 text-base">ルールを確認した</button>
        </form>
      )}
    </div>
  );
}
