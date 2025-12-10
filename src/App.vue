<script setup lang="ts">
import { ref, computed } from 'vue';
import { useGit } from './composables/useGit';
import { useDiff } from './composables/useDiff';
import DiffView from './components/DiffView.vue';
import {
  FolderOpen, GitBranch, GitCommit, RefreshCw,
  Terminal, Activity, Layers, ChevronRight, Hash
} from 'lucide-vue-next';
import { formatDistanceToNow } from 'date-fns';

const {
  fs, repoHandle, openRepo, refresh, commits,
  unstagedFiles, stagedFiles, currentBranch,
  addToStage, commit, loading
} = useGit();

const { diffWorkdir, diffLines, loadingDiff } = useDiff();

const commitMessage = ref('');
const selectedFile = ref<string | null>(null);

// 交互逻辑
const handleSelectFile = async (filepath: string) => {
  if (!fs.value) return;
  selectedFile.value = filepath;
  await diffWorkdir(fs.value, filepath);
};

const closeDiff = () => {
  selectedFile.value = null;
  diffLines.value = [];
};

const handleCommit = async () => {
  if (!commitMessage.value) return;
  await commit(commitMessage.value);
  commitMessage.value = '';
};

const getBasename = (path: string) => path.split('/').pop() || path;
</script>

