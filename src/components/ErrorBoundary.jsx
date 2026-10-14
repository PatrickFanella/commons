import React from "react";
export default class ErrorBoundary extends React.Component {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (this.state.failed)
      return (
        <main className="error-boundary">
          <h1>We hit a snag.</h1>
          <p>
            Your account and shared projects are stored on the server. Reload to
            try again.
          </p>
          <button className="primary" onClick={() => location.reload()}>
            Reload Commons
          </button>
        </main>
      );
    return this.props.children;
  }
}
