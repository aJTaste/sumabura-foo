import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    }
  );

  // すべてのリクエストで通るので、ここは軽くしておく。
  // getUser() は毎回 Auth サーバーへ問い合わせるが、getClaims() は JWT をその場で検証する
  // （期限が近いときのトークン更新は、これまで通りここで行われる）。
  const { data } = await supabase.auth.getClaims();
  const signedIn = !!data?.claims;

  const path = request.nextUrl.pathname;
  const onLogin = path.startsWith("/login");
  const onRules = path.startsWith("/rules");
  const onApi = path.startsWith("/api/");

  if (!signedIn && !onLogin) {
    // fetch から呼ばれる API には、ログイン画面のHTMLではなく 401 を返す
    if (onApi) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }
  if (signedIn && onLogin) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }

  // ログインするたびにルールを表示する（確認するまで他のページには進めない）
  const isServerAction = request.headers.has("next-action");
  if (signedIn && !onRules && !onApi && !isServerAction && !request.cookies.has("rules_ok")) {
    const url = request.nextUrl.clone();
    url.pathname = "/rules";
    url.search = `?next=${encodeURIComponent(path + request.nextUrl.search)}`;
    return NextResponse.redirect(url);
  }
  return response;
}

// ログインの有無にかかわらず、そのまま返すファイル（アイコンなど）は middleware を通さない。
// 通すと、ログイン前・ルール確認前はログイン画面やルール画面へ飛ばされ、アイコンが表示されない。
// PWA 化で増える manifest・Service Worker・アイコン類も、ここに含めてある。
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|icon\\.png|apple-icon\\.png|manifest\\.webmanifest|sw\\.js|offline\\.html|icons/).*)",
  ],
};
