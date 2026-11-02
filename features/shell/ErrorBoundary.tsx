"use client";

import { Component, type ReactNode } from "react";

import { logEvent } from "@/lib/observability/events";
import { Notice } from "@/ui/components/Notice";
import { Button } from "@/ui/primitives/button";

type Props = { widget: string; children: ReactNode };
type State = { failed: boolean };

/** One per widget so a failing chart never takes the page down. */
export class ErrorBoundary extends Component<Props, State> {
  override state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  override componentDidCatch(error: Error): void {
    logEvent({ type: "widget_error", widget: this.props.widget, message: error.message });
  }

  private reset = () => this.setState({ failed: false });

  override render() {
    if (!this.state.failed) return this.props.children;
    return (
      <Notice
        title="This widget failed to load"
        actions={
          <Button variant="secondary" onClick={this.reset}>
            Reload widget
          </Button>
        }
      >
        The rest of the console still works.
      </Notice>
    );
  }
}
