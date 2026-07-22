export type FlowDirection = "inflow" | "outflow" | "neutral";

export type TransactionTypeOption = {
  value: string;
  label: string;
  group: string;
  direction: FlowDirection;
};

export const TRANSACTION_TYPES: TransactionTypeOption[] = [
  { value: "income", label: "General income", group: "Money received", direction: "inflow" },
  { value: "salary", label: "Salary / wages", group: "Money received", direction: "inflow" },
  { value: "bonus", label: "Bonus / commission", group: "Money received", direction: "inflow" },
  { value: "freelance_income", label: "Freelance income", group: "Money received", direction: "inflow" },
  { value: "business_income", label: "Business income", group: "Money received", direction: "inflow" },
  { value: "interest_income", label: "Interest received", group: "Money received", direction: "inflow" },
  { value: "dividend_income", label: "Dividend received", group: "Money received", direction: "inflow" },
  { value: "rental_income", label: "Rental income", group: "Money received", direction: "inflow" },
  { value: "benefit_income", label: "Benefits / allowance", group: "Money received", direction: "inflow" },
  { value: "pension_income", label: "Pension income", group: "Money received", direction: "inflow" },
  { value: "gift_received", label: "Gift received", group: "Money received", direction: "inflow" },
  { value: "cashback", label: "Cashback / reward", group: "Money received", direction: "inflow" },
  { value: "refund", label: "Refund", group: "Money received", direction: "inflow" },
  { value: "reimbursement", label: "Reimbursement", group: "Money received", direction: "inflow" },
  { value: "loan_received", label: "Loan received", group: "Money received", direction: "inflow" },
  { value: "insurance_payout", label: "Insurance payout", group: "Money received", direction: "inflow" },
  { value: "asset_sale", label: "Asset sale", group: "Money received", direction: "inflow" },
  { value: "investment_sale", label: "Investment sale / redemption", group: "Money received", direction: "inflow" },
  { value: "savings_withdrawal", label: "Savings withdrawal", group: "Money received", direction: "inflow" },
  { value: "cash_deposit", label: "Cash deposit", group: "Money received", direction: "inflow" },

  { value: "expense", label: "General expense", group: "Money spent", direction: "outflow" },
  { value: "purchase", label: "Purchase", group: "Money spent", direction: "outflow" },
  { value: "bill_payment", label: "Bill payment", group: "Money spent", direction: "outflow" },
  { value: "subscription_payment", label: "Subscription payment", group: "Money spent", direction: "outflow" },
  { value: "rent_payment", label: "Rent payment", group: "Money spent", direction: "outflow" },
  { value: "mortgage_payment", label: "Mortgage payment", group: "Money spent", direction: "outflow" },
  { value: "loan_repayment", label: "Loan repayment", group: "Money spent", direction: "outflow" },
  { value: "credit_card_payment", label: "Credit-card payment", group: "Money spent", direction: "outflow" },
  { value: "tax_payment", label: "Tax payment", group: "Money spent", direction: "outflow" },
  { value: "fee", label: "Bank / service fee", group: "Money spent", direction: "outflow" },
  { value: "fine_penalty", label: "Fine / penalty", group: "Money spent", direction: "outflow" },
  { value: "donation", label: "Donation / charity", group: "Money spent", direction: "outflow" },
  { value: "gift_sent", label: "Gift sent", group: "Money spent", direction: "outflow" },
  { value: "cash_withdrawal", label: "Cash withdrawal", group: "Money spent", direction: "outflow" },
  { value: "savings_contribution", label: "Savings contribution", group: "Saving and investing", direction: "outflow" },
  { value: "investment_purchase", label: "Investment purchase", group: "Saving and investing", direction: "outflow" },
  { value: "retirement_contribution", label: "Retirement contribution", group: "Saving and investing", direction: "outflow" },
  { value: "crypto_purchase", label: "Crypto purchase", group: "Saving and investing", direction: "outflow" },
  { value: "crypto_sale", label: "Crypto sale", group: "Saving and investing", direction: "inflow" },

  { value: "transfer", label: "Transfer between own accounts", group: "Transfers and adjustments", direction: "neutral" },
  { value: "currency_exchange", label: "Currency exchange", group: "Transfers and adjustments", direction: "neutral" },
  { value: "balance_adjustment", label: "Balance adjustment", group: "Transfers and adjustments", direction: "neutral" },
  { value: "opening_balance", label: "Opening balance", group: "Transfers and adjustments", direction: "inflow" },
];

