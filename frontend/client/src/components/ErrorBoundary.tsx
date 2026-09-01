import { AlertTriangle, RotateCcw } from "lucide-react";
import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

const copy = {
  en: {
    title: "We could not load this page",
    message: "Something went wrong while opening the application. Please reload the page and try again.",
    reload: "Reload page",
  },
  hi: {
    title: "यह पृष्ठ लोड नहीं हो सका",
    message: "ऐप खोलते समय कोई समस्या आई। कृपया पृष्ठ को फिर से लोड करें।",
    reload: "पृष्ठ फिर लोड करें",
  },
} as const;

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
      const lang = typeof document !== "undefined" && document.documentElement.lang === "hi" ? "hi" : "en";
      const text = copy[lang];
      return (
        <main className="error-boundary" role="alert">
          <section className="error-boundary__card">
            <AlertTriangle className="error-boundary__icon" size={48} aria-hidden="true" />
            <p className="eyebrow">CropLens AI</p>
            <h1>{text.title}</h1>
            <p className="error-boundary__message">{text.message}</p>
            <button className="primary-button error-boundary__action" type="button" onClick={() => window.location.reload()}>
              <RotateCcw size={17} aria-hidden="true" />
              {text.reload}
            </button>
          </section>
        </main>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
