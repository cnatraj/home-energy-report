<script setup>
import { computed } from "vue";
import { Bar } from "vue-chartjs";
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  BarElement,
  CategoryScale,
  LinearScale,
} from "chart.js";
import { calculateMonthlyUsage } from "../utils/estimatedMonthlyUsage";

ChartJS.register(
  Title,
  Tooltip,
  Legend,
  BarElement,
  CategoryScale,
  LinearScale
);

const props = defineProps({
  annualUsage: {
    type: String,
    required: true,
  },
});

const monthlyData = computed(
  () => calculateMonthlyUsage(props.annualUsage) || []
);

const chartData = computed(() => ({
  labels: monthlyData.value.map((m) => m.month),
  datasets: [
    {
      label: "Estimated Usage (kWh)",
      data: monthlyData.value.map((m) => m.usage),
      backgroundColor: "#1976D2",
      borderRadius: 4,
    },
  ],
}));

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: false,
    },
    tooltip: {
      callbacks: {
        label: (context) => {
          return `${context.parsed.y.toLocaleString()} kWh`;
        },
      },
    },
  },
  scales: {
    y: {
      beginAtZero: true,
      ticks: {
        callback: (value) => {
          return value.toLocaleString();
        },
      },
    },
  },
};
</script>

<template>
  <div style="height: 400px">
    <Bar :data="chartData" :options="chartOptions" />
  </div>
</template>
