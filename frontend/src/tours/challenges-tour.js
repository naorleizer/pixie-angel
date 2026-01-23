/**
 * Challenges Tour Configuration
 * Guides users through viewing and managing all challenges
 */
export const challengesTour = {
  title: "Challenges Tour",
  steps: [
    {
      target: ".filter-tabs-container",
      title: "Filter Challenges",
      description: "View challenges that are current, completed, or all together.",
      position: "bottom"
    },
    {
      target: ".challenge-card",
      title: "Challenge Card",
      description: "Tap any card to see details, progress, and add updates to your challenge.",
      position: "bottom"
    },
    {
      target: "#new-challenge-btn",
      title: "Create New Challenge",
      description: "Start a new savings challenge or financial goal here.",
      position: "top"
    }
  ]
};
