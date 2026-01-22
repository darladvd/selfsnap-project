<template>
  <div class="min-h-screen flex items-center justify-center bg-sky-200">
    <div class="text-center">
      <h1 class="text-6xl font-black tracking-tight">SelfSnap!</h1>
      <p class="mt-2 text-lg">Your snap, your story.</p>

      <button
        class="mt-8 inline-flex items-center gap-2 rounded-full bg-white px-8 py-3 font-semibold shadow"
        @click="go"
      >
        <span>📷</span> START
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from "vue-router";
const router = useRouter();
const go = () => router.push("/settings");
</script>
