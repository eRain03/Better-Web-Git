<script setup lang="ts">
import { PropType } from 'vue';
import { FileCode, X } from 'lucide-vue-next';
// ▼▼▼▼▼▼ 关键修正：使用 ../ 返回上一级目录 ▼▼▼▼▼▼
import { DiffLine } from '../composables/useDiff';

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
  <div class="flex flex-col h-full bg-white font-sans">

    <div v-if="loading" class="flex-1 flex items-center justify-center text-txt-secondary">
      <div class="flex flex-col items-center gap-3">
        <div class="animate-spin w-6 h-6 border-2 border-gray-200 border-t-brand rounded-full"></div>
        <span class="text-xs font-medium">Computing differences...</span>
      </div>
    </div>

    <div v-else-if="lines.length === 0" class="flex-1 flex items-center justify-center text-txt-muted italic">
      <div class="text-center">
        <p>No text changes detected.</p>
        <p class="text-xs opacity-50 mt-1">(File might be binary, empty, or renamed)</p>
      </div>
    </div>

    <div v-else class="flex-1 overflow-auto custom-scrollbar font-mono text-xs bg-white pb-10">
      <div
        v-for="(line, index) in lines"
        :key="index"
        class="flex min-w-full w-max border-l-4"
        :class="{
          'bg-green-50 border-green-500': line.type === 'added',
          'bg-red-50 border-red-500': line.type === 'removed',
          'border-transparent hover:bg-gray-50': line.type === 'neutral'
        }"
      >
        <div class="flex-none w-12 flex text-gray-400 select-none border-r border-gray-100 bg-gray-50/50 px-1 py-0.5">
          <div class="w-1/2 text-right pr-1">{{ line.lineNumOld || '' }}</div>
          <div class="w-1/2 text-right pr-1">{{ line.lineNumNew || '' }}</div>
        </div>

        <div class="flex-none w-6 text-center select-none py-0.5"
          :class="{
            'text-green-600': line.type === 'added',
            'text-red-600': line.type === 'removed',
            'text-gray-300': line.type === 'neutral'
          }"
        >
          {{ line.type === 'added' ? '+' : line.type === 'removed' ? '-' : '' }}
        </div>

        <div class="flex-1 px-2 whitespace-pre break-all py-0.5"
           :class="{
             'text-green-900': line.type === 'added',
             'text-red-900': line.type === 'removed',
             'text-gray-700': line.type === 'neutral'
           }"
        >
          {{ line.value }}
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 10px;
  height: 10px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #e2e8f0;
  border-radius: 5px;
  border: 2px solid #ffffff;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #cbd5e1;
}
.custom-scrollbar::-webkit-scrollbar-corner {
  background: transparent;
}
</style>