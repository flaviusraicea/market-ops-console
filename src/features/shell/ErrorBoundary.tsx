"use client";

import { Component, type ReactNode } from "react";

import { logEvent, reportError } from "@/lib/events";
import { Notice } from "@/components/Notice";
import { Button } from "@/components/ui/button";

type Props = {
  widget: string;
  /**
   * The context the widget renders for (contextKey.ts). When it changes, a failed widget tries again with its new
   * data, so a drill or a period change recovers it; the reader does not have to find Reload widget. A healthy
   * widget is left alone, which is why this is not a React key on the boundary.
   */
  resetKey?: string;
  children: ReactNode;
};
type State = { failed: boolean };

/** One per widget so a failing chart never takes the page down. */
export class ErrorBoundary extends Component<Props, State> {
  override state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  override componentDidUpdate(prev: Props): void {
    if (this.state.failed && prev.resetKey !== this.props.resetKey) this.reset();
  }

  override componentDidCatch(error: Error): void {
    logEvent({ type: "widget_error", widget: this.props.widget, message: error.message });
    reportError(error, { source: "boundary", widget: this.props.widget });
  }

  private reset = () => this.setState({ failed: false });

  override render() {
    if (!this.state.failed) return this.props.children;
    return (
      <Notice
        title="This widget failed to load"
        actions={
          <Button variant="ghost" size="sm" onClick={this.reset}>
            Reload widget
          </Button>
        }
      >
        The rest of the console still works.
      </Notice>
    );
  }
}
