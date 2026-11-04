import { useEffect } from "react";

import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, waitFor, within } from "storybook/test";

import data from "@/data/data.json";
import { parseDataset } from "@/domain/dataset";
import { panelContextVM } from "@/features/overview/viewModel";
import { AssistantRailProvider, useAssistantRail } from "@/features/shell/railState";
import { portfolioMay, withDataset } from "../../../.storybook/decorators";
import { AnswerMachineProvider } from "./AnswerMachine";
import { AskWhyProvider } from "./askWhy";
import { MobileAssistant } from "./MobileAssistant";
import { Panel } from "./Panel";
import type { AskStream } from "@/lib/stream/chatClient";

// A stream that never answers, so stories do not touch the network.
const quiet: AskStream = () => new Promise(() => {});

/** An answer that finished while the sheet was closed. */
function UnreadAnswer() {
  const { noteAnswerDone } = useAssistantRail();
  useEffect(() => noteAnswerDone(), [noteAnswerDone]);
  return null;
}

const meta = {
  title: "features/assistant/MobileAssistant",
  component: MobileAssistant,
  decorators: [
    (Story) => (
      <AssistantRailProvider>
        <AskWhyProvider>
          <AnswerMachineProvider stream={quiet}>
            <Story />
          </AnswerMachineProvider>
        </AskWhyProvider>
      </AssistantRailProvider>
    ),
    withDataset,
  ],
  // The bar and sheet are the layout below 1024 px.
  globals: { viewport: { value: "mobile1", isRotated: false } },
  parameters: { viewport: { defaultViewport: "mobile1" } },
  args: {
    panel: <Panel context={panelContextVM(parseDataset(data), portfolioMay)} />,
  },
} satisfies Meta<typeof MobileAssistant>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Closed: Story = {
  play: async ({ canvasElement }) => {
    const button = within(canvasElement).getByRole("button", { name: "Ask the assistant" });
    await expect(button).toBeVisible();
    await expect(
      within(canvasElement).getByRole("button", { name: "Search and commands" }),
    ).toBeVisible();
    await expect(button.getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
  },
};

export const ClosedWithBadge: Story = {
  decorators: [
    (Story) => (
      <>
        <UnreadAnswer />
        <Story />
      </>
    ),
  ],
  play: async ({ canvasElement }) => {
    await expect(
      await within(canvasElement).findByRole("button", { name: /Ask the assistant.*1 new answer/ }),
    ).toBeVisible();
  },
};

export const Open: Story = {
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole("button", { name: "Ask the assistant" }));
    const sheet = await within(document.body).findByRole("dialog", { name: "Assistant" });
    await expect(sheet).toBeVisible();
    await waitFor(() =>
      expect(within(sheet).getByRole("textbox", { name: "Ask the assistant" })).toHaveFocus(),
    );
    await userEvent.keyboard("{Escape}");
    await waitFor(() =>
      expect(within(document.body).queryByRole("dialog")).not.toBeInTheDocument(),
    );
    await expect(
      within(canvasElement).getByRole("button", { name: "Ask the assistant" }),
    ).toHaveFocus();
  },
};
