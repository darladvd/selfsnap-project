<template>
  <div class="min-h-screen bg-sky-200 flex items-center justify-center p-6">
    <div class="rounded-3xl bg-white p-6 shadow w-full max-w-xl">
      <h2 class="text-2xl font-bold">Result</h2>
      <p class="mt-2 text-gray-600">Next: show composed strip + Try Again + Download.</p>
      <button class="mt-6 rounded-full bg-gray-900 px-6 py-3 font-bold text-white" @click="restart">
        Back to Settings
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from "vue-router";
const router = useRouter();
const restart = () => router.push("/settings");
</script>
