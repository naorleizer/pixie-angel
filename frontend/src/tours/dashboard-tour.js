/**
 * Dashboard Tour Configuration
 * Guides users through the main dashboard features
 */
export const dashboardTour = {
  title: "Dashboard Tour",
  steps: [
    {
      target: "#app-avatar-btn",
      title: "Navigation Menu",
      description: "Your personal space. Tap here to navigate through your goals and settings.",
      position: "bottom"
    },
    {
      target: "#challenge-track",
      title: "Your Challenges",
      description: "Turning dreams into plans. Stay on track with your goals and celebrate every small win.",
      position: "bottom"
    },
    {
      target: "#transactions-section",
      title: "Recent Transactions",
      description: "Your money at a glance. A quick look at your recent spending.",
      position: "top"
    },
    {
      target: "#help-btn",
      title: "Need Help?",
      description: "I'm always here. Tap this whenever you need a quick refresher or a helping hand.",
      position: "bottom"
    }
  ]
};
