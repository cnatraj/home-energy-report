import { createRouter, createWebHistory } from "vue-router";
import HomePage from "../views/HomePage.vue";
import ReportPage from "../views/ReportPage.vue";

const routes = [
  {
    path: "/",
    name: "Home",
    component: HomePage,
  },
  {
    path: "/report/:id",
    name: "Report",
    component: ReportPage,
    props: true,
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
