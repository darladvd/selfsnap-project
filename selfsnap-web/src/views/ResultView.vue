<template>
  <div class="min-h-screen flex items-center justify-center p-4">
    <div class="w-full max-w-xl">
      <div class="bg-white/90 rounded-3xl shadow-xl p-6">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-2xl font-bold flex items-center gap-2">
            <span aria-hidden="true">💙</span>
            Result
          </h2>

          <button
            class="p-3 rounded-full bg-white border border-slate-200 hover:bg-slate-50 transition-colors"
            @click="tryAgain"
            title="Try again"
          >
            <i class="fas fa-arrow-rotate-left text-slate-800"></i>
          </button>
        </div>

        <div class="flex justify-center">
          <div class="bg-slate-50 rounded-2xl p-4 border border-slate-200">
            <canvas ref="canvasEl" class="w-[260px] sm:w-[320px] md:w-[360px] rounded-xl"></canvas>
          </div>
        </div>

        <!-- Primary CTAs: Download & Share -->
        <div class="mt-6 flex flex-col sm:flex-row gap-3">
          <button
            class="flex-1 py-3 rounded-full bg-blue-500 text-white font-bold hover:bg-blue-600 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            :disabled="!composedUrl"
            @click="download"
          >
            <i class="fas fa-download"></i>
            <span>DOWNLOAD</span>
          </button>

          <button
            v-if="canShare"
            class="flex-1 py-3 rounded-full bg-emerald-500 text-white font-bold hover:bg-emerald-600 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            :disabled="!composedUrl || isSharing"
            @click="share"
          >
            <i v-if="!isSharing" class="fas fa-share"></i>
            <i v-else class="fas fa-circle-notch fa-spin"></i>
            <span>{{ isSharing ? "Sharing..." : "SHARE" }}</span>
          </button>
        </div>

        <!-- Secondary: Print (for kiosk staff) -->
        <div class="mt-3 flex justify-center">
          <button
            class="py-2 px-4 text-sm text-slate-500 hover:text-slate-700 disabled:opacity-50 transition-colors flex items-center gap-1 print:hidden"
            :disabled="!composedUrl || isPrinting"
            @click="printPhoto"
          >
            <i v-if="!isPrinting" class="fas fa-print"></i>
            <i v-else class="fas fa-circle-notch fa-spin"></i>
            <span>{{ isPrinting ? "Printing..." : "Print" }}</span>
          </button>
        </div>

        <p v-if="errorMsg" class="mt-3 text-sm text-red-600 text-center">{{ errorMsg }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import { useRouter } from "vue-router";
import { compute4GridSlots } from "@/lib/layout";
import { computePrintStripSlots } from "@/lib/printLayout";

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

const isSharing = ref(false);
const isPrinting = ref(false);

const fileDate = (() => {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const yy = String(d.getFullYear());
  return `${mm}-${dd}-${yy}`;
})();

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

function canvasFilterString(mode: FilterMode) {
  if (mode === "bw") return "grayscale(1)";
  if (mode === "sepia") return "sepia(1)";
  return "none";
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    (img as any).decoding = "async";
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

  const W = 1080;
  const H = 1920;

  canvas.width = W;
  canvas.height = H;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    errorMsg.value = "Canvas context missing";
    return;
  }

  // background — always use the event frame
  const frameImg = await loadImage("/aws-screen-frame.png");
  ctx.drawImage(frameImg, 0, 0, W, H);

  // slots (must match layout)
  const slots = compute4GridSlots(W, H, {
    outerPad: 44,
    gap: 26,
    ratioW: 3,
    ratioH: 4,
    headerH: 140,
    footerH: 220,
  });

  // draw shots
  for (let i = 0; i < 4; i++) {
    const shotSrc = shots.value[i];
    const slot = slots[i];
    if (!shotSrc || !slot) throw new Error("Missing shot or slot");

    const shotImg = await loadImage(shotSrc);

    ctx.save();
    ctx.beginPath();
    ctx.rect(slot.x, slot.y, slot.w, slot.h);
    ctx.clip();

    drawCover(ctx, shotImg, slot.x, slot.y, slot.w, slot.h, settings.filter);
    ctx.restore();
  }

  // No footer text — frame handles branding

  // Date at the bottom
  ctx.save();
  ctx.textAlign = "center";
  ctx.fillStyle = "#333333";
  ctx.font = "bold 48px system-ui, -apple-system, Segoe UI, Roboto, Arial";
  ctx.fillText(fileDate, W / 2, H - 80);
  ctx.restore();

  composedUrl.value = canvas.toDataURL("image/png");
}

