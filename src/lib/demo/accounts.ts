/**
 * Public demo logins (sample data only). They are listed on the login page and
 * in the README so reviewers can try every role. Real secrets never live here.
 */
export const DEMO_PASSWORD = "Demo-Pass-2026!";

export const DEMO_ACCOUNTS = [
  { role: "buyer", label: "Buyer", email: "demo.buyer@example.com", name: "Demo Buyer", blurb: "Browse, configure, check out" },
  { role: "seller", label: "Seller", email: "demo.seller@example.com", name: "Demo Seller", blurb: "Manage the Prague bed and orders" },
  { role: "admin", label: "Admin", email: "demo.admin@example.com", name: "Demo Admin", blurb: "Approve or hide sellers and listings" },
] as const;
