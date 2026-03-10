import { Component } from "react";

export default class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("ErrorBoundary caught:", error, info);
  }

  render() {
    if (this.state.error) {
      const msg = this.state.error?.message || String(this.state.error);
      return (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-8 py-12">
          <p className="font-sans text-[13px] font-medium text-red-400">
            Something went wrong
          </p>
          <p className="max-w-md font-mono text-[11px] text-text-secondary break-all">
            {msg}
          </p>
          <button
            type="button"
            onClick={() => this.setState({ error: null })}
            className="rounded bg-[#2a2a2a] px-3 py-1.5 font-sans text-[12px] text-text-primary hover:bg-[#333]"
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
