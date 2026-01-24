/**
 * Import Transactions Tour Configuration
 * Guides users through the CSV import workflow
 */
export const importTransactionsTour = {
  title: "Import Your Transactions",
  steps: [
    {
      target: "#drop-zone",
      title: "Upload Your CSV File",
      description: "Bring in your data. Simply drag and drop your file here. By uploading your history, I can provide much more personalized guidance for your goals.",
      position: "bottom"
    },
    {
      target: "#upload-btn",
      title: "Complete Your Import",
      description: "Safety first. Click to import, knowing you can delete your data from our system anytime.",
      position: "top"
    }
  ]
};

