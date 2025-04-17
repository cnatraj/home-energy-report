<template>
  <v-container class="fill-height">
    <v-row justify="center" align="center">
      <v-col cols="12" sm="8" md="6">
        <v-card class="pa-6" elevation="2">
          <h1 class="text-h4 mb-6 text-center">Home Energy Audit Report</h1>
          <v-text-field
            id="address-input"
            v-model="address"
            label="Property Address"
            variant="outlined"
            class="mb-4"
            placeholder="Start typing your address..."
            persistent-placeholder
          ></v-text-field>
          <v-btn
            block
            color="primary"
            size="large"
            @click="generateReport"
            :disabled="!address"
          >
            Generate Report
          </v-btn>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import { Loader } from "@googlemaps/js-api-loader";
import { createProperty } from "../services/propertiesService";
import { logAnalyticsEvent } from "../firebase";
import { extractAddressDetails } from "../utils/address";

const router = useRouter();
const address = ref("");
const autocomplete = ref(null);

const GOOGLE_MAPS_API_KEY = "AIzaSyAboRb-Oh6fEdxL2WaTIkK5fc0e3ADLxnQ";

console.log("in here");

onMounted(() => {
  logAnalyticsEvent("page_view", {
    page_title: "Home",
    page_location: window.location.href,
  });

  const loader = new Loader({
    apiKey: GOOGLE_MAPS_API_KEY,
    version: "weekly",
    libraries: ["places"],
  });

  loader.load().then(() => {
    const input = document.getElementById("address-input");
    autocomplete.value = new google.maps.places.Autocomplete(input, {
      types: ["address"],
      componentRestrictions: { country: "us" },
    });

    autocomplete.value.addListener("place_changed", () => {
      const place = autocomplete.value.getPlace();
      console.log("Selected place:", place);
      address.value = place.formatted_address;
    });
  });
});

const generateReport = async () => {
  if (address.value) {
    try {
      const place = autocomplete.value.getPlace();
      const addressDetails = extractAddressDetails(place);
      const id = await createProperty(addressDetails);

      logAnalyticsEvent("generate_report", {
        address: addressDetails.address,
      });

      router.push(`/report/${id}`);
    } catch (error) {
      console.error("Error generating report:", error);
    }
  }
};
</script>

<style>
.pac-container {
  z-index: 9999;
  border-radius: 4px;
  margin-top: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.pac-item {
  padding: 8px 16px;
  cursor: pointer;
}

.pac-item:hover {
  background-color: #f5f5f5;
}
</style>
