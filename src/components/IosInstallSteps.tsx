// iPhone / iPad で「ホーム画面に追加」する手順（インストール案内と、通知の案内で同じものを使う）
export default function IosInstallSteps({ className = "mt-3" }: { className?: string }) {
  return (
    <ol className={`${className} list-decimal space-y-1 pl-9 text-sm leading-relaxed`}>
      <li>Safari でこのページを開く</li>
      <li>共有ボタン（四角から矢印が出ているマーク）をタップ</li>
      <li>「ホーム画面に追加」を選ぶ</li>
      <li>右上の「追加」をタップ</li>
    </ol>
  );
}
