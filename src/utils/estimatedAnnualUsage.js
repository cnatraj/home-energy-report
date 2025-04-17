import { ENERGY_USAGE } from "./constants";
import { computed } from "vue";

export const getHvacEfficiency = (hvacInstalled) => {
  // If hvacInstalled is not a valid number, return standard efficiency
  if (!hvacInstalled || isNaN(hvacInstalled)) {
    return "standard";
  }

  const currentYear = new Date().getFullYear();
  const age = currentYear - hvacInstalled;

  if (age <= 5) return "modern"; // e.g., built or replaced 2020+
  if (age <= 15) return "standard"; // e.g., 2010–2019
  return "older";
};

const getInsulationQualityFromConstruction = (constructionType = "") => {
  if (!constructionType) return "average";

  const type = constructionType.toLowerCase();

  if (type.includes("concrete") || type.includes("brick")) return "excellent";
  if (type.includes("stucco") || type.includes("steel")) return "good";
  if (type.includes("wood") || type.includes("siding")) return "average";
  if (type.includes("mobile") || type.includes("modular")) return "poor";

  // Default fallback
  return "average";
};

const getRoofTypeMultiplier = (roofType = "") => {
  if (!roofType) return ENERGY_USAGE.roofTypeMultiplier.unknown;

  const type = roofType.toLowerCase();

  // Check for exact matches first
  if (ENERGY_USAGE.roofTypeMultiplier[type]) {
    return ENERGY_USAGE.roofTypeMultiplier[type];
  }

  // Check for partial matches
  for (const [key, value] of Object.entries(ENERGY_USAGE.roofTypeMultiplier)) {
    if (type.includes(key)) {
      return value;
    }
  }

  // Default to unknown if no match found
  return ENERGY_USAGE.roofTypeMultiplier.unknown;
};

export const createEstimatedAnnualUsage = (property, occupants) => {
  return computed(() => {
    if (!property.value?.propertyData?.floorSizeSqFt) {
      return "N/A";
    }

    const propertyData = property.value.propertyData;
    let usage = propertyData.floorSizeSqFt * ENERGY_USAGE.baseConsumptionRate;

    // Ensure occupants is a valid number
    const occupantCount =
      Number(occupants.value) || ENERGY_USAGE.defaultOccupants;

    // Adjust for occupancy
    usage =
      usage * (1 + (occupantCount - 1) * ENERGY_USAGE.occupancyAdjustmentRate);

    // Adjust for solar if installed
    if (propertyData.solarInstalled) {
      usage = usage * (1 - ENERGY_USAGE.solarReductionRate);
    }

    // Adjust for pool if present
    if (propertyData.hasPool) {
      usage = usage * ENERGY_USAGE.poolPumpUsage;
    }

    // Adjust for HVAC efficiency based on installation year
    const hvacEfficiency = getHvacEfficiency(propertyData.hvacInstalled);

    // Ensure we have a valid efficiency multiplier
    const efficiencyMultiplier =
      ENERGY_USAGE.hvacEfficiency[hvacEfficiency] ||
      ENERGY_USAGE.hvacEfficiency.standard;
    usage *= efficiencyMultiplier;

    // Apply insulation quality multiplier based on construction type
    const insulationQuality = getInsulationQualityFromConstruction(
      propertyData.construction
    );
    const insulationMultiplier =
      ENERGY_USAGE.insulationQualityMultiplier[insulationQuality];
    usage *= insulationMultiplier;

    // Apply roof type multiplier
    const roofMultiplier = getRoofTypeMultiplier(propertyData.roofType);
    usage *= roofMultiplier;

    // Add appliance usage
    if (propertyData.appliances) {
      propertyData.appliances.forEach((appliance) => {
        const applianceLower = appliance.toLowerCase();
        if (ENERGY_USAGE.appliances[applianceLower]) {
          usage += ENERGY_USAGE.appliances[applianceLower];
        }
      });
    }

    // Ensure the final result is a valid number
    if (isNaN(usage) || !isFinite(usage)) {
      return "N/A";
    }

    return `${Math.round(usage).toLocaleString()} kWh`;
  });
};
