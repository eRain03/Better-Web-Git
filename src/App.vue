<script setup lang="ts">
import { ref, computed } from 'vue';
import { useGit } from './composables/useGit';
import { useDiff } from './composables/useDiff'; // 别忘了创建 useDiff.ts
import DiffView from './components/DiffView.vue';
import {
  FolderOpen, GitBranch, GitCommit, RefreshCw,
  File, Plus, Play, ChevronRight, XCircle
} from 'lucide-vue-next';
import { formatDistanceToNow } from 'date-fns';

// 1. 初始化 Git 核心
const {
  fs, repoHandle, openRepo, refresh, commits,
  unstagedFiles, stagedFiles, currentBranch,
  addToStage, commit, loading
} = useGit();

// 2. 初始化 Diff 引擎
const { diffWorkdir, diffLines, loadingDiff } = useDiff();

// 3. UI 状态管理
const commitMessage = ref('');
const selectedFile = ref<string | null>(null);

// 4. 交互逻辑
const handleSelectFile = async (filepath: string) => {
  if (!fs.value) return;
  selectedFile.value = filepath;
  // 触发 Diff 计算
  await diffWorkdir(fs.value, filepath);
};

const closeDiff = () => {
  selectedFile.value = null;
  // 清空 diff 数据以释放内存
  diffLines.value = [];
};

const handleCommit = async () => {
  if (!commitMessage.value) return;
  await commit(commitMessage.value);
  commitMessage.value = '';
};

// 辅助：获取文件名
const getBasename = (path: string) => path.split('/').pop() || path;
</script>

