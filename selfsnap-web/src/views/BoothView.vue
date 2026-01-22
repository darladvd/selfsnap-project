<template>
  <div class="min-h-screen bg-sky-200 flex items-center justify-center p-4">
    <div class="w-full max-w-5xl grid gap-6 lg:grid-cols-2">
      <!-- Left: Camera -->
      <div class="bg-white/90 rounded-3xl shadow-xl p-6">
        <div class="flex items-center justify-between mb-4">
          <h1 class="text-2xl font-extrabold">Booth</h1>
          <button
            class="px-4 py-2 rounded-full bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50"
            @click="goBack"
            :disabled="isRunning"
          >
            Back
          </button>
        </div>

        <p class="text-slate-600 mb-4">
          This preview box is the <b>exact</b> crop that will be saved (3:4). You’ll take <b>4 shots</b>.
        </p>

        <div class="relative w-full max-w-sm mx-auto">
          <!-- EXACT CROP WINDOW (3:4) -->
          <div class="relative w-full aspect-[3/4] overflow-hidden rounded-3xl bg-black shadow-lg">
            <video
              ref="videoEl"
              autoplay
              playsinline
              muted
              class="absolute inset-0 w-full h-full object-cover"
              :style="{ filter: previewCssFilter }"
            />

            <!-- framing outline -->
            <div class="absolute inset-0 ring-4 ring-white/60 rounded-3xl pointer-events-none"></div>

            <!-- countdown overlay -->
            <div
              v-if="countdown > 0"
              class="absolute inset-0 flex items-center justify-center bg-black/40"
            >
              <div class="w-20 h-20 rounded-full bg-white/90 flex items-center justify-center text-4xl font-black">
                {{ countdown }}
              </div>
            </div>

            <!-- shot progress -->
            <div class="absolute top-3 left-3 text-xs px-3 py-1 rounded-full bg-white/80">
              Shot {{ currentShotIndex + (isRunning ? 1 : 0) }} / 4
            </div>
          </div>

          <div class="mt-4 flex items-center justify-center gap-3">
            <button
              class="px-6 py-3 rounded-full bg-emerald-500 text-white font-bold hover:bg-emerald-600 disabled:opacity-50"
              @click="startSequence"
              :disabled="!cameraReady || isRunning"
            >
              {{ isRunning ? "Capturing..." : "Start" }}
            </button>

            <button
              class="px-6 py-3 rounded-full bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-50"
              @click="flipCamera"
              :disabled="isRunning"
              title="Try switching front/back camera"
            >
              Flip
            </button>
          </div>

          <p v-if="errorMsg" class="mt-3 text-sm text-red-600 text-center">{{ errorMsg }}</p>
        </div>
      </div>

      <!-- Right: Info + thumbnails -->
      <div class="bg-white/90 rounded-3xl shadow-xl p-6">
        <h2 class="text-lg font-bold mb-3">Settings in use</h2>
        <div class="text-sm text-slate-700 space-y-1 mb-6">
          <div><b>Timer:</b> {{ settings.timerSeconds }}s</div>
          <div><b>Filter:</b> {{ settings.filter }}</div>
          <div class="break-all"><b>Frame:</b> {{ settings.frameUrl || "(none)" }}</div>
        </div>

        <h2 class="text-lg font-bold mb-3">Captured so far</h2>
        <div class="grid grid-cols-4 gap-3">
          <div
            v-for="(s, idx) in shots"
            :key="idx"
            class="aspect-[3/4] rounded-2xl overflow-hidden bg-slate-100 border border-slate-200"
          >
            <img :src="s" class="w-full h-full object-cover" />
          </div>

          <div
            v-for="k in Math.max(0, 4 - shots.length)"
            :key="'ph-' + k"
            class="aspect-[3/4] rounded-2xl bg-slate-100 border border-dashed border-slate-300 flex items-center justify-center text-slate-400 text-xs"
          >
            waiting
          </div>
        </div>

        <div class="mt-6 text-xs text-slate-500">
          We don’t store anything on the server. Your images exist only in your browser session.
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref } from "vue";
import { useRouter } from "vue-router";

type FilterMode = "none" | "bw" | "sepia";
type Settings = {
  frameUrl: string;
  filter: FilterMode;
  timerSeconds: number; // 3, 5, 10
};

const router = useRouter();

const videoEl = ref<HTMLVideoElement | null>(null);
const streamRef = ref<MediaStream | null>(null);

const cameraReady = ref(false);
const isRunning = ref(false);
const countdown = ref(0);
const currentShotIndex = ref(0);
const shots = ref<string[]>([]);
const errorMsg = ref<string>("");

