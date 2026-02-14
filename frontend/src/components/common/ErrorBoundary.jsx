import { Component } from "react";

/**
 * React Error Boundary — catches rendering errors in child components
 * and shows a friendly fallback UI instead of a white screen.
 *
 * Usage:
 *   <ErrorBoundary>
 *     <RouterOutlet />
 *   </ErrorBoundary>
 */
export class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error("[ErrorBoundary]", error, errorInfo);
    }

    handleReset = () => {
        this.setState({ hasError: false, error: null });
    };

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 p-8 text-center">
                    <div className="rounded-full bg-red-100 p-4">
                        <svg
                            className="h-8 w-8 text-destructive"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                        </svg>
                    </div>
                    <h2 className="text-xl font-semibold text-slate-800">
                        Algo salió mal
                    </h2>
                    <p className="max-w-md text-sm text-slate-500">
                        Ocurrió un error inesperado. Intenta recargar la página
                        o volver al inicio.
                    </p>
                    <div className="flex gap-3">
                        <button
                            onClick={() => window.location.reload()}
                            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-colors"
                        >
                            Recargar página
                        </button>
                        <button
                            onClick={this.handleReset}
                            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                        >
                            Intentar de nuevo
                        </button>
                    </div>
                    {import.meta.env.DEV && this.state.error && (
                        <details className="mt-4 w-full max-w-lg text-left">
                            <summary className="cursor-pointer text-xs text-slate-400">
                                Detalles técnicos
                            </summary>
                            <pre className="mt-2 overflow-auto rounded bg-slate-100 p-3 text-xs text-red-700">
                                {this.state.error.toString()}
                            </pre>
                        </details>
                    )}
                </div>
            );
        }

        return this.props.children;
    }
}
