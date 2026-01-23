/**
 * Account Management Tour Configuration
 * Highlights interests, financial persona, and motivations sections
 */
export const accountManagementTour = {
  title: "Account Management Tour",
  steps: [
    {
      target: "#acct-interests-container",
      title: "Your Interests",
      description: "Choose topics and interests that help Pixie tailor suggestions to you.",
      position: "bottom"
    },
    {
      target: "#acct-persona-select",
      title: "Financial Persona",
      description: "Pick a persona that matches how you prefer to receive advice (e.g., Analyst, Driver).",
      position: "bottom"
    },
    {
      target: "#acct-motivations-container",
      title: "Motivations",
      description: "Select motivations to help Pixie prioritize recommendations aligned with your goals.",
      position: "bottom"
    }
  ]
};