const facingMode = ref<"user" | "environment">("user");

const settings = reactive<Settings>(loadSettings());

const previewCssFilter = computed(() => {
  if (settings.filter === "bw") return "grayscale(1)";
  if (settings.filter === "sepia") return "sepia(1)";
  return "none";
});

function loadSettings(): Settings {
  // Priority 1: query params (optional)
  // Priority 2: sessionStorage ("selfsnap.settings")
  // Fallback defaults
  try {
    const raw = sessionStorage.getItem("selfsnap.settings");
    if (raw) return { frameUrl: "", filter: "none", timerSeconds: 3, ...JSON.parse(raw) };
  } catch {}
  return { frameUrl: "", filter: "none", timerSeconds: 3 };
}

function saveShotsToSession(dataUrls: string[]) {
  sessionStorage.setItem("selfsnap.shots", JSON.stringify(dataUrls));
}

async function startCamera() {
  errorMsg.value = "";
  cameraReady.value = false;

  // Stop old stream
  if (streamRef.value) {
    streamRef.value.getTracks().forEach((t) => t.stop());
    streamRef.value = null;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: facingMode.value,
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
      audio: false,
    });

    streamRef.value = stream;

    if (!videoEl.value) throw new Error("Video element missing");
    videoEl.value.srcObject = stream;

    await new Promise<void>((resolve) => {
      const v = videoEl.value!;
      const onReady = () => {
        v.removeEventListener("loadedmetadata", onReady);
        resolve();
      };
      v.addEventListener("loadedmetadata", onReady);
    });

    cameraReady.value = true;
  } catch (err: any) {
    errorMsg.value =
      err?.name === "NotAllowedError"
        ? "Camera permission denied. Please allow camera access."
        : `Failed to start camera: ${err?.message ?? String(err)}`;
  }
}

function goBack() {
  router.push("/");
}

async function flipCamera() {
  facingMode.value = facingMode.value === "user" ? "environment" : "user";
  await startCamera();
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function canvasFilterString(mode: FilterMode) {
  if (mode === "bw") return "grayscale(1)";
  if (mode === "sepia") return "sepia(1)";
  return "none";
}

function drawVideoCoverToCanvas(
  ctx: CanvasRenderingContext2D,
  video: HTMLVideoElement,
  outW: number,
  outH: number,
  filterMode: FilterMode
) {
  const vw = video.videoWidth;
  const vh = video.videoHeight;

  const scale = Math.max(outW / vw, outH / vh);
  const sw = outW / scale;
  const sh = outH / scale;

  const sx = (vw - sw) / 2;
  const sy = (vh - sh) / 2;

  ctx.save();
  ctx.filter = canvasFilterString(filterMode);
  ctx.drawImage(video, sx, sy, sw, sh, 0, 0, outW, outH);
  ctx.restore();
}

async function captureOneShot(): Promise<string> {
  const v = videoEl.value;
  if (!v) throw new Error("Video not ready");

  // 3:4 output per shot
  const outW = 1080;
  const outH = 1440;

  const canvas = document.createElement("canvas");
  canvas.width = outW;
  canvas.height = outH;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas context missing");

  drawVideoCoverToCanvas(ctx, v, outW, outH, settings.filter);

  return canvas.toDataURL("image/jpeg", 0.92);
}

async function runCountdown(seconds: number) {
  countdown.value = seconds;
  while (countdown.value > 0) {
    await sleep(1000);
    countdown.value -= 1;
  }
}

async function startSequence() {
  if (!cameraReady.value || isRunning.value) return;

  isRunning.value = true;
  errorMsg.value = "";
  shots.value = [];
  currentShotIndex.value = 0;

  try {
    for (let i = 0; i < 4; i++) {
      currentShotIndex.value = i;

      await runCountdown(settings.timerSeconds);
      const shot = await captureOneShot();
      shots.value.push(shot);

      // quick breathing room between shots
      await sleep(250);
    }

    saveShotsToSession(shots.value);
    router.push("/result");
  } catch (err: any) {
    errorMsg.value = `Capture failed: ${err?.message ?? String(err)}`;
  } finally {
    countdown.value = 0;
    isRunning.value = false;
  }
}

onMounted(async () => {
  // Load settings fresh (in case Settings page updated it)
  Object.assign(settings, loadSettings());
  await startCamera();
});

onBeforeUnmount(() => {
  if (streamRef.value) {
    streamRef.value.getTracks().forEach((t) => t.stop());
    streamRef.value = null;
  }
});
</script>
