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
      description: "This shows your username and profile information. You can view and manage your account here.",
      position: "bottom"
    },
    {
      target: "button[onclick*='screen-privacy']",
      title: "Privacy and Data",
      description: "Control how Pixie uses your data and personalization settings.",
      position: "bottom"
    },
    {
      target: "button[onclick*='screen-account-management']",
      title: "Account Management",
      description: "Customize your interests and choose your financial persona preference.",
      position: "bottom"
    },
    {
      target: "button[onclick*='logout']",
      title: "Log Out",
      description: "Sign out of your account when you're done.",
      position: "bottom"
    },
    {
      target: "button[onclick*='screen-about']",
      title: "About",
      description: "Learn more about Pixie and how it works.",
      position: "bottom"
    },
    {
      target: "button[onclick*='screen-onboarding']",
      title: "Onboarding",
      description: "Revisit the introductory tour to refresh your knowledge of Pixie.",
      position: "bottom"
    },
    {
      target: "button[onclick*='screen-privacy-policy']",
      title: "Privacy Policy",
      description: "Read our complete privacy policy and data handling practices.",
      position: "bottom"
    },
    {
      target: "button[onclick*='screen-report-issue']",
      title: "Report an Issue",
      description: "Have feedback or found a bug? Let us know how we can improve!",
      position: "bottom"
    }
  ]
};

