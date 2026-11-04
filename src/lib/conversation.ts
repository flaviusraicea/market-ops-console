/** Where the assistant keeps the tab's conversation (features/assistant/conversationStore.ts). Per tab. */
export const CONVERSATION_KEY = "mo.conversation";

/** Forgets the tab's conversation: on sign-out it must not outlive the session. */
export function clearConversation(): void {
  try {
    window.sessionStorage.removeItem(CONVERSATION_KEY);
  } catch {
    // Storage blocked: nothing was stored.
  }
}
