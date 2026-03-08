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
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-bg-primary px-6">
          <p className="font-sans text-[14px] font-medium text-text-primary">
            Something went wrong
          </p>
          <p className="max-w-md font-mono text-[12px] text-red-400">
            {this.state.error?.message || String(this.state.error)}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="cursor-pointer rounded bg-accent-blue px-4 py-1.5 font-sans text-[12px] font-medium text-white transition-colors hover:brightness-110"
          >
            Reload page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
