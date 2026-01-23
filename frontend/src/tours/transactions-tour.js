/**
 * Transactions Tour Configuration
 * Guides users through viewing and managing transactions
 */
export const transactionsTour = {
  title: "Transactions Tour",
  steps: [
    {
      target: ".transaction-filter-container",
      title: "Filter Transactions",
      description: "Narrow down your transactions by date, category, or amount.",
      position: "bottom"
    },
    {
      target: ".transaction-list",
      title: "Your Transactions",
      description: "See each transaction with its category, amount, and account. Tap to edit or correct.",
      position: "bottom"
    },
    {
      target: "#import-transactions-btn",
      title: "Import Bank Data",
      description: "Upload your bank statements or CSV files to automatically import transactions.",
      position: "top"
    }
  ]
};
