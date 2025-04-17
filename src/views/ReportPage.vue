<template>
  <v-container class="py-8">
    <v-card class="mx-auto" max-width="1000" elevation="2">
      <v-card-title class="text-h4 text-center pa-4">
        Energy Audit Report
      </v-card-title>

      <v-card-subtitle class="text-center pb-0" v-if="propertyAddress">
        {{ propertyAddress }}
      </v-card-subtitle>

      <!-- Property Summary -->
      <v-card-text>
        <h2 class="text-h5 mb-4">Property Summary</h2>
        <v-row>
          <v-col cols="12" sm="6" md="3">
            <div class="text-subtitle-1">Year Built</div>
            <div class="text-h6">{{ propertyData.yearBuilt }}</div>
          </v-col>
          <v-col cols="12" sm="6" md="3">
            <div class="text-subtitle-1">Square Footage</div>
            <div class="text-h6">{{ propertyData.squareFootage }}</div>
          </v-col>
          <v-col cols="12" sm="6" md="3">
            <div class="text-subtitle-1">Bedrooms</div>
            <div class="text-h6">{{ propertyData.bedrooms }}</div>
          </v-col>
          <v-col cols="12" sm="6" md="3">
            <div class="text-subtitle-1">Bathrooms</div>
            <div class="text-h6">{{ propertyData.bathrooms }}</div>
          </v-col>
        </v-row>
      </v-card-text>

      <!-- Energy Use Breakdown -->
      <v-card-text>
        <h2 class="text-h5 mb-4">Energy Use Breakdown</h2>
        <div style="height: 300px">
          <Pie :data="chartData" :options="chartOptions" />
        </div>
      </v-card-text>

      <!-- Top Recommendations -->
      <v-card-text>
        <h2 class="text-h5 mb-4">Top 3 Recommendations</h2>
        <v-row>
          <v-col
            v-for="(rec, index) in propertyData.recommendations"
            :key="index"
            cols="12"
            md="4"
          >
            <v-card variant="outlined" class="h-100">
              <v-card-title class="text-h6">{{ rec.title }}</v-card-title>
              <v-card-text>
                <div class="mb-2">Annual Savings: ${{ rec.savings }}</div>
                <div>Estimated Cost: ${{ rec.cost }}</div>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
      </v-card-text>

      <!-- Financial Summary -->
      <v-card-text>
        <h2 class="text-h5 mb-4">Financial Summary</h2>
        <v-row>
          <v-col cols="12" sm="6">
            <v-card variant="outlined">
              <v-card-title>Estimated Annual Utility Spend</v-card-title>
              <v-card-text class="text-h5"
                >${{ propertyData.annualUtilitySpend }}</v-card-text
              >
            </v-card>
          </v-col>
          <v-col cols="12" sm="6">
            <v-card variant="outlined">
              <v-card-title>Annual Savings Potential</v-card-title>
              <v-card-text class="text-h5"
                >${{ propertyData.savingsPotential }}</v-card-text
              >
            </v-card>
          </v-col>
        </v-row>
      </v-card-text>

      <v-card-actions class="pa-4">
        <v-btn block color="primary" size="large" @click="goBack">
          Back to Start
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-container>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { Pie } from "vue-chartjs";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import { useRouter } from "vue-router";
import { getProperty } from "../services/propertiesService";
import { logAnalyticsEvent } from "../firebase";

ChartJS.register(ArcElement, Tooltip, Legend);

const router = useRouter();
const propertyAddress = ref("");

const props = defineProps({
  id: {
    type: String,
    required: true,
  },
});

onMounted(async () => {
  try {
    const property = await getProperty(props.id);
    propertyAddress.value = property.address;
  } catch (error) {
    console.error("Error:", error);
    router.push("/");
  }
});

// Mock data
const propertyData = {
  yearBuilt: 1985,
  squareFootage: 2400,
  bedrooms: 4,
  bathrooms: 2.5,
  annualUtilitySpend: 3600,
  savingsPotential: 1200,
  recommendations: [
    {
      title: "Upgrade Insulation",
      savings: 500,
      cost: 2000,
    },
    {
      title: "Install Smart Thermostat",
      savings: 300,
      cost: 250,
    },
    {
      title: "Seal Air Leaks",
      savings: 400,
      cost: 800,
    },
  ],
};

const chartData = {
  labels: ["Heating", "Cooling", "Water Heating", "Lighting", "Appliances"],
  datasets: [
    {
      data: [40, 25, 15, 10, 10],
      backgroundColor: ["#FF6384", "#36A2EB", "#FFCE56", "#4BC0C0", "#9966FF"],
    },
  ],
};

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
};

const goBack = () => {
  logAnalyticsEvent("navigation", {
    action: "back_to_home",
    from_report_id: props.id,
  });
  router.push("/");
};
</script>
