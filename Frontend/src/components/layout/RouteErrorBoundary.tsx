import { Component, type ReactNode } from "react";
import { Button } from "@/components/ui/button";

interface RouteErrorBoundaryProps {
  children: ReactNode;
}

interface RouteErrorBoundaryState {
  hasError: boolean;
}

/** Contains a failed page, including a code-split chunk that could not load, so navigation survives. */
export class RouteErrorBoundary extends Component<RouteErrorBoundaryProps, RouteErrorBoundaryState> {
  state: RouteErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): RouteErrorBoundaryState {
    return { hasError: true };
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div role="alert" className="clinical-panel p-8 text-center">
        <h1 className="text-headline-semibold">Não foi possível abrir esta página</h1>
        <p className="mx-auto mt-2 max-w-md text-body-regular text-text-secondary">
          Recarregue a página. Se o problema continuar, verifique a conexão ou tente novamente mais tarde.
        </p>
        <Button className="mt-4" variant="secondary" onClick={() => window.location.reload()}>Recarregar página</Button>
      </div>
    );
  }
}
