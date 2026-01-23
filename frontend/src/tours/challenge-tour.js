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
      description: "This is your place to create new challenges! Fill in the form below to set your financial goals.",
      position: "bottom"
    },
    {
      target: "#challenge-title",
      title: "Challenge Title",
      description: "Give a personal title to your next challenge. Make it meaningful so you stay motivated!",
      position: "bottom"
    },
    {
      target: "#challenge_type",
      title: "Challenge Type",
      description: "You can choose between a one-time challenge or a routine one that repeats regularly.",
      position: "bottom"
    },
    {
      target: "#challenge-amount",
      title: "Challenge Amount",
      description: "Set your target amount in ₪. This is how much you want to save or track for your challenge.",
      position: "bottom"
    },
    {
      target: "#challenge_duration_section",
      title: "Challenge Duration",
      description: "Specify how long you want your challenge to last. You can choose days, weeks, or months.",
      position: "bottom"
    },
    {
      target: "#create-challenge-btn",
      title: "Create Your Challenge",
      description: "Here you submit your challenge. Don't worry, you can edit or cancel it anytime later!",
      position: "top"
    }
  ]
};
