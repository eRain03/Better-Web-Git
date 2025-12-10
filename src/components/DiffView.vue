<script setup lang="ts">
import { PropType } from 'vue';
import { DiffLine } from '../composables/useDiff'; // 确保你创建了上一条回复中的 useDiff.ts
import { X } from 'lucide-vue-next';

defineProps({
  filepath: String,
  lines: {
    type: Array as PropType<DiffLine[]>,
    default: () => []
  },
  loading: Boolean
});

defineEmits(['close']);
</script>

<template>
  <div class="flex flex-col h-full bg-bg text-sm">
    <div class="h-14 flex items-center justify-between px-6 border-b border-border bg-surface/30 sticky top-0 z-10 shrink-0">
      <div class="flex items-center gap-2 overflow-hidden">
        <span class="text-text-secondary font-mono">DIFF:</span>
        <span class="text-text-primary font-bold font-mono truncate">{{ filepath }}</span>
      </div>
      <button
        @click="$emit('close')"
        class="flex items-center gap-1.5 px-3 py-1.5 rounded hover:bg-border text-text-secondary hover:text-text-primary transition-colors text-xs font-medium"
      >
        <X size="14" />
        Close Diff
      </button>
    </div>

    <div v-if="loading" class="flex-1 flex items-center justify-center text-text-secondary">
      <div class="flex flex-col items-center gap-3">
        <div class="animate-spin w-5 h-5 border-2 border-text-muted border-t-text-primary rounded-full"></div>
        <span class="text-xs">Computing differences...</span>
      </div>
    </div>

    <div v-else-if="lines.length === 0" class="flex-1 flex items-center justify-center text-text-muted italic">
      No text changes detected (binary file or empty).
    </div>

    <div v-else class="flex-1 overflow-auto custom-scrollbar font-mono text-xs pb-10">
      <div
        v-for="(line, index) in lines"
        :key="index"
        class="flex min-w-full w-max hover:bg-surface/50 transition-colors"
        :class="{
          'bg-green-500/5': line.type === 'added',
          'bg-red-500/5': line.type === 'removed'
        }"
      >
        <div class="flex-none w-12 flex text-text-muted/40 select-none border-r border-border/50 bg-bg/50 px-1">
          <div class="w-1/2 text-right pr-1">{{ line.lineNumOld || '' }}</div>
          <div class="w-1/2 text-right pr-1">{{ line.lineNumNew || '' }}</div>
        </div>

        <div class="flex-none w-6 text-center select-none text-text-muted/60">
          {{ line.type === 'added' ? '+' : line.type === 'removed' ? '-' : '' }}
        </div>

        <div class="flex-1 px-2 whitespace-pre break-all selection:bg-text-secondary/20"
           :class="{
             'text-green-400': line.type === 'added',
             'text-red-400': line.type === 'removed',
             'text-text-secondary': line.type === 'neutral'
           }"
        >
          {{ line.value }}
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 自定义滚动条，让代码区域更精致 */
.custom-scrollbar::-webkit-scrollbar {
  width: 10px;
  height: 10px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #27272a;
  border-radius: 5px;
  border: 2px solid #09090b; /* Padding effect */
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #3f3f46;
}
.custom-scrollbar::-webkit-scrollbar-corner {
  background: transparent;
}
</style>