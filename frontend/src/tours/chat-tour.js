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
      description: "This is the place to talk with Pixie, your AI financial angel! Ask anything about your finances, and Pixie will provide personalized advice and guidance.",
      position: "bottom"
    },
    {
      target: "#chat-input",
      title: "Type Your Message",
      description: "This is where you write your questions or messages. Just type anything you want to discuss with Pixie!",
      position: "top"
    }
  ]
};
