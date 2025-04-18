// System age constants
const SYSTEM_AGES = {
  HVAC: 25, // Average age of HVAC systems in years
  WATER_HEATER: 12, // Average age of water heaters in years
  ROOF: 25, // Average age of roofs in years
};

// Energy Usage Constants
export const ENERGY_USAGE = {
  // Base consumption rate in kWh per square foot per year
  baseConsumptionRate: 10,

  // Default number of occupants
  defaultOccupants: 3,

  // Occupancy adjustment - percentage increase per occupant
  occupancyAdjustmentRate: 0.2,

  // Solar reduction - percentage reduction if solar is installed
  solarReductionRate: 0.5,

  // Appliance multipliers - additional kWh per year
  appliances: {
    refrigerator: 600,
    dishwasher: 300,
    washer: 100,
    dryer: 900,
    oven: 350,
    microwave: 100,
  },

  // Pool pump energy usage multiplier (15% increase in base consumption)
  poolPumpUsage: 1.15,

  // HVAC efficiency factors (multipliers)
  hvacEfficiency: {
    modern: 0.85, // Modern/efficient systems
    standard: 1.0, // Standard systems
    older: 1.2, // Older/less efficient systems
  },

  // Insulation quality multipliers based on construction type
  insulationQualityMultiplier: {
    poor: 1.15,
    average: 1.0,
    good: 0.95,
    excellent: 0.9,
  },

  // Roof type energy efficiency multipliers
  roofTypeMultiplier: {
    tile: 0.95, // good thermal mass
    clay: 0.95, // same as tile
    metal: 0.9, // often reflective, good for hot climates
    shingle: 1.0, // standard
    asphalt: 1.0,
    wood: 1.05, // poor insulation, ages fast
    slate: 0.92, // excellent insulation
    flat: 1.08, // prone to heat absorption and poor runoff
    tar: 1.1,
    gravel: 1.1,
    unknown: 1.0,
    other: 1.0,
  },

  // Monthly usage distribution (percentage of annual usage)
  DEFAULT_MONTHLY_DISTRIBUTION: [
    0.075, // January
    0.065, // February
    0.07, // March
    0.075, // April
    0.08, // May
    0.095, // June
    0.11, // July
    0.11, // August
    0.095, // September
    0.08, // October
    0.075, // November
    0.07, // December
  ],

  // Available options for dropdowns
  heatingTypes: [
    "Forced Air",
    "Heat Pump",
    "Radiant",
    "Baseboard",
    "Geothermal",
    "None",
  ],

  coolingTypes: [
    "Central Air",
    "Heat Pump",
    "Window Units",
    "Mini Split",
    "Evaporative",
    "None",
  ],

  constructionTypes: [
    "Wood Frame",
    "Brick",
    "Concrete",
    "Steel Frame",
    "Stone",
    "Stucco",
    "Block",
    "Other",
  ],

  roofTypes: [
    "Asphalt Shingle",
    "Metal",
    "Tile",
    "Slate",
    "Wood Shake",
    "Flat/Built-up",
    "Other",
  ],
};