export const TYPE_BY_VALUE = Object.fromEntries(
  TRANSACTION_TYPES.map((option) => [option.value, option]),
) as Record<string, TransactionTypeOption>;

export type CategoryGroup = { group: string; items: string[] };

export const CATEGORY_GROUPS: CategoryGroup[] = [
  { group: "Income and earnings", items: ["Salary", "Wages", "Overtime", "Bonus", "Commission", "Tips", "Freelance", "Consulting", "Business revenue", "Rental income", "Interest", "Dividends", "Capital gains", "Royalties", "Pension", "Government benefits", "Child benefit", "Unemployment benefit", "Scholarship", "Alimony received", "Child support received", "Gift received", "Inheritance", "Refund", "Reimbursement", "Cashback", "Insurance payout", "Other income"] },
  { group: "Home and housing", items: ["Rent", "Mortgage", "Property tax", "Home insurance", "Home repairs", "Home maintenance", "Furniture", "Home appliances", "Home improvement", "Cleaning supplies", "Cleaning service", "Garden", "Security system", "Storage", "HOA / service charges", "Moving costs"] },
  { group: "Utilities and communications", items: ["Electricity", "Gas", "Water", "Heating", "Waste / recycling", "Internet", "Mobile phone", "Landline", "TV licence", "Cable / satellite", "Cloud storage", "Postage"] },
  { group: "Food and drink", items: ["Groceries", "Restaurants", "Takeaway / delivery", "Coffee", "Work meals", "Snacks", "Alcohol", "Meal subscriptions", "Specialty food"] },
  { group: "Transport and mobility", items: ["Public transport", "Fuel", "Car payment", "Car insurance", "Car maintenance", "Car repairs", "Parking", "Tolls", "Taxi / rideshare", "Bicycle", "Scooter", "Vehicle registration", "Driving licence", "Car wash", "Rental car", "Flights", "Rail travel"] },
  { group: "Health and wellbeing", items: ["Health insurance", "Doctor", "Dentist", "Hospital", "Pharmacy", "Medication", "Therapy", "Optician", "Physiotherapy", "Medical devices", "Gym", "Fitness classes", "Sports", "Wellness", "Supplements", "Personal trainer"] },
  { group: "Personal care and clothing", items: ["Clothing", "Shoes", "Accessories", "Haircut", "Beauty", "Cosmetics", "Skincare", "Toiletries", "Laundry / dry cleaning", "Jewellery", "Tailoring"] },
  { group: "Family and children", items: ["Childcare", "School fees", "School supplies", "Children's clothing", "Baby supplies", "Toys", "Activities", "Pocket money", "Child support paid", "Alimony paid", "Elder care", "Family support"] },
  { group: "Education and professional", items: ["Tuition", "Courses", "Books", "Software", "Professional membership", "Certification", "Conference", "Work equipment", "Office supplies", "Coworking", "Career coaching", "Language learning"] },
  { group: "Entertainment and lifestyle", items: ["Streaming", "Music", "Cinema", "Gaming", "Books / magazines", "Hobbies", "Events", "Concerts", "Museums", "Nightlife", "Photography", "Crafts", "Electronics", "Apps", "Social clubs"] },
  { group: "Travel and holidays", items: ["Accommodation", "Flights", "Train tickets", "Local transport", "Travel insurance", "Food while travelling", "Tours / attractions", "Visa / passport", "Luggage", "Currency exchange fee", "Holiday shopping"] },
  { group: "Pets", items: ["Pet food", "Veterinary", "Pet insurance", "Grooming", "Pet supplies", "Pet care / boarding", "Pet training"] },
  { group: "Financial obligations", items: ["Income tax", "Business tax", "Bank fees", "Interest charges", "Credit-card payment", "Personal-loan payment", "Student-loan payment", "Mortgage principal", "Debt repayment", "Late fee", "Fine / penalty", "Legal fees", "Accounting fees"] },
  { group: "Saving and investing", items: ["Emergency fund", "General savings", "Holiday savings", "House deposit", "Retirement", "Stocks", "ETFs", "Bonds", "Mutual funds", "Crypto", "Precious metals", "Property investment", "Business investment", "Education fund", "Investment fees"] },
  { group: "Gifts, charity and community", items: ["Gifts", "Birthday", "Wedding", "Holiday gifts", "Charity", "Religious giving", "Community support", "Political contribution"] },
  { group: "Business and self-employment", items: ["Inventory", "Materials", "Manufacturing", "Shipping", "Advertising", "Marketing", "Website", "Domain / hosting", "Business software", "Contractors", "Employee payroll", "Business insurance", "Business travel", "Client entertainment", "Equipment", "Licences / permits"] },
  { group: "Transfers and adjustments", items: ["Account transfer", "Cash deposit", "Cash withdrawal", "Opening balance", "Balance correction", "Currency conversion", "Refund adjustment", "Other / custom"] },
];

