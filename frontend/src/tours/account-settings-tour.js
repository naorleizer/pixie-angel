/**
 * Account Settings Tour Configuration
 * Highlights data personalization, communication style, and preference management
 */
export const accountSettingsTour = {
  title: "Account Settings Tour",
  steps: [
    {
      target: "#personalization_container",
      title: "Data Personalization",
      description: "Toggle which data Pixie uses to personalize your experience. Enable interests, location, and motivations to get better recommendations.",
      position: "bottom"
    },
    {
      target: "#acct-persona-select",
      title: "Communication Style",
      description: "Choose how Pixie communicates with you. Pick from Analyst (detailed), Driver (direct), Promoter (energetic), or Supportive (empathetic).",
      position: "bottom"
    },
    {
      target: "#acct-interests-summary",
      title: "Your Interests",
      description: "Click 'Edit' to select topics that interest you. This helps Pixie tailor financial suggestions to your lifestyle.",
      position: "bottom"
    },
    {
      target: "#acct-motivations-summary",
      title: "Your Motivations",
      description: "Click 'Edit' to choose what drives your financial decisions. This helps Pixie prioritize recommendations that align with your goals.",
      position: "bottom"
    }
  ]
};
