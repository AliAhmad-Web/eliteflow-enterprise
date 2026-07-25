"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";

import { ErrorState } from "@/components/common/feedback/error-state";

interface FeatureErrorBoundaryProps {
  children: ReactNode;
  title?: string;
  description?: string;
  onReset?: () => void;
}

interface FeatureErrorBoundaryState {
  hasError: boolean;
  message: string | null;
}

/**
 * Isolates feature subtree failures so the rest of the shell stays usable.
 */
export class FeatureErrorBoundary extends Component<
  FeatureErrorBoundaryProps,
  FeatureErrorBoundaryState
> {
  state: FeatureErrorBoundaryState = { hasError: false, message: null };

  static getDerivedStateFromError(error: Error): FeatureErrorBoundaryState {
    return {
      hasError: true,
      message: error.message || "Unexpected rendering error",
    };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (process.env.NODE_ENV !== "production") {
      console.error("[FeatureErrorBoundary]", error, info.componentStack);
    }
  }

  private reset = () => {
    this.props.onReset?.();
    this.setState({ hasError: false, message: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <ErrorState
          title={this.props.title ?? "Something went wrong"}
          description={
            this.props.description ??
            this.state.message ??
            "Please try again. Your other workspaces are unaffected."
          }
          onRetry={this.reset}
        />
      );
    }

    return this.props.children;
  }
}
