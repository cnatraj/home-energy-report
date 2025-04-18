<script setup>
import { computed } from "vue";
import { ENERGY_USAGE } from "../utils/constants";

const props = defineProps({
  propertyData: {
    type: Object,
    required: true,
  },
  occupants: {
    type: Number,
    required: true,
  },
});

const estimatedAnnualUsage = computed(() => {
  if (!props.propertyData?.floorSizeSqFt) {
    return "N/A";
  }

  let usage =
    props.propertyData.floorSizeSqFt * ENERGY_USAGE.baseConsumptionRate;

  // Adjust for occupancy
  usage =
    usage * (1 + (props.occupants - 1) * ENERGY_USAGE.occupancyAdjustmentRate);

  // Adjust for solar if installed
  if (props.propertyData.solarInstalled) {
    usage = usage * (1 - ENERGY_USAGE.solarReductionRate);
  }

  // Adjust for pool if present
  if (props.propertyData.hasPool) {
    usage = usage * ENERGY_USAGE.poolPumpUsage;
  }

  // Add appliance usage
  if (props.propertyData.appliances) {
    props.propertyData.appliances.forEach((appliance) => {
      const applianceLower = appliance.toLowerCase();
      if (ENERGY_USAGE.appliances[applianceLower]) {
        usage += ENERGY_USAGE.appliances[applianceLower];
      }
    });
  }

  // Adjust for HVAC efficiency based on year built
  if (props.propertyData.yearBuilt) {
    const year = parseInt(props.propertyData.yearBuilt);
    if (year >= 2010) {
      usage *= ENERGY_USAGE.hvacEfficiency.modern;
    } else if (year >= 1990) {
      usage *= ENERGY_USAGE.hvacEfficiency.standard;
    } else {
      usage *= ENERGY_USAGE.hvacEfficiency.older;
    }
  }

  return `${Math.round(usage).toLocaleString()} kWh`;
});
</script>

<template>
  <div class="text-h6">{{ estimatedAnnualUsage }}</div>
</template>
