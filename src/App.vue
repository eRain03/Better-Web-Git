<script setup lang="ts">
import { ref } from 'vue';
import { useGit } from './composables/useGit';
import { useDiff } from './composables/useDiff';
import DiffView from './components/DiffView.vue';
import {
  FolderOpen, GitBranch, RefreshCw, Play, Upload, Download,
  Settings, X, Check, Activity, Layers, Terminal
} from 'lucide-vue-next';
import { formatDistanceToNow } from 'date-fns';

const {
  fs, repoHandle, openRepo, refresh, commits,
  unstagedFiles, stagedFiles, currentBranch, remoteUrl,
  addToStage, commit, pull, push, loading
} = useGit();

const { diffWorkdir, diffLines, loadingDiff } = useDiff();

// UI States
const commitMessage = ref('');
const selectedFile = ref<string | null>(null);
const showSettings = ref(false);
const githubToken = ref(localStorage.getItem('gh_token') || '');
const authorName = ref(localStorage.getItem('git_name') || 'Tayen');
const authorEmail = ref(localStorage.getItem('git_email') || 'tayen@local');

// Actions
const handleSelectFile = async (filepath: string) => {
  if (!fs.value) return;
  selectedFile.value = filepath;
  await diffWorkdir(fs.value, filepath);
};

const handleCommit = async () => {
  if (!commitMessage.value) return;
  await commit(commitMessage.value, authorName.value, authorEmail.value);
  commitMessage.value = '';
};

const handlePull = () => {
  if (!githubToken.value) { showSettings.value = true; return; }
  pull('x-access-token', githubToken.value);
};

const handlePush = () => {
  if (!githubToken.value) { showSettings.value = true; return; }
  push('x-access-token', githubToken.value);
};

const saveSettings = () => {
  localStorage.setItem('gh_token', githubToken.value);
  localStorage.setItem('git_name', authorName.value);
  localStorage.setItem('git_email', authorEmail.value);
  showSettings.value = false;
};

const getBasename = (path: string) => path.split('/').pop() || path;
</script>