async function download() {
  const canvas = canvasEl.value;
  if (!canvas) return;

  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `selfsnap-${fileDate}.png`;
    a.click();
    URL.revokeObjectURL(url);
  }, "image/png");
}

const canShare = computed(() => {
  const nav: any = navigator;
  return typeof nav !== "undefined" && typeof nav.share === "function";
});

async function share() {
  const canvas = canvasEl.value;
  if (!canvas) return;

  try {
    isSharing.value = true;

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("Failed to create image blob"))),
        "image/png"
      );
    });

    const fileName = `selfsnap-${fileDate}.png`;
    const file = new File([blob], fileName, { type: "image/png" });

    const nav: any = navigator;

    if (typeof nav.canShare === "function" && nav.canShare({ files: [file] })) {
      await nav.share({
        files: [file],
        title: "SelfSnap!",
        text: `SelfSnap ${fileDate}`,
      });
      return;
    }

    // If file sharing isn't supported, fallback to download
    await download();
  } catch (err: any) {
    if (err?.name === "AbortError") return;

    await download();
  } finally {
    isSharing.value = false;
  }
}

async function printPhoto() {
  if (!composedUrl.value) return;

  isPrinting.value = true;

  try {
    // Compose a 4x6 print canvas (2400 x 3600 px at 600dpi)
    // Two identical 2x6 strips side by side
    const STRIP_W = 1200;
    const STRIP_H = 3600;
    const PRINT_W = 2400;
    const PRINT_H = 3600;

    const printCanvas = document.createElement("canvas");
    printCanvas.width = PRINT_W;
    printCanvas.height = PRINT_H;
    const pCtx = printCanvas.getContext("2d");
    if (!pCtx) throw new Error("Print canvas context missing");

    // Load the print frame
    const frameImg = await loadImage("/aws-print-frame.png");

    // Get print strip photo slots
    const stripSlots = computePrintStripSlots(STRIP_W, STRIP_H);

    // Load first 3 shots
    const shotImgs: HTMLImageElement[] = [];
    for (let i = 0; i < 3; i++) {
      const src = shots.value[i];
      if (!src) throw new Error(`Missing shot ${i + 1}`);
      shotImgs.push(await loadImage(src));
    }

    // Draw two identical strips side by side
    for (let strip = 0; strip < 2; strip++) {
      const offsetX = strip * STRIP_W;

      // Draw frame background for this strip
      pCtx.drawImage(frameImg, offsetX, 0, STRIP_W, STRIP_H);

      // Draw 3 photos into slots
      for (let i = 0; i < 3; i++) {
        const slot = stripSlots[i]!;
        const img = shotImgs[i]!;

        pCtx.save();
        pCtx.beginPath();
        pCtx.rect(offsetX + slot.x, slot.y, slot.w, slot.h);
        pCtx.clip();

        drawCover(pCtx, img, offsetX + slot.x, slot.y, slot.w, slot.h, settings.filter);
        pCtx.restore();
      }

      // Draw date at the bottom of the strip
      const lastSlot = stripSlots[2]!;
      const dateY = lastSlot.y + lastSlot.h + 60;
      pCtx.save();
      pCtx.textAlign = "center";
      pCtx.fillStyle = "#333333";
      pCtx.font = "bold 40px system-ui, -apple-system, Segoe UI, Roboto, Arial";
      pCtx.fillText(fileDate, offsetX + STRIP_W / 2, dateY);
      pCtx.restore();
    }

    const printDataUrl = printCanvas.toDataURL("image/png");

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      errorMsg.value = "Pop-up blocked. Please allow pop-ups for printing.";
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>SelfSnap Print</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            html, body { width: 100%; height: 100%; }
            @page {
              size: 4in 6in;
              margin: 0;
            }
            body {
              display: flex;
              align-items: center;
              justify-content: center;
            }
            img {
              width: 100%;
              height: 100%;
              object-fit: fill;
            }
          </style>
        </head>
        <body>
          <img src="${printDataUrl}" />
        </body>
      </html>
    `);
    printWindow.document.close();

    await new Promise<void>((resolve) => {
      const img = printWindow.document.querySelector("img");
      if (img?.complete) {
        resolve();
      } else {
        img?.addEventListener("load", () => resolve());
        setTimeout(resolve, 2000);
      }
    });

    printWindow.focus();
    printWindow.print();

    setTimeout(() => {
      printWindow.close();
    }, 1000);
  } catch (err: any) {
    errorMsg.value = `Print failed: ${err?.message ?? String(err)}`;
  } finally {
    isPrinting.value = false;
  }
}

function tryAgain() {
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