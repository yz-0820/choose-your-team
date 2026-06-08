import { Download } from "lucide-react";

type BottomActionsProps = {
  onPoster: () => void;
};

export function BottomActions({ onPoster }: BottomActionsProps) {
  return (
    <nav className="bottom-actions" aria-label="预测操作">
      <button type="button" onClick={onPoster}>
        <Download size={17} aria-hidden="true" />
        一键生成你的海报！
      </button>
    </nav>
  );
}
