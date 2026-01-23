import { createRouter, createWebHistory } from "vue-router";
import LandingView from "./views/LandingView.vue";
import SettingsView from "./views/SettingsView.vue";
import BoothView from "./views/BoothView.vue";
import ResultView from "./views/ResultView.vue";

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/", name: "home", component: LandingView },
    { path: "/settings", name: "settings", component: SettingsView },
    { path: "/booth", name: "booth", component: BoothView },
    { path: "/result", name: "result", component: ResultView },
  ],
});

router.beforeEach((to, from, next) => {
  const isRefresh = !from.name;

  if (isRefresh && to.name !== "home") {
    next({ name: "home" });
  } else {
    next();
  }
});
