import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md space-y-4 py-10 text-center">
      <p className="text-5xl" aria-hidden>🔍</p>
      <h1 className="text-xl font-bold">ページが見つかりません</h1>
      <p className="text-sm text-mute">URLが間違っているか、ページが削除された可能性があります。</p>
      <Link href="/" className="btn btn-primary">ランキングに戻る</Link>
    </div>
  );
}