<template>
  <div class="flex h-screen w-full bg-bg text-text-main overflow-hidden">

    <div v-if="!repoHandle" class="fixed inset-0 z-50 flex flex-col items-center justify-center bg-bg">
      <div class="relative group cursor-pointer" @click="openRepo">
        <div class="absolute inset-0 bg-white/5 rounded-full blur-2xl group-hover:bg-white/10 transition-all duration-500"></div>
        <div class="relative bg-surface border border-border p-8 rounded-2xl shadow-2xl flex flex-col items-center gap-6 group-hover:border-text-dim transition-all active:scale-95">
          <Terminal size="48" class="text-text-main" />
          <div class="text-center">
            <h1 class="text-xl font-bold tracking-widest uppercase">Git Console</h1>
            <p class="text-text-dim text-xs mt-2">Local File System Access // Secure Environment</p>
          </div>
          <button class="bg-white text-black px-6 py-2 rounded font-bold text-sm hover:bg-gray-200 transition-colors">
            MOUNT REPOSITORY
          </button>
        </div>
      </div>
    </div>

    <aside v-else class="w-72 bg-surface/40 border-r border-border flex flex-col shrink-0 backdrop-blur-sm">

      <div class="h-14 border-b border-border flex items-center justify-between px-4">
        <div class="flex items-center gap-3 overflow-hidden">
          <div class="p-1.5 bg-element rounded">
            <GitBranch size="14" />
          </div>
          <div class="flex flex-col min-w-0">
            <span class="text-xs font-bold truncate tracking-tight">{{ repoHandle.name }}</span>
            <span class="text-[10px] text-text-dim truncate font-mono">{{ currentBranch }}</span>
          </div>
        </div>
        <button @click="refresh" class="p-2 hover:bg-element rounded text-text-dim hover:text-white transition-colors" :class="{'animate-spin': loading}">
          <RefreshCw size="14" />
        </button>
      </div>

      <div class="flex-1 overflow-y-auto p-2 space-y-6">

        <div>
          <div class="flex items-center justify-between px-2 mb-2">
            <h3 class="text-[10px] font-bold text-text-mute uppercase tracking-widest flex items-center gap-2">
              <Layers size="10" /> Staged
            </h3>
            <span v-if="stagedFiles.length" class="text-[10px] bg-white/10 px-1.5 py-0.5 rounded text-white">{{ stagedFiles.length }}</span>
          </div>

          <div v-if="stagedFiles.length === 0" class="px-2 py-4 border border-dashed border-border rounded text-center">
            <span class="text-[10px] text-text-mute">Stage empty</span>
          </div>

          <div class="space-y-0.5">
            <div
              v-for="file in stagedFiles"
              :key="file.filepath"
              @click="handleSelectFile(file.filepath)"
              class="group flex items-center gap-2 px-2 py-1.5 rounded hover:bg-element cursor-pointer transition-colors"
              :class="{'bg-element ring-1 ring-border': selectedFile === file.filepath}"
            >
              <div class="w-1.5 h-1.5 rounded-full bg-git-added shadow-[0_0_8px_rgba(74,222,128,0.4)]"></div>
              <span class="text-xs truncate flex-1 opacity-80 group-hover:opacity-100">{{ getBasename(file.filepath) }}</span>
            </div>
          </div>
        </div>

        <div>
          <div class="flex items-center justify-between px-2 mb-2">
            <h3 class="text-[10px] font-bold text-text-mute uppercase tracking-widest flex items-center gap-2">
              <Activity size="10" /> Changes
            </h3>
            <span v-if="unstagedFiles.length" class="text-[10px] bg-white/10 px-1.5 py-0.5 rounded text-white">{{ unstagedFiles.length }}</span>
          </div>

          <div v-if="unstagedFiles.length === 0" class="px-2 py-4 border border-dashed border-border rounded text-center">
             <span class="text-[10px] text-text-mute">Working tree clean</span>
          </div>

          <div class="space-y-0.5">
            <div
              v-for="file in unstagedFiles"
              :key="file.filepath"
              class="group flex items-center gap-2 px-2 py-1.5 rounded hover:bg-element cursor-pointer transition-colors"
              :class="{'bg-element ring-1 ring-border': selectedFile === file.filepath}"
            >
              <div class="flex-1 flex items-center gap-2 min-w-0" @click="handleSelectFile(file.filepath)">
                <div class="w-1.5 h-1.5 rounded-full bg-git-modified shadow-[0_0_8px_rgba(251,191,36,0.4)]"></div>
                <span class="text-xs truncate opacity-80 group-hover:opacity-100" :class="{'text-git-modified': selectedFile === file.filepath}">{{ getBasename(file.filepath) }}</span>
              </div>
              <button
                @click.stop="addToStage(file.filepath)"
                class="opacity-0 group-hover:opacity-100 text-[10px] px-1.5 py-0.5 bg-text-main text-bg rounded hover:bg-white transition-all font-bold"
              >
                ADD
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="p-3 border-t border-border bg-bg/50">
        <div class="relative">
          <div class="absolute top-3 left-3 text-text-mute pointer-events-none">
            <ChevronRight size="14" />
          </div>
          <textarea
            v-model="commitMessage"
            class="w-full bg-element border border-transparent focus:border-text-dim rounded-md pl-8 pr-3 py-2 text-xs text-text-main placeholder-text-mute/50 focus:outline-none resize-none h-24 transition-all font-mono"
            placeholder="Commit message..."
            @keydown.ctrl.enter="handleCommit"
          ></textarea>
        </div>
        <button
          @click="handleCommit"
          :disabled="!stagedFiles.length || !commitMessage"
          class="w-full mt-2 bg-text-main hover:bg-white text-bg py-2 rounded text-xs font-bold uppercase tracking-wider disabled:opacity-20 disabled:cursor-not-allowed transition-all"
        >
          Commit
        </button>
      </div>
    </aside>

    <main class="flex-1 flex flex-col bg-bg relative">

      <div v-if="selectedFile" class="absolute inset-0 z-10 bg-bg flex flex-col">
        <DiffView
          :filepath="selectedFile"
          :lines="diffLines"
          :loading="loadingDiff"
          @close="closeDiff"
        />
      </div>

      <div class="flex flex-col h-full">
        <div class="h-14 border-b border-border flex items-center justify-between px-6">
          <h2 class="text-sm font-bold tracking-widest text-text-mute flex items-center gap-2">
            <Hash size="14" /> LOG
          </h2>
        </div>

        <div class="flex-1 overflow-y-auto p-6">
          <div class="max-w-3xl mx-auto space-y-1">
             <div v-for="(commit, idx) in commits" :key="commit.oid"
               class="group relative pl-6 py-3 border-l border-border hover:border-text-dim transition-colors"
             >
                <div
                  class="absolute -left-[5px] top-4 w-2.5 h-2.5 rounded-full border-4 border-bg transition-all group-hover:scale-125"
                  :class="idx === 0 ? 'bg-white shadow-[0_0_10px_white]' : 'bg-border group-hover:bg-text-dim'"
                ></div>

                <div class="flex justify-between items-baseline mb-1">
                  <span class="text-sm font-medium text-text-main group-hover:text-white transition-colors">{{ commit.message }}</span>
                  <span class="text-[10px] font-mono text-text-mute">{{ commit.oid.substring(0,7) }}</span>
                </div>
                <div class="flex items-center gap-3 text-[10px] text-text-mute">
                  <span class="uppercase tracking-wider">{{ commit.author }}</span>
                  <span>{{ formatDistanceToNow(new Date(commit.timestamp * 1000)) }} ago</span>
                </div>
             </div>
          </div>
        </div>
      </div>

    </main>
  </div>
</template>