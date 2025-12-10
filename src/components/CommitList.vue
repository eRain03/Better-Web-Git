<script setup lang="ts">
import { PropType } from 'vue';
import { History, GitCommit } from 'lucide-vue-next';
import { formatDistanceToNow } from 'date-fns';

// 接收数据
defineProps({
  commits: {
    type: Array as PropType<any[]>,
    default: () => []
  }
});
</script>

<template>
  <div class="flex flex-col h-full bg-page">
    <div class="h-16 border-b border-border flex items-center px-8 bg-white/80 backdrop-blur-sm sticky top-0 z-10 shrink-0">
      <h2 class="text-base font-bold text-txt-primary flex items-center gap-2">
        <History size="18" class="text-brand"/>
        <span>History</span>
        <span class="text-xs font-normal text-txt-muted bg-gray-100 px-2 py-0.5 rounded-full ml-2">{{ commits.length }} commits</span>
      </h2>
    </div>

    <div class="flex-1 overflow-y-auto p-8 custom-scrollbar">
      <div class="max-w-4xl mx-auto space-y-4 pb-10">

        <div v-if="commits.length === 0" class="flex flex-col items-center justify-center py-20 text-txt-muted">
           <GitCommit size="48" class="opacity-20 mb-4"/>
           <p>No commits found yet.</p>
        </div>

        <div v-for="commit in commits" :key="commit.oid"
          class="group bg-white border border-border rounded-xl p-5 shadow-soft hover:shadow-card hover:border-brand-light transition-all duration-200 cursor-default relative overflow-hidden"
        >
          <div class="absolute left-0 top-0 bottom-0 w-1 bg-brand opacity-0 group-hover:opacity-100 transition-opacity"></div>

          <div class="flex justify-between items-start gap-6">
            <div class="flex-1 min-w-0">
              <h3 class="text-base font-semibold text-txt-primary leading-snug group-hover:text-brand transition-colors break-words">
                {{ commit.message }}
              </h3>

              <div class="flex items-center gap-3 mt-3 text-xs text-txt-secondary">
                <div class="flex items-center gap-2">
                  <div class="w-6 h-6 rounded-full bg-gradient-to-br from-brand-light to-blue-50 flex items-center justify-center text-[10px] text-brand font-bold border border-white shadow-sm">
                    {{ commit.author ? commit.author.charAt(0).toUpperCase() : '?' }}
                  </div>
                  <span class="font-medium text-txt-primary">{{ commit.author }}</span>
                </div>

                <span class="text-gray-300">|</span>

                <span :title="commit.timestamp.toLocaleString()">
                  {{ formatDistanceToNow(commit.timestamp) }} ago
                </span>
              </div>
            </div>

            <div class="flex items-center gap-2 shrink-0">
              <span class="font-mono text-[10px] text-txt-secondary bg-gray-50 px-2 py-1 rounded border border-border group-hover:border-brand-light group-hover:text-brand transition-colors select-all">
                {{ commit.shortOid }}
              </span>
            </div>
          </div>
        </div>

      </div>
    </div>
  </div>
</template>