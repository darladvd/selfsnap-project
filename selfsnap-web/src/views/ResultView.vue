<template>
  <div class="min-h-screen bg-sky-200 flex items-center justify-center p-4">
    <div class="w-full max-w-6xl grid gap-6 lg:grid-cols-2">
      <!-- Left: Result preview -->
      <div class="bg-white/90 rounded-3xl shadow-xl p-6">
        <div class="flex items-center justify-between mb-4">
          <h1 class="text-2xl font-extrabold">Result</h1>
          <button
            class="px-4 py-2 rounded-full bg-white border border-slate-200 hover:bg-slate-50"
            @click="tryAgain"
          >
            Try Again
          </button>
        </div>

        <div class="flex justify-center">
          <div class="bg-slate-50 rounded-2xl p-4 border border-slate-200">
            <canvas ref="canvasEl" class="w-[260px] sm:w-[320px] md:w-[360px] rounded-xl"></canvas>
          </div>
        </div>

        <button
          class="mt-6 w-full py-3 rounded-full bg-blue-600 text-white font-bold hover:bg-blue-700 disabled:opacity-50"
          :disabled="!composedUrl"
          @click="download"
        >
          Download
        </button>

        <p v-if="errorMsg" class="mt-3 text-sm text-red-600 text-center">{{ errorMsg }}</p>
      </div>

      <!-- Right: Debug/info -->
      <div class="bg-white/90 rounded-3xl shadow-xl p-6">
        <h2 class="text-lg font-bold mb-3">Captured shots</h2>
        <div class="grid grid-cols-4 gap-3">
          <div
            v-for="(s, idx) in shots"
            :key="idx"
            class="aspect-[3/4] rounded-2xl overflow-hidden bg-slate-100 border border-slate-200"
          >
            <img :src="s" class="w-full h-full object-cover" />
          </div>
        </div>

        <div class="mt-6 border border-slate-200 rounded-2xl p-4 text-sm text-slate-700">
          <div class="font-bold mb-2">Applied settings</div>
          <div><b>Filter:</b> {{ settings.filter }}</div>
          <div><b>Timer:</b> {{ settings.timerSeconds }}s</div>
          <div class="break-all"><b>Frame:</b> {{ settings.frameUrl || "(none)" }}</div>
          <div><b>Date:</b> {{ dateStr }}</div>
        </div>

        <div class="mt-6 text-xs text-slate-500">
          Note: if your frame image is hosted on CloudFront/S3, it must allow CORS (so canvas can draw it).
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import { useRouter } from "vue-router";
import { compute4GridSlots } from "@/lib/layout";

type FilterMode = "none" | "bw" | "sepia";
type Settings = {
  frameUrl: string;
  filter: FilterMode;
  timerSeconds: number;
};

const router = useRouter();

const canvasEl = ref<HTMLCanvasElement | null>(null);
const composedUrl = ref<string>("");
const errorMsg = ref<string>("");

const shots = ref<string[]>(loadShots());
const settings = reactive<Settings>(loadSettings());

const dateStr = computed(() => formatMMDDYYYY(new Date()));

function loadSettings(): Settings {
  try {
    const raw = sessionStorage.getItem("selfsnap.settings");
    if (raw) return { frameUrl: "", filter: "none", timerSeconds: 3, ...JSON.parse(raw) };
  } catch {}
  return { frameUrl: "", filter: "none", timerSeconds: 3 };
}

function loadShots(): string[] {
  try {
    const raw = sessionStorage.getItem("selfsnap.shots");
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) return arr.filter((x) => typeof x === "string");
    }
  } catch {}
  return [];
}

function formatMMDDYYYY(d: Date) {
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const yy = String(d.getFullYear());
  return `${mm}-${dd}-${yy}`;
}

function canvasFilterString(mode: FilterMode) {
  if (mode === "bw") return "grayscale(1)";
  if (mode === "sepia") return "sepia(1)";
  return "none";
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous"; // IMPORTANT for CloudFront/S3 canvas
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    img.src = src;
  });
}

function drawCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
  filter: FilterMode
) {
  const iw = img.naturalWidth;
  const ih = img.naturalHeight;

  const scale = Math.max(w / iw, h / ih);
  const sw = w / scale;
  const sh = h / scale;

  const sx = (iw - sw) / 2;
  const sy = (ih - sh) / 2;

  ctx.save();
  ctx.filter = canvasFilterString(filter);
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
  ctx.restore();
}

function roundedRectClip(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
  ctx.clip();
}

async function compose() {
  errorMsg.value = "";
  composedUrl.value = "";

  if (shots.value.length !== 4) {
    errorMsg.value = `Need exactly 4 shots to compose. Found: ${shots.value.length}`;
    return;
  }

  const canvas = canvasEl.value;
  if (!canvas) {
    errorMsg.value = "Canvas missing";
    return;
  }

  // Final output size: IG Story friendly
  const W = 1080;
  const H = 1920;

  canvas.width = W;
  canvas.height = H;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    errorMsg.value = "Canvas context missing";
    return;
  }

  // 1) Draw background frame (recommended: PNG without black rectangles)
  if (settings.frameUrl) {
    const frameImg = await loadImage(settings.frameUrl);
    ctx.drawImage(frameImg, 0, 0, W, H);
  } else {
    // fallback background
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, W, H);
  }

  // 2) Slots (2x2, 3:4)
  const slots = compute4GridSlots({
    canvasW: W,
    canvasH: H,
    topMargin: 180,
    bottomReserved: 260,
    colGap: 70,
    rowGap: 90,
    sideMargin: 90,
    aspectW: 3,
    aspectH: 4,
  });

  // 3) Draw shots into slots
  for (let i = 0; i < 4; i++) {
    const shotSrc = shots.value[i];
    const slot = slots[i];
    if (!shotSrc || !slot) throw new Error("Missing shot or slot");

    const shotImg = await loadImage(shotSrc);

    ctx.save();
    roundedRectClip(ctx, slot.x, slot.y, slot.w, slot.h, 28);
    drawCover(ctx, shotImg, slot.x, slot.y, slot.w, slot.h, settings.filter);
    ctx.restore();

    // Optional border
    ctx.save();
    ctx.strokeStyle = "rgba(0,0,0,0.08)";
    ctx.lineWidth = 6;
    ctx.beginPath();
    // fake rounded stroke by clipping first then stroking rect
    roundedRectClip(ctx, slot.x, slot.y, slot.w, slot.h, 28);
    ctx.restore();
  }

  // 4) Footer text (SelfSnap! + date)
  ctx.save();
  ctx.fillStyle = "#111827";
  ctx.textAlign = "center";

  ctx.font = "bold 96px system-ui, -apple-system, Segoe UI, Roboto, Arial";
  ctx.fillText("SelfSnap!", W / 2, H - 140);

  ctx.font = "600 54px system-ui, -apple-system, Segoe UI, Roboto, Arial";
  ctx.fillText(dateStr.value, W / 2, H - 70);
  ctx.restore();

  // 5) Export composed
  composedUrl.value = canvas.toDataURL("image/png");
}

function download() {
  if (!composedUrl.value) return;
  const a = document.createElement("a");
  a.href = composedUrl.value;
  a.download = `selfsnap-${dateStr.value}.png`;
  a.click();
}

function tryAgain() {
  // Clear shots
  sessionStorage.removeItem("selfsnap.shots");
  router.push("/");
}

onMounted(async () => {
  try {
    await compose();
  } catch (err: any) {
    errorMsg.value = err?.message ?? String(err);
  }
});
</script>
