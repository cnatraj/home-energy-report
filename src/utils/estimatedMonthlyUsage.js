import { ENERGY_USAGE } from "./constants";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export const calculateMonthlyUsage = (annualUsage) => {
  // If annual usage is "N/A" or not a valid string, return null
  if (!annualUsage || annualUsage === "N/A") {
    return null;
  }

  // Extract the number from the string (e.g., "123,456 kWh" -> 123456)
  const match = annualUsage.match(/(\d+,?)+/);
  if (!match) {
    return null;
  }

  // Convert string "123,456" to number 123456
  const annualKwh = parseInt(match[0].replace(/,/g, ""));

  if (isNaN(annualKwh)) {
    return null;
  }

  return MONTHS.map((month, index) => ({
    month,
    usage: Math.round(
      annualKwh * ENERGY_USAGE.DEFAULT_MONTHLY_DISTRIBUTION[index]
    ),
  }));
};
