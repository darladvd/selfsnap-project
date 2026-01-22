<template>
  <div class="min-h-screen bg-sky-200 p-6">
    <div class="mx-auto max-w-5xl grid gap-6 md:grid-cols-2">
      <!-- Left: live camera -->
      <div class="rounded-3xl bg-white p-6 shadow">
        <div class="flex items-center justify-between">
          <h2 class="text-2xl font-bold">Booth</h2>
          <button
            class="rounded-full border px-4 py-2 text-sm font-semibold"
            @click="flipCamera"
            :disabled="isRunning"
            title="Switch camera (mobile)"
          >
            🔁 Flip
          </button>
        </div>

        <div class="mt-4 relative overflow-hidden rounded-2xl border bg-black">
          <video
            ref="videoEl"
            class="w-full aspect-[3/4] object-cover"
            autoplay
            playsinline
            muted
          ></video>

          <!-- Countdown overlay -->
          <div
            v-if="countdown > 0"
            class="absolute inset-0 flex items-center justify-center bg-black/40"
          >
            <div class="h-24 w-24 rounded-full bg-white/90 flex items-center justify-center text-4xl font-black">
              {{ countdown }}
            </div>
          </div>

          <!-- Shot number overlay -->
          <div class="absolute bottom-3 left-3 rounded-full bg-white/90 px-3 py-1 text-sm font-bold">
            Shot {{ shotIndex }}/3
          </div>
        </div>

        <div class="mt-4 flex gap-3">
          <button
            class="flex-1 rounded-full bg-emerald-500 py-3 font-bold text-white disabled:opacity-50"
            @click="startSequence"
            :disabled="!ready || isRunning"
          >
            {{ isRunning ? "Capturing..." : "Start" }}
          </button>

          <button
            class="rounded-full bg-white px-6 py-3 font-bold shadow disabled:opacity-50"
            @click="back"
            :disabled="isRunning"
          >
            Back
          </button>
        </div>

        <p class="mt-3 text-sm text-gray-600">
          No retakes. It will capture 3 photos automatically using your selected timer.
        </p>

        <p v-if="error" class="mt-3 text-sm text-red-600">{{ error }}</p>
      </div>

      <!-- Right: thumbnails -->
      <div class="rounded-3xl bg-white p-6 shadow">
        <div class="text-sm text-gray-500">Captured</div>

        <div class="mt-3 grid grid-cols-3 gap-3">
          <div
            v-for="i in 3"
            :key="i"
            class="aspect-[3/4] rounded-xl border bg-gray-50 flex items-center justify-center overflow-hidden"
          >
            <img v-if="shots[i-1]" :src="shots[i-1]" class="h-full w-full object-cover" />
            <span v-else class="text-xs text-gray-400">Shot {{ i }}</span>
          </div>
        </div>

        <div class="mt-6 rounded-2xl border p-4">
          <div class="text-sm font-semibold">Selected settings</div>
          <div class="mt-2 text-sm text-gray-700">
            <div>Timer: {{ settings.timerSeconds }}s</div>
            <div>Filter: {{ settings.filter }}</div>
          </div>
        </div>

        <button
          class="mt-6 w-full rounded-full bg-gray-900 py-3 font-bold text-white disabled:opacity-50"
          :disabled="shots.length !== 3 || isRunning"
          @click="goResult"
        >
          Next → Compose
        </button>
      </div>
    </div>

    <!-- hidden capture canvas -->
    <canvas ref="captureCanvas" class="hidden"></canvas>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { sleep } from "../lib/time";
import { ctxFilter, type FilterMode } from "../lib/filters";

type Settings = {
  frameUrl: string;
  filter: FilterMode;
  timerSeconds: number;
};

const router = useRouter();

const videoEl = ref<HTMLVideoElement | null>(null);
const captureCanvas = ref<HTMLCanvasElement | null>(null);

const settings = ref<Settings>({ frameUrl: "", filter: "none", timerSeconds: 3 });

