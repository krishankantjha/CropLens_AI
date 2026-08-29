import { AlertTriangle, RotateCcw } from "lucide-react";
import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="error-boundary" role="alert">
          <section className="error-boundary__card">
            <AlertTriangle className="error-boundary__icon" size={48} aria-hidden="true" />
            <p className="eyebrow">CropLens AI</p>
            <h1>We could not load this page</h1>
            <p className="error-boundary__message">
              Something went wrong while opening the application. Please reload the page and try again.
            </p>
            <button className="primary-button error-boundary__action" type="button" onClick={() => window.location.reload()}>
              <RotateCcw size={17} aria-hidden="true" />
              Reload page
            </button>
          </section>
        </main>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
