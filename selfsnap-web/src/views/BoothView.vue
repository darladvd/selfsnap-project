<template>
  <div class="min-h-screen bg-sky-200 flex items-center justify-center p-4">
    <div class="w-full max-w-xl">
      <div class="bg-white/90 rounded-3xl shadow-xl p-6">
        <div class="flex items-center justify-between mb-4">
          <h1 class="text-2xl font-extrabold">Booth</h1>
          <button
            class="px-4 py-2 rounded-full bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-50"
            @click="goBack"
            :disabled="isRunning"
          >
            Back
          </button>
        </div>

        <p class="text-slate-600 mb-4">
          Camera shows only inside the <b>active box</b>.
        </p>

        <div class="relative w-full max-w-sm mx-auto">
          <div class="relative w-full aspect-[9/16] overflow-hidden rounded-3xl bg-slate-100 shadow-lg">
            <!-- Background frame (pure UI) -->
            <img
              v-if="settings.frameUrl"
              :src="settings.frameUrl"
              class="absolute inset-0 w-full h-full object-cover"
              alt="Frame background"
            />

            <!-- Live camera (FULL), but clipped to active slot -->
            <video
              ref="videoEl"
              autoplay
              playsinline
              muted
              class="absolute inset-0 w-full h-full object-cover"
              :style="{
                filter: previewCssFilter,
                clipPath: activeClipPath,
                WebkitClipPath: activeClipPath,
              }"
            />

            <!-- SLOT CONTENT (captured shots live here) + guides -->
            <div class="absolute inset-0 pointer-events-none">
              <div v-for="(st, idx) in slotStyles" :key="idx" class="absolute" :style="st">
                <!-- Captured shot stays in its slot -->
                <img
                  v-if="shots[idx]"
                  :src="shots[idx]"
                  class="absolute inset-0 w-full h-full object-cover"
                  alt="Captured"
                />

                <!-- If empty slot, show faint placeholder (so frame doesn’t look “holey”) -->
                <div v-else class="absolute inset-0 bg-white/35"></div>

                <!-- Border guides -->
                <div
                  class="absolute inset-0"
                  :class="idx === activeSlotIndex ? 'ring-4 ring-emerald-400' : 'ring-2 ring-black/10'"
                ></div>

                <!-- Slot number -->
                <div
                  class="absolute -top-3 left-2 px-2 py-0.5 rounded-full text-[10px] font-bold"
                  :class="idx === activeSlotIndex ? 'bg-emerald-400 text-black' : 'bg-white/90 text-slate-900'"
                >
                  {{ idx + 1 }}
                </div>
              </div>
            </div>

            <!-- Countdown -->
            <div
              v-if="countdown > 0"
              class="absolute inset-0 flex items-center justify-center bg-black/35"
            >
              <div class="w-20 h-20 rounded-full bg-white/90 flex items-center justify-center text-4xl font-black">
                {{ countdown }}
              </div>
            </div>

            <!-- Progress -->
            <div class="absolute top-3 left-3 text-xs px-3 py-1 rounded-full bg-white/85">
              Shot {{ Math.min(shots.length + 1, 4) }} / 4
            </div>

            <!-- Logo badge (UI only) -->
            <div class="absolute top-3 right-3 text-xs px-3 py-1 rounded-full bg-white/85">
              d!
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
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref } from "vue";
import { useRouter } from "vue-router";
import { compute4GridSlots } from "@/lib/layout";

type FilterMode = "none" | "bw" | "sepia";
type Settings = { frameUrl: string; filter: FilterMode; timerSeconds: number };

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

const FRAME_W = 1080;
const FRAME_H = 1920;

/** MUST match ResultView + layout.ts */
const LAYOUT = {
  outerPad: 44,
  gap: 26,
  headerH: 140,
  footerH: 220,
  ratioW: 3,
  ratioH: 4,
};

const slotsPx = computed(() =>
  compute4GridSlots(FRAME_W, FRAME_H, {
    outerPad: LAYOUT.outerPad,
    gap: LAYOUT.gap,
    ratioW: LAYOUT.ratioW,
    ratioH: LAYOUT.ratioH,
    headerH: LAYOUT.headerH,
    footerH: LAYOUT.footerH,
  })
);

const slotStyles = computed(() =>
  slotsPx.value.map((s) => ({
    left: `${(s.x / FRAME_W) * 100}%`,
    top: `${(s.y / FRAME_H) * 100}%`,
    width: `${(s.w / FRAME_W) * 100}%`,
    height: `${(s.h / FRAME_H) * 100}%`,
  }))
);

/**
 * Active slot for preview:
 * - if running: currentShotIndex
 * - if not running: show slot 0 (so user sees where they’ll be framed)
 */
const activeSlotIndex = computed(() => (isRunning.value ? currentShotIndex.value : 0));

/**
 * Clip-path that reveals the FULL-SIZE video only inside the active slot.
 * This is the key fix for the “preview is wrong again” problem.
 */
const activeClipPath = computed(() => {
  const s = slotsPx.value[activeSlotIndex.value];
  if (!s) return "inset(0 0 0 0)";

  const top = (s.y / FRAME_H) * 100;
  const left = (s.x / FRAME_W) * 100;
  const bottom = 100 - ((s.y + s.h) / FRAME_H) * 100;
  const right = 100 - ((s.x + s.w) / FRAME_W) * 100;

  // sharp corners (no "round")
  return `inset(${top}% ${right}% ${bottom}% ${left}%)`;
});

const previewCssFilter = computed(() => {
  if (settings.filter === "bw") return "grayscale(1)";
  if (settings.filter === "sepia") return "sepia(1)";
  return "none";
});

function loadSettings(): Settings {
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

async function captureOneShot(shotIndex: number): Promise<string> {
  const v = videoEl.value;
  if (!v) throw new Error("Video not ready");

  const frameCanvas = document.createElement("canvas");
  frameCanvas.width = FRAME_W;
  frameCanvas.height = FRAME_H;

  const fctx = frameCanvas.getContext("2d");
  if (!fctx) throw new Error("Frame canvas context missing");

  // Full-frame render (this matches the <video> sizing)
  drawVideoCoverToCanvas(fctx, v, FRAME_W, FRAME_H, settings.filter);

  const s = slotsPx.value[shotIndex];
  if (!s) throw new Error("Missing slot for shot");

  const outW = 1080;
  const outH = 1440;

  const shotCanvas = document.createElement("canvas");
  shotCanvas.width = outW;
  shotCanvas.height = outH;

  const sctx = shotCanvas.getContext("2d");
  if (!sctx) throw new Error("Shot canvas context missing");

  sctx.drawImage(frameCanvas, s.x, s.y, s.w, s.h, 0, 0, outW, outH);
  return shotCanvas.toDataURL("image/jpeg", 0.92);
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
      const shot = await captureOneShot(i);

      // store immediately so it appears in the slot BEFORE moving on
      shots.value = [...shots.value, shot];

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
