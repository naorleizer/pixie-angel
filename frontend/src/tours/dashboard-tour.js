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
      description: "Tap the Pixie avatar to open the menu and explore different sections.",
      position: "bottom"
    },
    {
      target: "#challenge-track",
      title: "Your Challenges",
      description: "Track your savings goals here. Tap a challenge to see more details or add progress.",
      position: "bottom"
    },
    {
      target: "#transactions-section",
      title: "Recent Transactions",
      description: "See your latest spending and savings activities. Tap to view all transactions.",
      position: "top"
    },
    {
      target: "#help-btn",
      title: "Need Help?",
      description: "Stuck? Tap the question mark on any page to see a quick tour like this one.",
      position: "bottom"
    }
  ]
};
