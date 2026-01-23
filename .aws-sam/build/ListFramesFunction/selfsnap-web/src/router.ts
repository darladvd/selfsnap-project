import { createRouter, createWebHistory } from "vue-router";
import LandingView from "./views/LandingView.vue";
import SettingsView from "./views/SettingsView.vue";
import BoothView from "./views/BoothView.vue";
import ResultView from "./views/ResultView.vue";

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/", component: LandingView },
    { path: "/settings", component: SettingsView },
    { path: "/booth", component: BoothView },
    { path: "/result", component: ResultView },
  ],
});
