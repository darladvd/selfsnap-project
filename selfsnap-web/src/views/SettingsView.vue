<template>
  <div class="min-h-screen bg-sky-200 p-6">
    <div class="mx-auto max-w-5xl grid gap-6 md:grid-cols-2">
      <!-- Settings -->
      <div class="rounded-3xl bg-white p-6 shadow">
        <h2 class="text-2xl font-bold flex items-center gap-2">⚙️ Settings</h2>

        <div class="mt-6 space-y-4">
          <div>
            <label class="text-sm font-semibold">Background / Frame</label>
            <select v-model="selectedFrameKey" class="mt-1 w-full rounded-xl border p-3">
              <option value="" disabled>Select a frame...</option>
              <option v-for="f in frames" :key="f.s3Key" :value="f.s3Key">
                {{ f.name ?? f.s3Key }}
              </option>
            </select>
          </div>

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
              <option :value="3">3 seconds</option>
              <option :value="5">5 seconds</option>
              <option :value="10">10 seconds</option>
            </select>
          </div>

          <div class="pt-2">
            <label class="flex items-center gap-2 text-sm">
              <input type="checkbox" v-model="understand" />
              I understand.
            </label>
            <p class="mt-2 text-sm text-gray-600">
              Wait for the timer, then smile! No retakes. Don’t forget to download your photo — we don’t store anything.
            </p>
          </div>

          <button
            class="mt-2 w-full rounded-full bg-emerald-500 py-3 font-bold text-white disabled:opacity-50"
            :disabled="!canGo"
            @click="go"
          >
            GO
          </button>

          <div v-if="error" class="text-sm text-red-600">{{ error }}</div>
        </div>
      </div>

      <!-- Preview -->
      <div class="rounded-3xl bg-white p-6 shadow">
        <div class="text-sm text-gray-500">Preview</div>

        <div class="mt-3 flex justify-center">
          <img
            v-if="selectedFrame?.url"
            :src="selectedFrame.url"
            class="max-h-[70vh] w-auto rounded-xl border"
            alt="Frame preview"
          />
          <div v-else class="h-[70vh] w-full rounded-xl border flex items-center justify-center text-gray-400">
            Select a frame to preview
          </div>
        </div>

        <div class="mt-4 text-xs text-gray-500" v-if="loading">Loading frames...</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";

type Frame = { s3Key: string; name?: string | null; createdAt?: string | null; url: string };

const router = useRouter();
const frames = ref<Frame[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);

const selectedFrameKey = ref("");
const filter = ref<"none" | "bw" | "sepia">("none");
const timerSeconds = ref<number>(3);
const understand = ref(false);

const selectedFrame = computed(() => frames.value.find((f) => f.s3Key === selectedFrameKey.value));
const canGo = computed(() => understand.value && !!selectedFrame.value);

async function loadFrames() {
  loading.value = true;
  error.value = null;
  try {
    const base = import.meta.env.VITE_API_BASE;
    if (!base) throw new Error("Missing VITE_API_BASE in .env.local");
    const res = await fetch(`${base}/frames`, { cache: "no-store" });
    if (!res.ok) throw new Error(`Frames API error: ${res.status}`);
    const data = await res.json();
    frames.value = (data.frames ?? []).filter((f: Frame) => f?.s3Key && !f.s3Key.endsWith("/"));
  } catch (e: any) {
    error.value = e?.message ?? "Failed to load frames.";
  } finally {
    loading.value = false;
  }
}

function go() {
  sessionStorage.setItem(
    "selfsnap_settings",
    JSON.stringify({
      frameUrl: selectedFrame.value!.url,
      filter: filter.value,
      timerSeconds: timerSeconds.value,
    })
  );
  router.push("/booth");
}

onMounted(loadFrames);
</script>
