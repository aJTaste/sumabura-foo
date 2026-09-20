import ErrorNote from "@/components/ErrorNote";
import { login, register } from "./actions";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <div className="mx-auto max-w-md space-y-6">
      <ErrorNote message={error} />

      <section className="panel">
        <h1 className="mb-3 text-lg font-bold">ログイン</h1>
        <form action={login} className="space-y-3">
          <div>
            <label className="label" htmlFor="l-username">ユーザー名</label>
            <input id="l-username" name="username" className="input" autoComplete="username" required />
          </div>
          <div>
            <label className="label" htmlFor="l-password">パスワード</label>
            <input id="l-password" name="password" type="password" className="input" autoComplete="current-password" required />
          </div>
          <button className="btn btn-primary w-full">ログイン</button>
        </form>
      </section>

      <section className="panel">
        <h2 className="mb-3 text-lg font-bold">はじめての人はこちら</h2>
        <form action={register} className="space-y-3">
          <div>
            <label className="label" htmlFor="r-username">ユーザー名（半角英数字と _ で3〜20文字）</label>
            <input id="r-username" name="username" className="input" autoComplete="username" required />
          </div>
          <div>
            <label className="label" htmlFor="r-display">表示名（ランキングに出る名前）</label>
            <input id="r-display" name="displayName" className="input" maxLength={20} />
          </div>
          <div>
            <label className="label" htmlFor="r-password">パスワード（8文字以上）</label>
            <input id="r-password" name="password" type="password" className="input" autoComplete="new-password" minLength={8} required />
          </div>
          <div>
            <label className="label" htmlFor="r-invite">合言葉（友達から教えてもらってください）</label>
            <input id="r-invite" name="invite" className="input" required />
          </div>
          <button className="btn btn-primary w-full">登録する</button>
        </form>
      </section>
    </div>
  );
}