<template>
  <div class="flex h-screen w-full bg-[#09090b] text-[#e4e4e7] font-mono overflow-hidden">

    <div v-if="!repoHandle" class="fixed inset-0 z-40 flex flex-col items-center justify-center bg-[#09090b]">
      <div class="text-center space-y-6 animate-fade-in">
        <div class="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mx-auto ring-1 ring-white/10">
          <Terminal size="32" />
        </div>
        <div>
          <h1 class="text-2xl font-medium tracking-tight">Git Fleet</h1>
          <p class="text-[#a1a1aa] text-sm mt-2">No repository loaded</p>
        </div>
        <button
          @click="openRepo"
          class="bg-white text-black px-6 py-2.5 rounded-lg font-medium hover:bg-gray-200 transition-colors flex items-center gap-2 mx-auto"
        >
          <FolderOpen size="16" /> Open Folder
        </button>
      </div>
    </div>

    <div v-else class="flex flex-col w-full h-full">

      <header class="h-12 border-b border-[#27272a] bg-[#09090b] flex items-center justify-between px-4 shrink-0">
        <div class="flex items-center gap-4">
          <div class="flex items-center gap-2 text-xs bg-[#27272a] px-3 py-1.5 rounded-md hover:bg-[#3f3f46] cursor-pointer transition-colors">
            <GitBranch size="14" class="text-[#a1a1aa]" />
            <span class="font-bold">{{ currentBranch }}</span>
          </div>
          <span class="text-xs text-[#71717a]">{{ repoHandle.name }}</span>
        </div>

        <div class="flex items-center gap-2">
          <div class="flex bg-[#27272a] rounded-md p-0.5">
            <button @click="handlePull" class="p-1.5 hover:bg-white/10 rounded text-[#a1a1aa] hover:text-white" title="Pull">
              <Download size="14" />
            </button>
            <button @click="handlePush" class="p-1.5 hover:bg-white/10 rounded text-[#a1a1aa] hover:text-white" title="Push">
              <Upload size="14" />
            </button>
          </div>

          <div class="w-px h-4 bg-[#27272a] mx-2"></div>

          <button @click="refresh" class="p-2 hover:bg-[#27272a] rounded-md text-[#a1a1aa]" :class="{'animate-spin': loading}">
            <RefreshCw size="14" />
          </button>
          <button @click="showSettings = true" class="p-2 hover:bg-[#27272a] rounded-md text-[#a1a1aa]">
            <Settings size="14" />
          </button>
        </div>
      </header>

      <div class="flex flex-1 overflow-hidden">

        <aside class="w-64 border-r border-[#27272a] bg-[#09090b] flex flex-col shrink-0">
          <div class="flex-1 overflow-y-auto p-2 space-y-4">

            <div>
              <div class="px-2 py-1 text-[10px] font-bold text-[#52525b] uppercase tracking-wider flex justify-between">
                <span>Staged</span>
                <span v-if="stagedFiles.length" class="text-white">{{ stagedFiles.length }}</span>
              </div>
              <div v-if="!stagedFiles.length" class="px-2 py-2 text-xs text-[#52525b] italic">Empty</div>
              <div v-for="file in stagedFiles" :key="file.filepath"
                 @click="handleSelectFile(file.filepath)"
                 class="group px-2 py-1.5 text-xs rounded-md hover:bg-[#27272a] cursor-pointer flex items-center gap-2"
                 :class="{'bg-[#27272a] text-white': selectedFile === file.filepath, 'text-[#a1a1aa]': selectedFile !== file.filepath}"
              >
                <div class="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                <span class="truncate">{{ getBasename(file.filepath) }}</span>
              </div>
            </div>

            <div>
              <div class="px-2 py-1 text-[10px] font-bold text-[#52525b] uppercase tracking-wider flex justify-between">
                <span>Changes</span>
                <span v-if="unstagedFiles.length" class="text-white">{{ unstagedFiles.length }}</span>
              </div>
              <div v-if="!unstagedFiles.length" class="px-2 py-2 text-xs text-[#52525b] italic">Clean</div>
              <div v-for="file in unstagedFiles" :key="file.filepath"
                 class="group px-2 py-1.5 text-xs rounded-md hover:bg-[#27272a] cursor-pointer flex items-center gap-2"
                 :class="{'bg-[#27272a] text-white': selectedFile === file.filepath, 'text-[#a1a1aa]': selectedFile !== file.filepath}"
              >
                <div class="flex-1 flex items-center gap-2 min-w-0" @click="handleSelectFile(file.filepath)">
                  <div class="w-1.5 h-1.5 rounded-full bg-yellow-500"></div>
                  <span class="truncate">{{ getBasename(file.filepath) }}</span>
                </div>
                <button @click.stop="addToStage(file.filepath)" class="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-white hover:text-black rounded transition-all">
                  <Play size="10" />
                </button>
              </div>
            </div>

          </div>

          <div class="p-3 border-t border-[#27272a] bg-[#09090b]">
            <textarea
              v-model="commitMessage"
              placeholder="Commit summary..."
              class="w-full bg-[#18181b] text-xs text-white p-2 rounded-md border border-transparent focus:border-[#3f3f46] focus:outline-none resize-none h-16 placeholder-[#52525b]"
              @keydown.ctrl.enter="handleCommit"
            ></textarea>
            <button
              @click="handleCommit"
              :disabled="!stagedFiles.length || !commitMessage"
              class="w-full mt-2 bg-white text-black py-1.5 rounded-md text-xs font-bold hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Commit
            </button>
          </div>
        </aside>

        <main class="flex-1 bg-[#09090b] relative flex flex-col min-w-0">

          <div v-if="selectedFile" class="absolute inset-0 z-10 bg-[#09090b] flex flex-col">
            <DiffView
              :filepath="selectedFile"
              :lines="diffLines"
              :loading="loadingDiff"
              @close="selectedFile = null"
            />
          </div>

          <div class="flex-1 flex flex-col">
            <div class="h-8 border-b border-[#27272a] flex items-center px-4 text-xs text-[#52525b]">
              HISTORY
            </div>
            <div class="flex-1 overflow-y-auto p-4 custom-scrollbar">
              <div class="space-y-4">
                <div v-for="commit in commits" :key="commit.oid" class="flex gap-4">
                  <div class="w-8 h-8 rounded-full bg-[#27272a] flex items-center justify-center text-[10px] text-white font-bold shrink-0">
                    {{ commit.author.slice(0,2).toUpperCase() }}
                  </div>
                  <div class="flex-1 min-w-0">
                    <div class="flex items-baseline justify-between">
                      <p class="text-sm text-[#e4e4e7] font-medium truncate">{{ commit.message }}</p>
                      <span class="text-[10px] text-[#52525b] font-mono ml-2">{{ commit.oid.slice(0,7) }}</span>
                    </div>
                    <div class="flex items-center gap-2 mt-0.5">
                      <span class="text-xs text-[#a1a1aa]">{{ commit.author }}</span>
                      <span class="text-[10px] text-[#52525b]">• {{ formatDistanceToNow(new Date(commit.timestamp * 1000)) }} ago</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>

    <div v-if="showSettings" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div class="bg-[#18181b] border border-[#27272a] rounded-xl w-96 p-6 shadow-2xl">
        <div class="flex justify-between items-center mb-6">
          <h2 class="text-sm font-bold text-white">Git Configuration</h2>
          <button @click="showSettings = false" class="text-[#52525b] hover:text-white"><X size="16"/></button>
        </div>

        <div class="space-y-4">
          <div>
            <label class="block text-[10px] uppercase text-[#52525b] font-bold mb-1">Author Name</label>
            <input v-model="authorName" type="text" class="w-full bg-[#09090b] border border-[#27272a] rounded p-2 text-xs text-white focus:outline-none focus:border-white/20">
          </div>
          <div>
            <label class="block text-[10px] uppercase text-[#52525b] font-bold mb-1">Author Email</label>
            <input v-model="authorEmail" type="text" class="w-full bg-[#09090b] border border-[#27272a] rounded p-2 text-xs text-white focus:outline-none focus:border-white/20">
          </div>
          <div class="pt-4 border-t border-[#27272a]">
            <label class="block text-[10px] uppercase text-[#52525b] font-bold mb-1">GitHub Personal Access Token</label>
            <input v-model="githubToken" type="password" placeholder="ghp_..." class="w-full bg-[#09090b] border border-[#27272a] rounded p-2 text-xs text-white focus:outline-none focus:border-white/20">
            <p class="text-[10px] text-[#52525b] mt-1">Required for Push/Pull. Saved to local storage.</p>
          </div>
        </div>

        <button @click="saveSettings" class="w-full mt-6 bg-white text-black py-2 rounded text-sm font-bold hover:bg-gray-200">
          Save & Close
        </button>
      </div>
    </div>

  </div>
</template>