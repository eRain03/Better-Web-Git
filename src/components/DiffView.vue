<script setup lang="ts">
import { ref, computed } from 'vue';
import { useGit } from './composables/useGit';
import { useDiff } from './composables/useDiff'; // 使用之前的 useDiff
import DiffView from './components/DiffView.vue'; // 使用之前的 DiffView (需微调样式适配白色主题)
import {
  FolderInput, GitBranch, RefreshCw, Layers,
  FileCode, Play, CheckCircle2, History, ArrowRight
} from 'lucide-vue-next';
import { formatDistanceToNow } from 'date-fns';

const {
  fs, repoHandle, openRepo, refresh, commits,
  statusList, currentBranch, addToStage, commit, loading, error
} = useGit();

const { diffWorkdir, diffLines, loadingDiff } = useDiff();

const selectedFile = ref<string | null>(null);
const commitMessage = ref('');

// Computed Lists
const stagedFiles = computed(() => statusList.value.filter(f => f.isStaged));
const unstagedFiles = computed(() => statusList.value.filter(f => !f.isStaged));

const handleSelectFile = async (filepath: string) => {
  if (!fs.value) return;
  selectedFile.value = filepath;
  await diffWorkdir(fs.value, filepath);
};

const handleCommit = async () => {
  if (!commitMessage.value) return;
  await commit(commitMessage.value);
  commitMessage.value = '';
};

const getBasename = (path: string) => path.split('/').pop() || path;
</script>