const ready = ref(false);
const error = ref<string | null>(null);

const isRunning = ref(false);
const countdown = ref(0);
const shotIndex = ref(1);

const shots = ref<string[]>([]);

let stream: MediaStream | null = null;
const facingMode = ref<"user" | "environment">("user"); // front camera default

function loadSettings() {
  const raw = sessionStorage.getItem("selfsnap_settings");
  if (!raw) throw new Error("Missing settings. Go back and choose a frame.");
  settings.value = JSON.parse(raw);
}

async function startCamera() {
  stopCamera();
  error.value = null;

  const constraints: MediaStreamConstraints = {
    audio: false,
    video: {
      facingMode: { ideal: facingMode.value },
      width: { ideal: 1280 },
      height: { ideal: 720 },
    },
  };

  stream = await navigator.mediaDevices.getUserMedia(constraints);
  if (!videoEl.value) throw new Error("Video element not ready");
  videoEl.value.srcObject = stream;

  await videoEl.value.play();
  ready.value = true;
}

function stopCamera() {
  ready.value = false;
  if (stream) {
    stream.getTracks().forEach((t) => t.stop());
    stream = null;
  }
}

async function flipCamera() {
  if (isRunning.value) return;
  facingMode.value = facingMode.value === "user" ? "environment" : "user";
  try {
    await startCamera();
  } catch (e: any) {
    error.value = e?.message ?? "Could not switch camera.";
  }
}

function back() {
  router.push("/settings");
}

async function captureCurrentFrame(): Promise<string> {
  const video = videoEl.value!;
  const canvas = captureCanvas.value!;
  const ctx = canvas.getContext("2d")!;
  const vw = video.videoWidth;
  const vh = video.videoHeight;

  // We'll capture a 3:4 portrait crop (matches your frame windows)
  // Compute center-crop from the video feed into 3:4.
  const targetAspect = 3 / 4;
  const videoAspect = vw / vh;

  let sx = 0, sy = 0, sw = vw, sh = vh;

  if (videoAspect > targetAspect) {
    // video too wide -> crop left/right
    sh = vh;
    sw = Math.round(vh * targetAspect);
    sx = Math.round((vw - sw) / 2);
    sy = 0;
  } else {
    // video too tall -> crop top/bottom
    sw = vw;
    sh = Math.round(vw / targetAspect);
    sx = 0;
    sy = Math.round((vh - sh) / 2);
  }

  // Choose output resolution (nice quality but not huge)
  const outW = 900;
  const outH = 1200;
  canvas.width = outW;
  canvas.height = outH;

  ctx.clearRect(0, 0, outW, outH);
  ctx.filter = ctxFilter(settings.value.filter);
  ctx.drawImage(video, sx, sy, sw, sh, 0, 0, outW, outH);
  ctx.filter = "none";

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
  if (!ready.value || isRunning.value) return;
  isRunning.value = true;
  error.value = null;
  shots.value = [];
  shotIndex.value = 1;

  try {
    for (let i = 1; i <= 3; i++) {
      shotIndex.value = i;

      await runCountdown(settings.value.timerSeconds);

      // tiny “flash” pause to feel like a shutter
      await sleep(120);

      const img = await captureCurrentFrame();
      shots.value.push(img);

      // small gap before next timer
      if (i < 3) await sleep(300);
    }

    // store captured shots for Result page
    sessionStorage.setItem(
      "selfsnap_shots",
      JSON.stringify({
        shots: shots.value,
      })
    );
  } catch (e: any) {
    error.value = e?.message ?? "Capture failed.";
  } finally {
    countdown.value = 0;
    isRunning.value = false;
  }
}

function goResult() {
  router.push("/result");
}

onMounted(async () => {
  try {
    loadSettings();
    await startCamera();
  } catch (e: any) {
    error.value = e?.message ?? "Camera error.";
  }
});

onBeforeUnmount(() => {
  stopCamera();
});
</script>
