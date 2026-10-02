"use client";

import { logout } from "@/app/actions";
import SubmitButton from "@/components/SubmitButton";
import { releaseThisDevicePush } from "@/lib/push-client";

// ログアウトのボタン。
// ログアウトの前に、この端末の通知の購読を手放す（次にこの端末を使う人へ、前のユーザー宛の通知が届かないように）。
export default function LogoutForm() {
  async function action() {
    await releaseThisDevicePush(); // 失敗しても、ログアウトはそのまま行う
    await logout();
  }

  return (
    <form action={action}>
      <SubmitButton className="btn min-h-9 px-2.5">ログアウト</SubmitButton>
    </form>
  );
}