<template>
  <div class="flex h-screen w-full bg-page text-txt-primary font-sans antialiased selection:bg-brand-light selection:text-brand">

    <div v-if="error" class="fixed top-4 right-4 z-50 bg-white border border-red-200 text-red-600 px-4 py-3 rounded-lg shadow-card text-sm flex items-center gap-2">
      <span class="font-bold">Error:</span> {{ error }}
      <button @click="error = null" class="ml-2 hover:bg-red-50 p-1 rounded">✕</button>
    </div>

    <div v-if="!repoHandle" class="fixed inset-0 z-40 flex items-center justify-center bg-white/50 backdrop-blur-sm">
      <div class="bg-white border border-border p-12 rounded-2xl shadow-xl flex flex-col items-center max-w-md text-center">
        <div class="w-16 h-16 bg-brand-light rounded-2xl flex items-center justify-center mb-6 text-brand">
          <FolderInput size="32" />
        </div>
        <h1 class="text-2xl font-bold text-txt-primary mb-2">Open Repository</h1>
        <p class="text-txt-secondary mb-8">Access your local Git repository securely directly from your browser. No upload required.</p>
        <button
          @click="openRepo"
          class="bg-brand text-white px-8 py-3 rounded-xl font-medium shadow-soft hover:bg-brand-hover hover:shadow-card transition-all active:scale-95 flex items-center gap-2"
        >
          Select Folder
        </button>
      </div>
    </div>

    <div v-else class="flex w-full h-full overflow-hidden">

      <aside class="w-80 bg-surface border-r border-border flex flex-col z-20 shadow-soft">

        <header class="h-16 border-b border-border flex items-center justify-between px-5 bg-white">
          <div class="flex items-center gap-3 overflow-hidden">
             <div class="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-txt-primary">
               <GitBranch size="16" />
             </div>
             <div class="flex flex-col min-w-0">
               <span class="text-sm font-bold truncate leading-tight">{{ repoHandle.name }}</span>
               <span class="text-xs text-txt-secondary font-mono bg-gray-50 px-1.5 rounded w-fit">{{ currentBranch }}</span>
             </div>
          </div>
          <button @click="refresh" class="p-2 text-txt-secondary hover:text-brand hover:bg-brand-light rounded-lg transition-colors" :class="{'animate-spin': loading}">
            <RefreshCw size="18" />
          </button>
        </header>

        <div class="flex-1 overflow-y-auto p-4 space-y-6">

          <div>
            <h3 class="text-xs font-semibold text-txt-muted uppercase tracking-wider mb-3 flex items-center gap-2">
              <CheckCircle2 size="14" /> Staged Changes
            </h3>

            <div v-if="stagedFiles.length === 0" class="text-sm text-txt-secondary/50 italic px-2">No staged files</div>

            <div class="space-y-1">
              <div v-for="file in stagedFiles" :key="file.filepath"
                @click="handleSelectFile(file.filepath)"
                class="flex items-center justify-between group px-3 py-2 rounded-lg cursor-pointer transition-all border border-transparent hover:border-border hover:bg-gray-50"
                :class="{'bg-brand-light/50 border-brand-light text-brand': selectedFile === file.filepath}"
              >
                <div class="flex items-center gap-3 overflow-hidden">
                  <span class="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_4px_rgba(34,197,94,0.4)]"></span>
                  <span class="text-sm font-medium truncate">{{ getBasename(file.filepath) }}</span>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h3 class="text-xs font-semibold text-txt-muted uppercase tracking-wider mb-3 flex items-center gap-2">
              <Layers size="14" /> Working Directory
            </h3>

            <div v-if="unstagedFiles.length === 0" class="text-sm text-txt-secondary/50 italic px-2">Working tree clean</div>

            <div class="space-y-1">
              <div v-for="file in unstagedFiles" :key="file.filepath"
                class="flex items-center justify-between group px-3 py-2 rounded-lg cursor-pointer transition-all border border-transparent hover:border-border hover:bg-gray-50"
                :class="{'bg-brand-light/50 border-brand-light text-brand': selectedFile === file.filepath}"
              >
                <div class="flex items-center gap-3 overflow-hidden flex-1" @click="handleSelectFile(file.filepath)">
                  <span class="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_4px_rgba(251,191,36,0.4)]"></span>
                  <span class="text-sm font-medium truncate">{{ getBasename(file.filepath) }}</span>
                </div>

                <button
                  @click.stop="addToStage(file.filepath)"
                  class="opacity-0 group-hover:opacity-100 p-1.5 text-txt-secondary hover:text-brand hover:bg-white rounded-md shadow-sm border border-border transition-all"
                  title="Stage this file"
                >
                  <Play size="12" />
                </button>
              </div>
            </div>
          </div>

        </div>

        <div class="p-4 border-t border-border bg-gray-50/50 backdrop-blur-sm">
          <div class="relative">
            <textarea
              v-model="commitMessage"
              placeholder="What changes did you make?"
              class="w-full bg-white border border-border rounded-xl p-3 text-sm text-txt-primary focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand resize-none h-20 transition-all placeholder:text-txt-secondary/50 shadow-sm"
              @keydown.ctrl.enter="handleCommit"
            ></textarea>
            <div class="absolute bottom-2 right-2 text-[10px] text-txt-muted pointer-events-none">Ctrl+Enter</div>
          </div>
          <button
            @click="handleCommit"
            :disabled="stagedFiles.length === 0 || !commitMessage"
            class="w-full mt-3 bg-brand text-white py-2.5 rounded-xl text-sm font-semibold shadow-soft hover:bg-brand-hover disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
          >
            Commit Changes
          </button>
        </div>
      </aside>

      <main class="flex-1 bg-page flex flex-col relative min-w-0">

        <div v-if="selectedFile" class="absolute inset-0 z-10 bg-white flex flex-col animate-fade-in">
           <div class="h-12 border-b border-border flex items-center justify-between px-6 bg-white shrink-0">
             <div class="flex items-center gap-2 text-sm text-txt-secondary">
               <FileCode size="16" />
               <span class="font-mono text-txt-primary">{{ selectedFile }}</span>
             </div>
             <button @click="selectedFile = null" class="text-xs font-medium text-txt-secondary hover:text-txt-primary px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors">
               Close Diff
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

        <div class="flex-1 flex flex-col h-full">
          <div class="h-16 border-b border-border flex items-center px-8 bg-white/50 backdrop-blur-sm sticky top-0 z-10">
            <h2 class="text-base font-bold text-txt-primary flex items-center gap-2">
              <History size="18" class="text-txt-muted"/> Commit History
            </h2>
          </div>

          <div class="flex-1 overflow-y-auto p-8">
            <div class="max-w-4xl mx-auto space-y-4">
              <div v-for="commit in commits" :key="commit.oid"
                class="group bg-white border border-border rounded-xl p-5 shadow-soft hover:shadow-card hover:border-brand-light transition-all cursor-default"
              >
                <div class="flex justify-between items-start gap-4">
                  <div>
                    <h3 class="text-base font-semibold text-txt-primary leading-snug group-hover:text-brand transition-colors">
                      {{ commit.message }}
                    </h3>
                    <div class="flex items-center gap-3 mt-2 text-xs text-txt-secondary">
                      <span class="flex items-center gap-1 font-medium text-txt-primary">
                        <span class="w-5 h-5 rounded-full bg-gradient-to-br from-brand-light to-blue-100 flex items-center justify-center text-[9px] text-brand font-bold">
                          {{ commit.author.charAt(0).toUpperCase() }}
                        </span>
                        {{ commit.author }}
                      </span>
                      <span>•</span>
                      <span>{{ formatDistanceToNow(commit.timestamp) }} ago</span>
                    </div>
                  </div>

                  <div class="flex items-center gap-2 shrink-0">
                    <span class="font-mono text-xs text-txt-muted bg-gray-50 px-2 py-1 rounded border border-border">
                      {{ commit.shortOid }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

      </main>
    </div>
  </div>
</template>

<style>
.animate-fade-in {
  animation: fadeIn 0.2s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(5px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>