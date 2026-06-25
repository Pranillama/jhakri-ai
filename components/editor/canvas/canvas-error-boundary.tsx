"use client"

import { Component, type ReactNode } from "react"

interface CanvasErrorBoundaryProps {
  children: ReactNode
}

interface CanvasErrorBoundaryState {
  hasError: boolean
}

/**
 * Catches errors thrown while connecting to or rendering the Liveblocks room —
 * for example a failed authentication or a dropped realtime connection — and
 * shows a simple fallback instead of crashing the whole workspace.
 */
export class CanvasErrorBoundary extends Component<
  CanvasErrorBoundaryProps,
  CanvasErrorBoundaryState
> {
  state: CanvasErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(): CanvasErrorBoundaryState {
    return { hasError: true }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-full w-full items-center justify-center bg-base px-6 text-center">
          <p className="text-sm text-copy-muted">
            Couldn’t connect to the collaborative canvas. Refresh the page to try
            again.
          </p>
        </div>
      )
    }

    return this.props.children
  }
}
