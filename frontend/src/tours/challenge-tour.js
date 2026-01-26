/**
 * New Challenge Tour Configuration
 * Guides users through creating a new challenge
 */
export const challengeTour = {
  title: "Create a New Challenge",
  steps: [
    {
      target: "#create_challenge_form",
      title: "Create Your Challenge",
      description: "Your goal, your rules. Fill in these details to turn your goal into a real plan.",
      position: "bottom"
    },
    {
      target: "#challenge-title",
      title: "Challenge Title",
      description: "Give it a name. Choose a title that reminds you exactly why you’re doing this.",
      position: "bottom"
    },
    {
      target: "#challenge-amount",
      title: "Challenge Amount",
      description: "Set the bar. Enter the amount in ₪ you need to cross the finish line.",
      position: "bottom"
    },
    {
      target: "#challenge_duration_section",
      title: "Challenge Duration",
      description: "Choose a duration that makes this goal feel manageable. You can choose days, weeks, or months.",
      position: "bottom"
    },
    {
      target: "#create-challenge-btn",
      title: "Create Your Challenge",
      description: "Ready to launch? Submit your challenge now and let's start making progress. Don't worry, you can edit or cancel it anytime later.",
      position: "top"
    }
  ]
};
