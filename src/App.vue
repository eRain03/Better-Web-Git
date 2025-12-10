<script setup lang="ts">
import { ref, computed } from 'vue';
import { useGit } from './composables/useGit';
import { useDiff } from './composables/useDiff';
import { FolderInput, FileCode, X } from 'lucide-vue-next';

// 引入我们刚才写的组件
import StatusPanel from './components/StatusPanel.vue';
import CommitList from './components/CommitList.vue';
import DiffView from './components/DiffView.vue';

const {
  fs, repoHandle, openRepo, refresh, commits,
  statusList, currentBranch, addToStage, commit, loading, error
} = useGit();

const { diffWorkdir, diffLines, loadingDiff } = useDiff();

const selectedFile = ref<string | null>(null);

// 计算属性：为子组件准备数据
const stagedFiles = computed(() => statusList.value.filter(f => f.isStaged));
const unstagedFiles = computed(() => statusList.value.filter(f => !f.isStaged));

// 事件处理
const handleSelectFile = async (filepath: string) => {
  if (!fs.value) return;
  selectedFile.value = filepath;
  await diffWorkdir(fs.value, filepath);
};

const handleCommit = async (msg: string) => {
  await commit(msg);
};
</script>

<template>
  <div class="flex h-screen w-full bg-page text-txt-primary font-sans antialiased overflow-hidden selection:bg-brand-light selection:text-brand">

    <div v-if="error" class="fixed top-4 right-4 z-50 bg-white border border-red-200 text-red-600 px-4 py-3 rounded-xl shadow-card text-sm flex items-center gap-3 animate-bounce-in">
      <div class="w-2 h-2 rounded-full bg-red-500"></div>
      <span class="font-bold">Error:</span> {{ error }}
      <button @click="error = null" class="ml-2 hover:bg-red-50 p-1 rounded-full"><X size="14"/></button>
    </div>

    <div v-if="!repoHandle" class="fixed inset-0 z-40 flex items-center justify-center bg-page">
      <div class="bg-white border border-border p-12 rounded-3xl shadow-xl flex flex-col items-center max-w-md text-center">
        <div class="w-20 h-20 bg-brand-light/50 rounded-3xl flex items-center justify-center mb-8 text-brand shadow-inner">
          <FolderInput size="40" stroke-width="1.5" />
        </div>
        <h1 class="text-3xl font-bold text-txt-primary mb-3 tracking-tight">Git Browser</h1>
        <p class="text-txt-secondary mb-10 leading-relaxed">
          Open a local repository to manage files, view history, and commit changes securely within your browser.
        </p>
        <button
          @click="openRepo"
          class="bg-brand text-white px-10 py-3.5 rounded-2xl font-semibold shadow-card hover:bg-brand-hover hover:shadow-lg hover:-translate-y-0.5 transition-all active:translate-y-0 active:scale-95 flex items-center gap-3"
        >
          Select Folder
        </button>
      </div>
    </div>

    <div v-else class="flex w-full h-full">

      <StatusPanel
        :repo-name="repoHandle.name"
        :current-branch="currentBranch"
        :staged-files="stagedFiles"
        :unstaged-files="unstagedFiles"
        :selected-file="selectedFile"
        :loading="loading"
        @refresh="refresh"
        @select="handleSelectFile"
        @stage="addToStage"
        @commit="handleCommit"
      />

      <main class="flex-1 bg-page flex flex-col relative min-w-0">

        <div v-if="selectedFile" class="absolute inset-0 z-10 bg-white flex flex-col animate-fade-in">
           <div class="h-12 border-b border-border flex items-center justify-between px-6 bg-white shrink-0 shadow-sm z-20">
             <div class="flex items-center gap-2 text-sm text-txt-secondary">
               <FileCode size="16" class="text-brand"/>
               <span class="text-txt-muted">Diff:</span>
               <span class="font-mono text-txt-primary font-medium">{{ selectedFile }}</span>
             </div>
             <button @click="selectedFile = null" class="text-xs font-semibold text-txt-secondary hover:text-txt-primary px-3 py-1.5 rounded-lg hover:bg-gray-100 border border-transparent hover:border-border transition-all flex items-center gap-1">
               <X size="14"/> Close Diff
             </button>
           </div>

           <div class="flex-1 overflow-hidden relative">
             <DiffView
               :filepath="selectedFile"
               :lines="diffLines"
               :loading="loadingDiff"
               @close="selectedFile = null"
             />
           </div>
        </div>

        <CommitList :commits="commits" />

      </main>
    </div>
  </div>
</template>

<style>
/* 简单的进入动画 */
.animate-fade-in {
  animation: fadeIn 0.2s ease-out forwards;
}
.animate-bounce-in {
  animation: bounceIn 0.3s cubic-bezier(0.18, 0.89, 0.32, 1.28) forwards;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes bounceIn {
  0% { opacity: 0; transform: scale(0.9) translateY(-10px); }
  100% { opacity: 1; transform: scale(1) translateY(0); }
}
</style>