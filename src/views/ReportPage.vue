<script setup>
import { ref, onMounted, watch, computed } from "vue";
import { useRouter } from "vue-router";
import { getProperty, updatePropertyData } from "../services/propertiesService";
import { logAnalyticsEvent } from "../firebase";
import { ENERGY_USAGE } from "../utils/constants";
import MonthlyUsageChart from "../components/MonthlyUsageChart.vue";
import EstimatedAnnualUsage from "../components/EstimatedAnnualUsage.vue";

const router = useRouter();
const property = ref(null);
const loading = ref(true);
const error = ref(null);
const occupants = ref(ENERGY_USAGE.defaultOccupants);

// Editable property fields
const heating = ref("");
const cooling = ref("");
const constructionType = ref("");
const roofType = ref("");
const solarInstalled = ref(false);
const hasPool = ref(false);

const props = defineProps({
  id: {
    type: String,
    required: true,
  },
});

// Initialize editable fields when property data is loaded
watch(
  () => property.value?.propertyData,
  (newData) => {
    if (newData) {
      heating.value = newData.heating || "";
      cooling.value = newData.cooling || "";
      constructionType.value = newData.construction || "";
      roofType.value = newData.roofType || "";
      solarInstalled.value = newData.solarInstalled || false;
      hasPool.value = newData.hasPool || false;
    }
  },
  { immediate: true }
);

// Update property data and Firestore when fields change
const updateField = async (field, value) => {
  if (!property.value?.propertyData) return;

  // Update local state immediately
  property.value.propertyData[field] = value;

  // Update Firestore asynchronously
  try {
    await updatePropertyData(props.id, {
      ...property.value.propertyData,
      [field]: value,
    });
  } catch (error) {
    console.error(`Error updating ${field}:`, error);
  }
};

// Watch for changes in editable fields
watch(heating, (newValue) => updateField("heating", newValue));
watch(cooling, (newValue) => updateField("cooling", newValue));
watch(constructionType, (newValue) => updateField("construction", newValue));
watch(roofType, (newValue) => updateField("roofType", newValue));
watch(solarInstalled, (newValue) => updateField("solarInstalled", newValue));
watch(hasPool, (newValue) => updateField("hasPool", newValue));

const estimatedAnnualUsage = computed(() => {
  if (!property.value?.propertyData?.floorSizeSqFt) {
    return "N/A";
  }

  const propertyData = property.value.propertyData;
  let usage = propertyData.floorSizeSqFt * ENERGY_USAGE.baseConsumptionRate;

  // Adjust for occupancy
  usage =
    usage * (1 + (occupants.value - 1) * ENERGY_USAGE.occupancyAdjustmentRate);

  // Adjust for solar if installed
  if (propertyData.solarInstalled) {
    usage = usage * (1 - ENERGY_USAGE.solarReductionRate);
  }

  // Adjust for pool if present
  if (propertyData.hasPool) {
    usage = usage * ENERGY_USAGE.poolPumpUsage;
  }

  // Add appliance usage
  if (propertyData.appliances) {
    propertyData.appliances.forEach((appliance) => {
      const applianceLower = appliance.toLowerCase();
      if (ENERGY_USAGE.appliances[applianceLower]) {
        usage += ENERGY_USAGE.appliances[applianceLower];
      }
    });
  }

  // Adjust for HVAC efficiency based on year built
  if (propertyData.yearBuilt) {
    const year = parseInt(propertyData.yearBuilt);
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

const fetchDatafinitiData = async () => {
  const response = await fetch(
    `${import.meta.env.VITE_FIREBASE_FUNCTIONS_URL}/getPropertyData`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        propertyId: props.id,
        address: property.value.mapsData.address,
        city: property.value.mapsData.city,
        state: property.value.mapsData.state,
        zip: property.value.mapsData.zip,
      }),
    }
  );

  if (!response.ok) {
    throw new Error("Failed to fetch property details");
  }

  // Get the updated property data after Datafiniti data is stored
  const updatedData = await getProperty(props.id);
  property.value = updatedData;

  if (updatedData.datafinitiError) {
    throw new Error(updatedData.datafinitiError);
  }
};

const retryDatafiniti = async () => {
  error.value = null;
  loading.value = true;
  try {
    await fetchDatafinitiData();
  } catch (err) {
    error.value = err.message;
  } finally {
    loading.value = false;
  }
};