export const CATEGORY_ITEMS = CATEGORY_GROUPS.flatMap((group) => group.items);

// Active ISO 4217 currency codes commonly used as legal tender.
export const CURRENCY_CODES = [
  "AED","AFN","ALL","AMD","ANG","AOA","ARS","AUD","AWG","AZN","BAM","BBD","BDT","BGN","BHD","BIF","BMD","BND","BOB","BRL","BSD","BTN","BWP","BYN","BZD","CAD","CDF","CHF","CLP","CNY","COP","CRC","CUP","CVE","CZK","DJF","DKK","DOP","DZD","EGP","ERN","ETB","EUR","FJD","FKP","GBP","GEL","GHS","GIP","GMD","GNF","GTQ","GYD","HKD","HNL","HTG","HUF","IDR","ILS","INR","IQD","IRR","ISK","JMD","JOD","JPY","KES","KGS","KHR","KMF","KPW","KRW","KWD","KYD","KZT","LAK","LBP","LKR","LRD","LSL","LYD","MAD","MDL","MGA","MKD","MMK","MNT","MOP","MRU","MUR","MVR","MWK","MXN","MYR","MZN","NAD","NGN","NIO","NOK","NPR","NZD","OMR","PAB","PEN","PGK","PHP","PKR","PLN","PYG","QAR","RON","RSD","RUB","RWF","SAR","SBD","SCR","SDG","SEK","SGD","SHP","SLE","SOS","SRD","SSP","STN","SYP","SZL","THB","TJS","TMT","TND","TOP","TRY","TTD","TWD","TZS","UAH","UGX","USD","UYU","UZS","VES","VND","VUV","WST","XAF","XCD","XOF","XPF","YER","ZAR","ZMW","ZWL"
] as const;

export type CurrencyCode = (typeof CURRENCY_CODES)[number];

export function currencyName(code: string): string {
  try {
    const DisplayNames = Intl.DisplayNames;
    return new DisplayNames(["en"], { type: "currency" }).of(code) ?? code;
  } catch {
    return code;
  }
}

export function currencySymbol(code: string): string {
  try {
    return (
      new Intl.NumberFormat("en", {
        style: "currency",
        currency: code,
        currencyDisplay: "narrowSymbol",
      })
        .formatToParts(0)
        .find((part) => part.type === "currency")?.value ?? code
    );
  } catch {
    return code;
  }
}

export function formatCurrency(value: number, currency: string): string {
  try {
    return new Intl.NumberFormat("de-DE", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${currency} ${value.toFixed(2)}`;
  }
}
