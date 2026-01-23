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
      description: "Click here or drag and drop your CSV file to upload your transaction history from your bank. This helps us understand your spending patterns and provide better financial advice.",
      position: "bottom"
    },
    {
      target: "#upload-btn",
      title: "Complete Your Import",
      description: "Click this button to upload and import your transactions. Don't worry - you have full control! You can remove any file from the app anytime, and no data will be kept in our system after deletion.",
      position: "top"
    }
  ]
};

