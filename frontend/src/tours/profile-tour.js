/**
 * Profile Tour Configuration
 * Guides users through their account settings and options
 */
export const profileTour = {
  title: "Your Account Tour",
  steps: [
    {
      target: ".rounded-2xl.bg-slate-100",
      title: "Your Profile",
      description: "This is the heart of your personal financial journey. You can view and manage your account here.",
      position: "bottom"
    },
    {
      target: "button[onclick*='screen-account-settings']",
      title: "Account Management",
      description: "Adjust your data settings. Customize your profile to fit your style.",
      position: "bottom"
    },
    {
      target: "button[onclick*='logout']",
      title: "Log Out",
      description: "Signing off. I'll be right here whenever you're ready to pick up where we left off.",
      position: "bottom"
    },
    {
      target: "button[onclick*='screen-about']",
      title: "About",
      description: "Learn more about Pixie’s mission and how it works.",
      position: "bottom"
    },
    {
      target: "button[onclick*='screen-privacy-policy']",
      title: "Privacy Policy",
      description: "Read our privacy policy and data handling practices.",
      position: "bottom"
    },
    {
      target: "button[onclick*='screen-report-issue']",
      title: "Report an Issue",
      description: "Help us grow. Your feedback is the best way for us to become a better guardian.",
      position: "bottom"
    }
  ]
};

