import { createClient } from "@/lib/supabase/server";
import ErrorNote from "@/components/ErrorNote";
import { fmtDateTime } from "@/lib/types";
import { postAnnouncement, deleteAnnouncement } from "./actions";

export default async function NewsPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: me } = await supabase.from("profiles").select("is_admin").eq("id", user!.id).single();
  const isAdmin = !!me?.is_admin;

  const { data } = await supabase
    .from("announcements")
    .select("id, title, body, created_at")
    .order("created_at", { ascending: false })
    .limit(50);
  const items = data ?? [];

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">お知らせ</h1>
      <ErrorNote message={error} />

      {isAdmin && (
        <form action={postAnnouncement} className="panel space-y-3">
          <h2 className="font-bold">お知らせを投稿する（管理者）</h2>
          <div>
            <label className="label" htmlFor="title">タイトル</label>
            <input id="title" name="title" className="input" maxLength={100} required />
          </div>
          <div>
            <label className="label" htmlFor="body">本文（2000文字まで）</label>
            <textarea id="body" name="body" className="input" rows={5} maxLength={2000} />
          </div>
          <button className="btn btn-primary">投稿する</button>
        </form>
      )}

      {items.length === 0 && <p className="panel text-sm text-mute">お知らせはまだありません。</p>}
      {items.map((a) => (
        <article key={a.id} className="panel">
          <div className="flex flex-wrap items-baseline gap-x-3">
            <h2 className="font-bold">{a.title}</h2>
            <time className="text-xs text-mute" dateTime={a.created_at}>{fmtDateTime(a.created_at)}</time>
          </div>
          {a.body && <p className="mt-2 whitespace-pre-wrap leading-relaxed">{a.body}</p>}
          {isAdmin && (
            <form action={deleteAnnouncement} className="mt-3">
              <input type="hidden" name="id" value={a.id} />
              <button className="btn btn-danger">削除する</button>
            </form>
          )}
        </article>
      ))}
    </div>
  );
}