onMounted(async () => {
  loading.value = true;
  error.value = null;
  try {
    // First get the initial property data
    const data = await getProperty(props.id);
    property.value = data;

    // Check if we need to fetch Datafiniti data
    if (!data.datafinitiFetchedAt) {
      await fetchDatafinitiData();
    } else if (data.datafinitiError) {
      error.value = data.datafinitiError;
    }
  } catch (err) {
    console.error("Error:", err);
    error.value = err.message;
  } finally {
    loading.value = false;
  }
});

const goBack = () => {
  logAnalyticsEvent("navigation", {
    action: "back_to_home",
    from_report_id: props.id,
  });
  router.push("/");
};
</script>

<template>
  <v-container class="py-8">
    <v-card class="mx-auto" max-width="1000" elevation="2">
      <v-card-title class="text-h4 text-center pa-4">
        Energy Audit Report
      </v-card-title>

      <v-card-subtitle
        class="text-center pb-0"
        v-if="property?.mapsData?.address"
      >
        {{ property.mapsData.address }}
      </v-card-subtitle>

      <!-- Loading State -->
      <div v-if="loading" class="d-flex justify-center align-center pa-8">
        <v-progress-circular
          indeterminate
          color="primary"
        ></v-progress-circular>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="pa-4 text-center">
        <v-alert type="error" class="mb-4">
          {{ error }}
        </v-alert>
        <v-btn color="primary" @click="retryDatafiniti">
          Retry Loading Data
        </v-btn>
      </div>

      <template v-else-if="property">
        <!-- Property Summary -->
        <v-card-text>
          <h2 class="text-h5 mb-4">Property Summary</h2>
          <v-row>
            <v-col cols="12" sm="6" md="3">
              <div class="text-subtitle-1">Year Built</div>
              <div class="text-h6">
                {{ property.propertyData?.yearBuilt || "N/A" }}
              </div>
            </v-col>
            <v-col cols="12" sm="6" md="3">
              <div class="text-subtitle-1">Living Area</div>
              <div class="text-h6">
                {{
                  property.propertyData?.floorSizeSqFt
                    ? `${property.propertyData.floorSizeSqFt.toLocaleString()} sq ft`
                    : "N/A"
                }}
              </div>
            </v-col>
            <v-col cols="12" sm="6" md="3">
              <div class="text-subtitle-1">Lot Size</div>
              <div class="text-h6">
                {{
                  property.propertyData?.lotSizeSqFt
                    ? `${property.propertyData.lotSizeSqFt.toLocaleString()} sq ft`
                    : "N/A"
                }}
              </div>
            </v-col>
            <v-col cols="12" sm="6" md="3">
              <div class="text-subtitle-1">Property Use</div>
              <div class="text-h6">
                {{ property.propertyData?.propertyUse || "N/A" }}
              </div>
            </v-col>
          </v-row>
          <v-row class="mt-4">
            <v-col cols="12" sm="6" md="3">
              <div class="text-subtitle-1">Bedrooms</div>
              <div class="text-h6">
                {{ property.propertyData?.numBedrooms || "N/A" }}
              </div>
            </v-col>
            <v-col cols="12" sm="6" md="3">
              <div class="text-subtitle-1">Bathrooms</div>
              <div class="text-h6">
                {{ property.propertyData?.numBathrooms || "N/A" }}
              </div>
            </v-col>
            <v-col cols="12" sm="6" md="3">
              <div class="text-subtitle-1">Parking Spaces</div>
              <div class="text-h6">
                {{ property.propertyData?.totalParkingSpaces || "N/A" }}
              </div>
            </v-col>
            <v-col cols="12" sm="6" md="3"> </v-col>
          </v-row>
        </v-card-text>

        <!-- Neighborhood Data -->
        <v-card-text v-if="property.neighborhoodData">
          <h2 class="text-h5 mb-4">Neighborhood Information</h2>
          <v-row>
            <v-col cols="12" sm="6">
              <div class="text-subtitle-1">Neighborhood</div>
              <div class="text-h6">
                {{ property.neighborhoodData.neighborhood || "N/A" }}
              </div>
            </v-col>
            <v-col cols="12" sm="6">
              <div class="text-subtitle-1">County</div>
              <div class="text-h6">
                {{ property.neighborhoodData.county || "N/A" }}
              </div>
            </v-col>
          </v-row>
        </v-card-text>

        <!-- Appliances -->
        <v-card-text v-if="property.propertyData?.appliances?.length">
          <h2 class="text-h5 mb-4">Appliances</h2>
          <v-chip-group>
            <v-chip
              v-for="appliance in property.propertyData.appliances"
              :key="appliance"
              color="primary"
              variant="outlined"
            >
              {{ appliance }}
            </v-chip>
          </v-chip-group>
        </v-card-text>

        <!-- Risk Assessment -->
        <v-card-text v-if="property.riskData">
          <h2 class="text-h5 mb-4">Risk Assessment</h2>
          <v-row>
            <v-col cols="12" sm="6" md="4">
              <v-card variant="outlined" class="h-100">
                <v-card-title>Flood Risk</v-card-title>
                <v-card-text class="text-capitalize">
                  {{ property.riskData.floodRisk || "N/A" }}
                </v-card-text>
              </v-card>
            </v-col>
            <v-col cols="12" sm="6" md="4">
              <v-card variant="outlined" class="h-100">
                <v-card-title>Earthquake Risk</v-card-title>
                <v-card-text class="text-capitalize">
                  {{ property.riskData.earthquakeRisk || "N/A" }}
                </v-card-text>
              </v-card>
            </v-col>
            <v-col cols="12" sm="6" md="4">
              <v-card variant="outlined" class="h-100">
                <v-card-title>Tornado Risk</v-card-title>
                <v-card-text class="text-capitalize">
                  {{ property.riskData.tornadoRisk || "N/A" }}
                </v-card-text>
              </v-card>
            </v-col>
          </v-row>
        </v-card-text>

        <!-- Energy Features -->
        <v-card-text>
          <h2 class="text-h5 mb-4">Energy Features</h2>
          <v-row>
            <v-col cols="12" sm="6" md="4">
              <v-card variant="outlined" class="h-100">
                <v-card-title>Heating & Cooling</v-card-title>
                <v-card-text>
                  <v-select
                    v-model="heating"
                    :items="ENERGY_USAGE.heatingTypes"
                    label="Heating System"
                    variant="outlined"
                    density="compact"
                    class="mb-2"
                  />
                  <v-select
                    v-model="cooling"
                    :items="ENERGY_USAGE.coolingTypes"
                    label="Cooling System"
                    variant="outlined"
                    density="compact"
                    class="mb-2"
                  />
                  <div>
                    HVAC Installed:
                    {{ property.propertyData?.hvacInstalled || "N/A" }}
                  </div>
                </v-card-text>
              </v-card>
            </v-col>
            <v-col cols="12" sm="6" md="4">
              <v-card variant="outlined" class="h-100">
                <v-card-title>Construction</v-card-title>
                <v-card-text>
                  <v-select
                    v-model="constructionType"
                    :items="ENERGY_USAGE.constructionTypes"
                    label="Construction Type"
                    variant="outlined"
                    density="compact"
                    class="mb-2"
                  />
                  <v-select
                    v-model="roofType"
                    :items="ENERGY_USAGE.roofTypes"
                    label="Roof Type"
                    variant="outlined"
                    density="compact"
                  />
                </v-card-text>
              </v-card>
            </v-col>
            <v-col cols="12" sm="6" md="4">
              <v-card variant="outlined" class="h-100">
                <v-card-title>Additional Features</v-card-title>
                <v-card-text>
                  <v-switch
                    v-model="solarInstalled"
                    label="Solar Installed"
                    color="success"
                    class="mb-2"
                  />
                  <v-switch v-model="hasPool" label="Pool" color="success" />
                </v-card-text>
              </v-card>
            </v-col>
          </v-row>
        </v-card-text>

        <!-- Occupancy Input -->
        <v-card-text>
          <h2 class="text-h5 mb-4">Occupancy</h2>
          <v-slider
            v-model="occupants"
            :min="1"
            :max="10"
            :step="1"
            thumb-label
            label="Number of Occupants"
          ></v-slider>
        </v-card-text>

        <!-- Estimated Annual Usage -->
        <v-card-text>
          <h2 class="text-h5 mb-4">Estimated Annual Usage</h2>
          <div class="text-h6">
            <EstimatedAnnualUsage
              :property-data="property.propertyData"
              :occupants="occupants"
            />
          </div>
        </v-card-text>

        <!-- Monthly Usage Breakdown -->
        <v-card-text v-if="property">
          <h2 class="text-h5 mb-4">Monthly Usage Breakdown</h2>
          <MonthlyUsageChart :annual-usage="estimatedAnnualUsage" />
        </v-card-text>
      </template>

      <v-card-actions class="pa-4">
        <v-btn block color="primary" size="large" @click="goBack">
          Back to Start
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-container>
</template>
