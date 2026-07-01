<template>
  <div class="min-h-screen p-6">
    <div class="mx-auto max-w-5xl grid gap-6 md:grid-cols-2">
      <!-- Settings -->
      <div class="self-start rounded-3xl bg-white p-6 shadow">
        <h2 class="text-2xl font-bold flex items-center gap-2">⚙️ Settings</h2>

        <div class="mt-6 space-y-4">
          <div>
            <label class="text-sm font-semibold">Filter</label>
            <select v-model="filter" class="mt-1 w-full rounded-xl border p-3">
              <option value="none">None</option>
              <option value="bw">Black and White</option>
              <option value="sepia">Sepia</option>
            </select>
          </div>

          <div>
            <label class="text-sm font-semibold">Timer</label>
            <select v-model.number="timerSeconds" class="mt-1 w-full rounded-xl border p-3">
              <option :value="1">1 second</option>
              <option :value="3">3 seconds</option>
              <option :value="5">5 seconds</option>
              <option :value="10">10 seconds</option>
            </select>
          </div>

          <div>
            <label class="text-sm font-semibold">How to Use</label>
            <p class="mt-2 text-sm text-gray-600">
              Wait for the timer, then smile! No retakes. Don't forget to download or print your photo — we don't store anything.
            </p>
            <label class="mt-3 flex items-center gap-2 text-sm">
              <input type="checkbox" v-model="understand" /> I understand.
            </label>
          </div>

          <button
            class="mt-2 w-full rounded-full bg-emerald-500 py-3 font-bold text-white disabled:opacity-50"
            :disabled="!canGo"
            @click="go"
          >
            GO
          </button>
        </div>
      </div>

      <!-- Preview Carousel -->
      <div class="rounded-3xl bg-white p-6 shadow">
        <div class="flex items-center justify-between">
          <button
            class="p-2 rounded-full bg-slate-100 hover:bg-slate-200 transition-colors disabled:opacity-30"
            :disabled="previewIndex === 0"
            @click="previewIndex--"
          >
            <i class="fas fa-chevron-left text-slate-700"></i>
          </button>

          <span class="text-sm font-medium text-gray-600">{{ activePreview.label }}</span>

          <button
            class="p-2 rounded-full bg-slate-100 hover:bg-slate-200 transition-colors disabled:opacity-30"
            :disabled="previewIndex === previews.length - 1"
            @click="previewIndex++"
          >
            <i class="fas fa-chevron-right text-slate-700"></i>
          </button>
        </div>

        <div class="mt-3 flex justify-center">
          <img
            :src="activePreview.src"
            class="max-h-[70vh] w-auto rounded-xl border"
            :alt="activePreview.label"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";

type FilterMode = "none" | "bw" | "sepia";
type StoredSettings = { frameUrl: string; filter: FilterMode; timerSeconds: number };

const router = useRouter();

// Hardcoded event frame
const frameUrl = "/aws-screen-frame.png";

const previews = [
  { label: "Screen Preview", src: "/aws-screen-preview.png" },
  { label: "Print Preview", src: "/aws-print-preview.png" },
];
const previewIndex = ref(0);
const activePreview = computed(() => previews[previewIndex.value]!);

const filter = ref<FilterMode>("none");
const timerSeconds = ref<number>(3);
const understand = ref(false);

const canGo = computed(() => understand.value);

function readStoredSettings(): Partial<StoredSettings> {
  try {
    const raw = sessionStorage.getItem("selfsnap.settings");
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return {
      filter: (["none", "bw", "sepia"].includes(parsed.filter) ? parsed.filter : "none") as FilterMode,
      timerSeconds: typeof parsed.timerSeconds === "number" ? parsed.timerSeconds : 3,
    };
  } catch {
    return {};
  }
}

function go() {
  const payload: StoredSettings = {
    frameUrl,
    filter: filter.value,
    timerSeconds: timerSeconds.value,
  };

  sessionStorage.setItem("selfsnap.settings", JSON.stringify(payload));
  router.push("/booth");
}

onMounted(() => {
  const stored = readStoredSettings();
  if (stored.filter) filter.value = stored.filter;
  if (stored.timerSeconds) timerSeconds.value = stored.timerSeconds;
});
</script>
