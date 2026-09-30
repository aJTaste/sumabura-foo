"use client";

import { useFormStatus } from "react-dom";
import type { ButtonHTMLAttributes } from "react";

// 送信中はボタンを無効にして、くるくるを表示する（押したのに何も起きない、をなくす）
export default function SubmitButton({ children, disabled, ...rest }: ButtonHTMLAttributes<HTMLButtonElement>) {
  const { pending } = useFormStatus();
  return (
    <button {...rest} type="submit" disabled={pending || disabled} aria-busy={pending}>
      {pending && (
        <span aria-hidden className="size-3.5 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent" />
      )}
      {children}
    </button>
  );
}
