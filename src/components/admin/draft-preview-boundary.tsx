"use client";

import React from "react";

interface Props {
  fallback: React.ReactNode;
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
}

/** Class-based error boundary so a single CanvasRenderer failure in one draft card
 *  doesn't sink the whole masonry grid. Falls back to a pre-rendered text-only card. */
export class DraftPreviewBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.error("DraftPreview render failed:", error);
  }

  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}
