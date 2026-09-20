import { redirect } from "next/navigation";

// フォームの hidden "back" 欄から戻り先を取り出す（外部URLへのリダイレクトは拒否）
export function safeBack(v: FormDataEntryValue | null, fallback: string): string {
  const s = String(v ?? "");
  return s.startsWith("/") && !s.startsWith("//") ? s : fallback;
}

export function redirectWithError(back: string, message: string): never {
  redirect(`${back}${back.includes("?") ? "&" : "?"}error=${encodeURIComponent(message)}`);
}
