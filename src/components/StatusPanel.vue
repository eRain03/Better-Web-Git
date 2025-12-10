<script setup lang="ts">
import { ref, PropType } from 'vue';
import {
  GitBranch, RefreshCw, CheckCircle2, Layers, Play
} from 'lucide-vue-next';

// 定义 Props：接收父组件的数据
defineProps({
  repoName: String,
  currentBranch: String,
  stagedFiles: {
    type: Array as PropType<any[]>,
    default: () => []
  },
  unstagedFiles: {
    type: Array as PropType<any[]>,
    default: () => []
  },
  selectedFile: String,
  loading: Boolean
});

// 定义 Emits：向父组件发送指令
const emit = defineEmits(['refresh', 'select', 'stage', 'commit']);

const commitMessage = ref('');

// 本地处理提交逻辑，然后发射事件
const handleCommit = () => {
  if (!commitMessage.value) return;
  emit('commit', commitMessage.value);
  commitMessage.value = ''; // 清空输入框
};

const getBasename = (path: string) => path.split('/').pop() || path;
</script>

<template>
  <aside class="w-80 bg-surface border-r border-border flex flex-col z-20 shadow-soft h-full">

    <header class="h-16 border-b border-border flex items-center justify-between px-5 bg-white shrink-0">
      <div class="flex items-center gap-3 overflow-hidden">
         <div class="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-txt-primary border border-border">
           <GitBranch size="16" />
         </div>
         <div class="flex flex-col min-w-0">
           <span class="text-sm font-bold truncate leading-tight text-txt-primary">{{ repoName }}</span>
           <span class="text-[10px] text-txt-secondary font-mono bg-gray-100 px-1.5 py-0.5 rounded w-fit mt-0.5">{{ currentBranch }}</span>
         </div>
      </div>
      <button
        @click="$emit('refresh')"
        class="p-2 text-txt-secondary hover:text-brand hover:bg-brand-light/50 rounded-lg transition-all active:scale-95"
        :class="{'animate-spin': loading}"
        title="Refresh Status"
      >
        <RefreshCw size="18" />
      </button>
    </header>

    <div class="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">

      <div>
        <h3 class="text-xs font-bold text-txt-muted uppercase tracking-wider mb-3 flex items-center gap-2 px-2">
          <CheckCircle2 size="14" class="text-green-600"/> Staged
          <span v-if="stagedFiles.length" class="ml-auto bg-green-100 text-green-700 text-[10px] px-1.5 rounded-full">{{ stagedFiles.length }}</span>
        </h3>

        <div v-if="stagedFiles.length === 0" class="text-xs text-txt-secondary/40 italic px-3 py-2 border border-dashed border-border rounded-lg bg-page/50">
          Stage is empty
        </div>

        <div class="space-y-1">
          <div v-for="file in stagedFiles" :key="file.filepath"
            @click="$emit('select', file.filepath)"
            class="flex items-center justify-between group px-3 py-2 rounded-lg cursor-pointer transition-all border border-transparent hover:border-border hover:bg-white hover:shadow-sm"
            :class="{'bg-brand-light/40 border-brand-light text-brand': selectedFile === file.filepath}"
          >
            <div class="flex items-center gap-3 overflow-hidden">
              <span class="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_4px_rgba(34,197,94,0.4)] shrink-0"></span>
              <span class="text-sm font-medium truncate">{{ getBasename(file.filepath) }}</span>
            </div>
          </div>
        </div>
      </div>

      <div>
        <h3 class="text-xs font-bold text-txt-muted uppercase tracking-wider mb-3 flex items-center gap-2 px-2">
          <Layers size="14" class="text-amber-500"/> Changes
          <span v-if="unstagedFiles.length" class="ml-auto bg-amber-100 text-amber-700 text-[10px] px-1.5 rounded-full">{{ unstagedFiles.length }}</span>
        </h3>

        <div v-if="unstagedFiles.length === 0" class="text-xs text-txt-secondary/40 italic px-3 py-2 border border-dashed border-border rounded-lg bg-page/50">
          Working tree clean
        </div>

        <div class="space-y-1">
          <div v-for="file in unstagedFiles" :key="file.filepath"
            class="flex items-center justify-between group px-3 py-2 rounded-lg cursor-pointer transition-all border border-transparent hover:border-border hover:bg-white hover:shadow-sm"
            :class="{'bg-brand-light/40 border-brand-light text-brand': selectedFile === file.filepath}"
          >
            <div class="flex items-center gap-3 overflow-hidden flex-1 min-w-0" @click="$emit('select', file.filepath)">
              <span class="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_4px_rgba(251,191,36,0.4)] shrink-0"></span>
              <span class="text-sm font-medium truncate">{{ getBasename(file.filepath) }}</span>
            </div>

            <button
              @click.stop="$emit('stage', file.filepath)"
              class="opacity-0 group-hover:opacity-100 p-1.5 text-txt-secondary hover:text-brand hover:bg-brand-light rounded-md transition-all"
              title="Stage this file"
            >
              <Play size="14" fill="currentColor" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <div class="p-4 border-t border-border bg-gray-50/80 backdrop-blur-sm shrink-0">
      <div class="relative group">
        <textarea
          v-model="commitMessage"
          placeholder="Summary of changes..."
          class="w-full bg-white border border-border rounded-xl p-3 text-sm text-txt-primary focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand resize-none h-20 transition-all placeholder:text-txt-secondary/50 shadow-sm group-hover:border-gray-300"
          @keydown.ctrl.enter="handleCommit"
        ></textarea>
        <div class="absolute bottom-2 right-2 text-[9px] text-txt-muted pointer-events-none font-mono bg-gray-100 px-1 rounded">Ctrl+Enter</div>
      </div>
      <button
        @click="handleCommit"
        :disabled="stagedFiles.length === 0 || !commitMessage"
        class="w-full mt-3 bg-brand text-white py-2.5 rounded-xl text-sm font-semibold shadow-soft hover:bg-brand-hover hover:shadow-card active:translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none transition-all flex items-center justify-center gap-2"
      >
        Commit Changes
      </button>
    </div>
  </aside>
</template>

<style scoped>
/* 局部细化滚动条，防止影响全局 */
.custom-scrollbar::-webkit-scrollbar {
  width: 5px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #e2e8f0;
  border-radius: 10px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #cbd5e1;
}
</style>