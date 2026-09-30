import ReactMarkdown, { type Components } from "react-markdown";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";

/**
 * お知らせ・大会の説明用のMarkdown表示。
 * - 生のHTMLは描画しない（react-markdown の既定）ので、管理者の入力でもスクリプトは入らない
 * - 見出しは本文サイズ前後に抑える（# を使ってもカードのタイトルより大きくならない）
 * - 単発の改行も改行として表示する（Markdown対応前のお知らせの見た目を保つため）
 */
const components: Components = {
  // Markdown の # は h3 相当の要素で出す（ページ本来の h1 / h2 より下の階層にするため）
  h1: ({ children }) => (
    <h3 className="mb-2 mt-4 border-b border-line pb-1 text-[1.05rem] font-bold leading-snug">{children}</h3>
  ),
  h2: ({ children }) => <h3 className="mb-2 mt-4 text-base font-bold leading-snug">{children}</h3>,
  h3: ({ children }) => <h4 className="mb-1 mt-3 text-sm font-bold leading-snug">{children}</h4>,
  h4: ({ children }) => <h5 className="mb-1 mt-3 text-sm font-semibold leading-snug">{children}</h5>,
  h5: ({ children }) => <h5 className="mb-1 mt-3 text-sm font-semibold leading-snug text-mute">{children}</h5>,
  h6: ({ children }) => <h6 className="mb-1 mt-3 text-sm font-medium leading-snug text-mute">{children}</h6>,

  p: ({ children }) => <p className="my-2 leading-relaxed">{children}</p>,
  ul: ({ children }) => <ul className="my-2 list-disc space-y-1 pl-5 leading-relaxed">{children}</ul>,
  ol: ({ children }) => <ol className="my-2 list-decimal space-y-1 pl-5 leading-relaxed">{children}</ol>,
  li: ({ children }) => <li className="[&>ol]:my-1 [&>p]:my-0 [&>ul]:my-1">{children}</li>,
  blockquote: ({ children }) => (
    <blockquote className="my-2 border-l-4 border-line pl-3 text-mute">{children}</blockquote>
  ),
  hr: () => <hr className="my-4 border-line" />,

  // 危険なURL（javascript: など）は react-markdown が空にするので、その場合はただの文字として出す
  a: ({ href, children }) =>
    href ? (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer nofollow"
        className="break-all text-accent underline underline-offset-2 hover:text-accent-dark"
      >
        {children}
      </a>
    ) : (
      <span>{children}</span>
    ),
  code: ({ children }) => <code className="rounded bg-paper px-1 py-0.5 text-[0.9em]">{children}</code>,
  pre: ({ children }) => (
    <pre className="my-2 overflow-x-auto rounded-lg border border-line bg-paper p-3 text-sm leading-relaxed [&_code]:bg-transparent [&_code]:p-0">
      {children}
    </pre>
  ),

  // 表は横にはみ出したらその中だけスクロールさせる
  table: ({ children }) => (
    <div className="my-2 overflow-x-auto">
      <table className="min-w-full border-collapse text-sm">{children}</table>
    </div>
  ),
  th: ({ children, style }) => (
    <th style={style} className="border border-line bg-paper px-2 py-1 text-left font-semibold">
      {children}
    </th>
  ),
  td: ({ children, style }) => (
    <td style={style} className="border border-line px-2 py-1 align-top">
      {children}
    </td>
  ),
  img: ({ src, alt }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={typeof src === "string" ? src : undefined} alt={alt ?? ""} className="my-2 h-auto max-w-full rounded-lg" />
  ),
};

export default function Markdown({ children, className = "" }: { children: string; className?: string }) {
  return (
    <div className={`break-words [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 ${className}`}>
      <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]} components={components}>
        {children}
      </ReactMarkdown>
    </div>
  );
}
