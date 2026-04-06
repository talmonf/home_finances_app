export type DashboardGroup = "setup" | "ongoing";

export type SectionId =
  | "familyMembers"
  | "properties"
  | "trips"
  | "bankAccounts"
  | "digitalPaymentMethods"
  | "creditCards"
  | "importStatements"
  | "tasks"
  | "studiesAndClasses"
  | "subscriptions"
  | "donations"
  | "loans"
  | "cars"
  | "petrolFillups"
  | "jobs"
  | "upcomingRenewals"
  | "significantPurchases"
  | "medicalAppointments"
  | "privateClinic"
  | "reports";

export type SetupCounts = {
  familyMembers: number;
  properties: number;
  cars: number;
  jobs: number;
  bankAccounts: number;
  digitalPaymentMethods: number;
  creditCards: number;
};

export type DashboardSection = {
  id: SectionId;
  group: DashboardGroup;
  title: string;
  href: string;
  description: string;
  countKey?: keyof SetupCounts;
  countSuffix?: string;
};

export const DASHBOARD_SECTIONS: DashboardSection[] = [
  {
    id: "familyMembers",
    group: "setup",
    title: "Family Members",
    href: "/dashboard/family-members",
    description: "People in your household.",
    countKey: "familyMembers",
    countSuffix: "members",
  },
  {
    id: "properties",
    group: "setup",
    title: "Homes & Properties",
    href: "/dashboard/properties",
    description: "Homes/units and rental details.",
    countKey: "properties",
    countSuffix: "properties",
  },
  {
    id: "bankAccounts",
    group: "setup",
    title: "Bank accounts",
    href: "/dashboard/bank-accounts",
    description: "Where money moves in/out.",
    countKey: "bankAccounts",
    countSuffix: "accounts",
  },
  {
    id: "digitalPaymentMethods",
    group: "setup",
    title: "Digital payment methods",
    href: "/dashboard/digital-payment-methods",
    description: "Wallets and linked payment methods.",
    countKey: "digitalPaymentMethods",
    countSuffix: "methods",
  },
  {
    id: "creditCards",
    group: "setup",
    title: "Credit cards",
    href: "/dashboard/credit-cards",
    description: "Cards and settlement accounts.",
    countKey: "creditCards",
    countSuffix: "cards",
  },
  {
    id: "cars",
    group: "setup",
    title: "Cars",
    href: "/dashboard/cars",
    description: "Vehicles with services/licenses/insurance.",
    countKey: "cars",
    countSuffix: "cars",
  },
  {
    id: "petrolFillups",
    group: "ongoing",
    title: "Petrol",
    href: "/dashboard/petrol-fillups",
    description:
      "Log fill-ups from your phone: pick the car, odometer, litres, and amount paid.",
  },
  {
    id: "jobs",
    group: "setup",
    title: "Jobs",
    href: "/dashboard/jobs",
    description: "Employment history and payroll changes.",
    countKey: "jobs",
    countSuffix: "jobs",
  },

  {
    id: "trips",
    group: "ongoing",
    title: "Trips",
    href: "/dashboard/trips",
    description: "Track business trips and linked expenses.",
  },
  {
    id: "importStatements",
    group: "ongoing",
    title: "Import statements",
    href: "/dashboard/import",
    description: "Upload statements and review transactions.",
  },
  {
    id: "tasks",
    group: "ongoing",
    title: "Tasks",
    href: "/dashboard/tasks",
    description: "Create and track tasks.",
  },
  {
    id: "studiesAndClasses",
    group: "ongoing",
    title: "Studies & Classes",
    href: "/dashboard/studies-and-classes",
    description: "Track studies/classes per family member with expected costs.",
  },
  {
    id: "subscriptions",
    group: "ongoing",
    title: "Subscriptions",
    href: "/dashboard/subscriptions",
    description: "Recurring subscriptions, renewal dates, and payments.",
  },
  {
    id: "donations",
    group: "ongoing",
    title: "Donations",
    href: "/dashboard/donations",
    description: "Log gifts and ongoing commitments.",
  },
  {
    id: "loans",
    group: "ongoing",
    title: "Loans",
    href: "/dashboard/loans",
    description: "Mortgages and loans with repayment schedule and maturity.",
  },
  {
    id: "upcomingRenewals",
    group: "ongoing",
    title: "Upcoming Renewals & Deadlines",
    href: "/dashboard/upcoming-renewals",
    description: "See upcoming renewals and expirations across your data.",
  },
  {
    id: "significantPurchases",
    group: "ongoing",
    title: "Significant purchases",
    href: "/dashboard/significant-purchases",
    description: "Track major purchases and warranty expiry.",
  },
  {
    id: "medicalAppointments",
    group: "ongoing",
    title: "Medical appointments",
    href: "/dashboard/medical-appointments",
    description: "Log visits, reimbursements, and payment methods.",
  },
  {
    id: "privateClinic",
    group: "ongoing",
    title: "Private clinic",
    href: "/dashboard/private-clinic",
    description: "Clients, treatments, receipts, appointments, and clinic expenses.",
  },
  {
    id: "reports",
    group: "ongoing",
    title: "Reports",
    href: "/dashboard/reports",
    description: "P&L and reports will appear here as we build them.",
  },
];
