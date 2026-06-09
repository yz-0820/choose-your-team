import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = {
  children: ReactNode;
  fallback?: ReactNode;
};

type State = {
  hasError: boolean;
  error: Error | null;
};

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[ErrorBoundary]", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div style={{ padding: "24px 16px", textAlign: "center", color: "#f7f7f8", background: "#07080d", minHeight: "100vh" }}>
          <p style={{ fontSize: "18px", fontWeight: 900, marginBottom: "8px" }}>页面加载出错了</p>
          <p style={{ fontSize: "13px", color: "rgba(247,247,248,0.6)" }}>{this.state.error?.message}</p>
          <button
            type="button"
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.reload();
            }}
            style={{
              marginTop: "16px",
              padding: "10px 24px",
              border: "none",
              borderRadius: "8px",
              background: "#d6a13d",
              color: "#111318",
              fontSize: "14px",
              fontWeight: 900,
              cursor: "pointer",
            }}
          >
            刷新页面
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
