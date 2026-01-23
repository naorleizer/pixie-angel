/**
 * Chat Tour Configuration
 * Guides users through the chat/AI assistant features
 */
export const chatTour = {
  title: "Chat Tour",
  steps: [
    {
      target: "#chat-messages-container",
      title: "Chat History",
      description: "Your conversation with Pixie appears here. She's your AI money coach!",
      position: "bottom"
    },
    {
      target: "#chat-input-form",
      title: "Send a Message",
      description: "Type your question or tell Pixie about your financial goals. She'll provide advice.",
      position: "top"
    },
    {
      target: "#create-challenge-from-chat-btn",
      title: "Create Challenge",
      description: "Quickly create a new savings challenge from your chat. Pixie can help you set it up.",
      position: "top"
    }
  ]
};
