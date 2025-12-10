<script setup lang="ts">
// ... imports
import { ref } from 'vue';
import { useGit } from './composables/useGit';

const {
  repoHandle, connectRepo,
  kernelUrl, kernelSecret, // 绑定这两个
  loading, error
} = useGit();

const localPath = ref('D:/Projects/MyCode'); // 你的本地绝对路径
</script>

<template>
  <div v-if="!repoHandle" class="fixed inset-0 flex items-center justify-center bg-page z-50">
    <div class="bg-white p-8 rounded-2xl shadow-xl w-96 border border-border">
      <h1 class="text-2xl font-bold mb-6 text-txt-primary flex items-center gap-2">
        <div class="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
        Connect to Kernel
      </h1>

      <div class="space-y-4 mb-6">
        <div>
          <label class="text-xs font-bold text-txt-muted uppercase">Kernel Address</label>
          <input v-model="kernelUrl" class="w-full border border-border rounded p-2 text-sm font-mono mt-1" />
        </div>
        <div>
          <label class="text-xs font-bold text-txt-muted uppercase">Secret</label>
          <input v-model="kernelSecret" type="password" class="w-full border border-border rounded p-2 text-sm font-mono mt-1" />
        </div>
      </div>

      <hr class="border-border my-6"/>

      <div class="mb-6">
        <label class="text-xs font-bold text-txt-muted uppercase">Local Repository Path</label>
        <input
          v-model="localPath"
          placeholder="e.g. C:\Code\Project"
          class="w-full border border-border rounded p-2 text-sm mt-1 focus:ring-2 focus:ring-brand/20 outline-none"
        />
        <p class="text-[10px] text-txt-muted mt-1">Paste the absolute path from your file explorer.</p>
      </div>

      <button
        @click="connectRepo(localPath)"
        :disabled="loading"
        class="w-full bg-brand text-white py-3 rounded-xl font-bold hover:bg-brand-hover transition-all disabled:opacity-50"
      >
        {{ loading ? 'Connecting...' : 'Connect' }}
      </button>

      <p v-if="error" class="text-red-500 text-xs mt-4 text-center">{{ error }}</p>
    </div>
  </div>

  <div v-else>
     </div>
</template>