<template>
  <div class="flex h-screen w-full bg-bg text-text-primary font-mono overflow-hidden selection:bg-accent/20">

    <aside class="w-80 border-r border-border flex flex-col bg-surface/30 shrink-0 z-20">
      <div class="p-4 border-b border-border">
        <div class="flex items-center justify-between mb-4">
          <h1 class="text-sm font-bold tracking-tight flex items-center gap-2 text-text-primary">
            <div class="w-2 h-2 bg-text-primary rounded-full shadow-[0_0_8px_rgba(255,255,255,0.5)]"></div>
            GIT CONTROLLER
          </h1>
          <button @click="refresh" class="p-1.5 hover:bg-border rounded transition-colors text-text-muted hover:text-text-primary" :class="{'animate-spin': loading}">
            <RefreshCw size="14" />
          </button>
        </div>

        <button
          v-if="!repoHandle"
          @click="openRepo"
          class="w-full flex items-center justify-center gap-2 bg-text-primary text-bg py-2 rounded text-sm font-semibold hover:bg-white transition-all shadow-sm"
        >
          <FolderOpen size="16" />
          MOUNT LOCAL REPO
        </button>

        <div v-else class="flex items-center gap-2 text-xs text-text-secondary bg-bg border border-border/50 p-2 rounded shadow-inner">
          <GitBranch size="12" />
          <span class="truncate font-medium">{{ repoHandle.name }}</span>
          <span class="text-text-primary bg-border/50 px-1.5 rounded ml-auto">{{ currentBranch }}</span>
        </div>
      </div>

      <div class="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar" v-if="repoHandle">

        <div>
          <h2 class="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-2 flex justify-between items-center">
            Staged Changes <span class="bg-border/50 px-1.5 rounded text-text-primary">{{ stagedFiles.length }}</span>
          </h2>
          <div class="space-y-0.5">
             <div v-if="stagedFiles.length === 0" class="text-xs text-text-muted/40 italic py-2 pl-2">No files staged</div>

             <div
               v-for="file in stagedFiles"
               :key="file.filepath"
               @click="handleSelectFile(file.filepath)"
               class="group flex items-center gap-2 text-xs p-1.5 hover:bg-border/50 rounded cursor-pointer transition-colors"
               :class="{'bg-accent/10 text-accent': selectedFile === file.filepath}"
             >
               <span class="w-1.5 h-1.5 rounded-full bg-success shadow-[0_0_5px_rgba(16,185,129,0.4)]"></span>
               <span class="truncate flex-1">{{ getBasename(file.filepath) }}</span>
               <span class="text-[10px] text-text-muted opacity-0 group-hover:opacity-100 uppercase">{{ file.status }}</span>
             </div>
          </div>
        </div>

        <div>
          <h2 class="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-2 flex justify-between items-center">
            Changes <span class="bg-border/50 px-1.5 rounded text-text-primary">{{ unstagedFiles.length }}</span>
          </h2>
          <div class="space-y-0.5">
             <div v-if="unstagedFiles.length === 0" class="text-xs text-text-muted/40 italic py-2 pl-2">Clean working tree</div>

             <div
               v-for="file in unstagedFiles"
               :key="file.filepath"
               class="group flex items-center gap-2 text-xs p-1.5 hover:bg-border/50 rounded cursor-pointer transition-colors"
               :class="{'bg-accent/10 text-accent': selectedFile === file.filepath}"
             >
               <div class="flex items-center gap-2 flex-1 min-w-0" @click="handleSelectFile(file.filepath)">
                 <span class="w-1.5 h-1.5 rounded-full bg-yellow-500 shadow-[0_0_5px_rgba(234,179,8,0.4)]"></span>
                 <span class="truncate" :title="file.filepath">{{ getBasename(file.filepath) }}</span>
               </div>

               <button
                 @click.stop="addToStage(file.filepath)"
                 class="opacity-0 group-hover:opacity-100 p-1 hover:bg-text-primary hover:text-bg rounded transition-all"
                 title="Stage file"
               >
                 <Plus size="12" />
               </button>
             </div>
          </div>
        </div>

        <div class="pt-4 border-t border-border mt-auto">
          <textarea
            v-model="commitMessage"
            placeholder="Commit message..."
            class="w-full bg-bg border border-border rounded p-2 text-xs focus:outline-none focus:border-text-secondary focus:ring-1 focus:ring-text-secondary/50 resize-none h-20 mb-2 transition-all placeholder:text-text-muted/50"
            @keydown.ctrl.enter="handleCommit"
          ></textarea>
          <button
            @click="handleCommit"
            :disabled="stagedFiles.length === 0 || !commitMessage"
            class="w-full flex items-center justify-center gap-2 bg-text-primary text-bg py-2 rounded text-xs font-bold uppercase tracking-wide hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
          >
            <GitCommit size="14" />
            Commit Changes
          </button>
        </div>
      </div>
    </aside>

    <main class="flex-1 flex flex-col min-w-0 bg-bg relative">

      <div v-if="!repoHandle" class="flex-1 flex flex-col items-center justify-center text-text-muted/40 gap-4">
         <div class="w-20 h-20 border-2 border-border border-dashed rounded-xl flex items-center justify-center animate-pulse">
           <FolderOpen size="32" />
         </div>
         <p class="text-sm">Select a local repository to initialize the interface.</p>
      </div>

      <template v-else-if="selectedFile">
        <DiffView
          :filepath="selectedFile"
          :lines="diffLines"
          :loading="loadingDiff"
          @close="closeDiff"
        />
      </template>

      <template v-else>
        <div class="h-14 border-b border-border flex items-center px-6 justify-between shrink-0 bg-bg/80 backdrop-blur">
          <h2 class="font-bold text-text-primary text-sm flex items-center gap-2">
            <GitCommit size="16" class="text-text-muted" />
            COMMIT HISTORY
          </h2>
          <span class="text-xs text-text-muted font-mono">{{ commits.length }} COMMITS</span>
        </div>

        <div class="flex-1 overflow-y-auto p-6 custom-scrollbar">
          <div class="relative border-l border-border/50 ml-3 space-y-8 pb-10">
            <div v-for="(commit, idx) in commits" :key="commit.oid" class="relative pl-8 group">
              <div
                class="absolute -left-[5px] top-2 w-2.5 h-2.5 rounded-full border-2 border-bg transition-colors"
                :class="idx === 0 ? 'bg-accent shadow-[0_0_8px_white]' : 'bg-border group-hover:bg-text-secondary'"
              ></div>

              <div class="flex flex-col gap-1.5">
                <div class="flex items-baseline justify-between">
                  <span class="text-text-primary font-medium text-sm leading-none group-hover:text-accent transition-colors cursor-default">
                    {{ commit.message }}
                  </span>
                  <span class="text-[10px] text-text-muted font-mono bg-surface px-1.5 py-0.5 rounded border border-border/50 opacity-70">
                    {{ commit.oid.substring(0, 7) }}
                  </span>
                </div>

                <div class="flex items-center gap-2 text-xs text-text-secondary">
                  <span class="font-medium text-text-muted">{{ commit.author }}</span>
                  <span class="text-text-muted/30">•</span>
                  <span class="text-text-muted" :title="new Date(commit.timestamp * 1000).toLocaleString()">
                    {{ formatDistanceToNow(new Date(commit.timestamp * 1000)) }} ago
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>

    </main>
  </div>
</template>

<style scoped>
/* Scoped scrollbar for app-level containers */
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #27272a;
  border-radius: 3px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #3f3f46;
}
</style>