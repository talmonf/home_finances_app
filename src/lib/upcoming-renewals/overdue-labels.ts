export function overdueLabelForCategory(category: string, isHebrew: boolean): string {
  if (isHebrew) {
    switch (category) {
      case "Task":
        return "באיחור";
      case "Identity":
      case "Credit card":
      case "Insurance":
      case "Car license":
      case "Warranty":
        return "פג תוקף";
      case "Rental":
      case "Utility":
      case "Car service":
      case "Savings policy":
      case "Loan":
      case "Subscription":
      case "Donation":
      default:
        return "עבר";
    }
  }

  switch (category) {
    case "Task":
      return "Past due";
    case "Identity":
    case "Credit card":
    case "Insurance":
    case "Car license":
    case "Warranty":
      return "Expired";
    case "Donation":
      return "Passed";
    case "Rental":
    case "Utility":
    case "Car service":
    case "Savings policy":
    case "Loan":
    case "Subscription":
    default:
      return "Overdue";
  }
}
