/**
 * Chat Tour Configuration
 * Guides users through the chat interface with Pixie
 */
export const chatTour = {
  title: "Chat with Pixie",
  steps: [
    {
      target: "#chat-scroll",
      title: "Welcome to Chat",
      description: "A helping hand. This is where we talk through your numbers and turn them into a plan together.",
      position: "bottom"
    },
    {
      target: "#chat-input",
      title: "Type Your Message",
      description: "Ready when you are. Type your message below to begin our journey toward your financial goals.",
      position: "top"
    }
  ]
};
