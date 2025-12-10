<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import {
  GitBranch, RefreshCw, Layers, CheckCircle2,
  Play, History, FileCode, X, Terminal, ArrowRight
} from 'lucide-vue-next';
import { formatDistanceToNow } from 'date-fns';

// === 1. STATE (状态) ===
const config = ref({
  url: localStorage.getItem('k_url') || 'http://127.0.0.1:8888',
  secret: localStorage.getItem('k_secret') || 'tayen-git-secret',
  path: localStorage.getItem('k_path') || 'D:/Projects/MyCode'
});

const isConnected = ref(false);
const loading = ref(false);
const error = ref('');

// Git Data
const repo = ref<any>(null);     // { name, branch }
const status = ref({ staged: [], unstaged: [] });
const commits = ref([]);
const diffContent = ref('');     // 选中的文件 Diff 文本
const selectedFile = ref('');    // 当前选中的文件路径
const commitMsg = ref('');

// === 2. API LOGIC (核心逻辑) ===
const api = async (endpoint: string, method = 'GET', body?: any) => {
  try {
    const res = await fetch(`${config.value.url}${endpoint}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.value.secret}`
      },
      body: body ? JSON.stringify(body) : undefined
    });
    if (!res.ok) throw new Error((await res.json()).detail || res.statusText);
    return await res.json();
  } catch (e: any) {
    error.value = e.message;
    throw e;
  }
};

const connect = async () => {
  loading.value = true;
  error.value = '';
  try {
    // 保存配置方便下次使用
    localStorage.setItem('k_url', config.value.url);
    localStorage.setItem('k_secret', config.value.secret);
    localStorage.setItem('k_path', config.value.path);

    const data = await api('/connect', 'POST', { path: config.value.path });
    repo.value = data;
    isConnected.value = true;
    await refresh();
  } catch (e) { isConnected.value = false; }
  finally { loading.value = false; }
};

const refresh = async () => {
  loading.value = true;
  try {
    const [s, h] = await Promise.all([api('/status'), api('/history')]);
    status.value = s;
    commits.value = h;
  } finally { loading.value = false; }
};

const stageFile = async (path: string) => {
  await api('/stage', 'POST', { path });
  await refresh();
};

const doCommit = async () => {
  if (!commitMsg.value) return;
  await api('/commit', 'POST', { message: commitMsg.value });
  commitMsg.value = '';
  await refresh();
};

const showDiff = async (path: string) => {
  selectedFile.value = path;
  // 暂时用 fetch 直接获取，因为 kernel 没有 diff 接口，我们假设 kernel.py 有一个 /diff?filepath=xxx
  // 如果没有，可以先只显示路径。这里假设你加上了之前的 /diff 接口
  try {
    // 简易处理：如果 Python 端还没加 diff 接口，这里会报错，暂时留空
    // 为了演示效果，我们假设 Python 返回了 diff 文本
    // diffContent.value = (await api(`/diff?filepath=${encodeURIComponent(path)}`)).content;
  } catch (e) {
    diffContent.value = "Diff preview requires backend update.";
  }
};

// === 3. COMPUTED UI HELPERS ===
const stagedList = computed(() => status.value.staged || []);
const unstagedList = computed(() => status.value.unstaged || []);
const getBasename = (p: string) => p.split('/').pop() || p;

// 自动尝试连接
onMounted(() => { if(config.value.path) connect(); });
</script>

<template>
  <div class="h-screen w-full bg-page text-txt-main font-sans flex flex-col overflow-hidden">

    <div v-if="error" class="fixed top-5 left-1/2 -translate-x-1/2 bg-red-50 text-red-600 px-4 py-2 rounded-full border border-red-200 shadow-lg text-sm z-50 flex items-center gap-2">
      <span class="font-bold">Error:</span> {{ error }}
      <button @click="error = ''" class="ml-2 hover:text-red-800">✕</button>
    </div>

    <div v-if="!isConnected" class="flex-1 flex items-center justify-center">
      <div class="bg-card w-96 p-8 rounded-2xl shadow-xl border border-border">
        <div class="flex items-center justify-center w-12 h-12 bg-brand/10 text-brand rounded-xl mb-6 mx-auto">
          <Terminal size="24" />
        </div>
        <h1 class="text-xl font-bold text-center mb-6">Git Kernel Connect</h1>

        <div class="space-y-4">
          <div>
            <label class="text-xs font-bold text-txt-sub uppercase">Kernel URL</label>
            <input v-model="config.url" class="w-full mt-1 px-3 py-2 bg-page border border-border rounded-lg text-sm font-mono focus:outline-brand" />
          </div>
          <div>
            <label class="text-xs font-bold text-txt-sub uppercase">Secret</label>
            <input v-model="config.secret" type="password" class="w-full mt-1 px-3 py-2 bg-page border border-border rounded-lg text-sm font-mono focus:outline-brand" />
          </div>
          <div>
            <label class="text-xs font-bold text-txt-sub uppercase">Repo Path</label>
            <input v-model="config.path" placeholder="Absolute path..." class="w-full mt-1 px-3 py-2 bg-page border border-border rounded-lg text-sm font-mono focus:outline-brand" />
          </div>
          <button @click="connect" :disabled="loading" class="w-full bg-brand text-white py-2.5 rounded-xl font-bold hover:bg-indigo-700 transition-all disabled:opacity-50 mt-4">
            {{ loading ? 'Connecting...' : 'Connect Agent' }}
          </button>
        </div>
      </div>
    </div>

    <div v-else class="flex-1 flex flex-col h-full">

      <header class="h-14 bg-card border-b border-border flex items-center justify-between px-6 shrink-0">
        <div class="flex items-center gap-3">
          <div class="p-1.5 bg-gray-100 rounded-lg"><GitBranch size="16" /></div>
          <div>
            <div class="font-bold text-sm">{{ repo.name }}</div>
            <div class="text-xs text-txt-sub font-mono">{{ repo.branch }}</div>
          </div>
        </div>
        <div class="flex items-center gap-4">
          <div class="text-xs text-txt-sub bg-page px-2 py-1 rounded font-mono">{{ config.path }}</div>
          <button @click="refresh" class="p-2 hover:bg-gray-100 rounded-lg text-txt-sub transition-colors" :class="{'animate-spin': loading}">
            <RefreshCw size="18" />
          </button>
          <button @click="isConnected = false" class="text-xs font-bold text-red-500 hover:bg-red-50 px-3 py-1.5 rounded-lg">Disconnect</button>
        </div>
      </header>

      <div class="flex-1 flex overflow-hidden">

        <aside class="w-80 bg-page border-r border-border flex flex-col z-10">
          <div class="flex-1 overflow-y-auto p-4 space-y-6">

            <div>
              <div class="text-xs font-bold text-txt-sub uppercase tracking-wider mb-2 px-2 flex justify-between">
                <span>Staged</span>
                <span v-if="stagedList.length" class="bg-green-100 text-green-700 px-1.5 rounded-full">{{ stagedList.length }}</span>
              </div>
              <div v-if="!stagedList.length" class="text-xs italic text-gray-400 px-2">Empty</div>
              <div v-for="f in stagedList" :key="f.filepath" class="group flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer hover:bg-white border border-transparent hover:border-gray-200" :class="{'bg-white border-gray-200 shadow-sm': selectedFile===f.filepath}" @click="showDiff(f.filepath)">
                <div class="w-2 h-2 rounded-full bg-green-500"></div>
                <span class="text-sm truncate">{{ getBasename(f.filepath) }}</span>
              </div>
            </div>

            <div>
              <div class="text-xs font-bold text-txt-sub uppercase tracking-wider mb-2 px-2 flex justify-between">
                <span>Changes</span>
                <span v-if="unstagedList.length" class="bg-amber-100 text-amber-700 px-1.5 rounded-full">{{ unstagedList.length }}</span>
              </div>
              <div v-if="!unstagedList.length" class="text-xs italic text-gray-400 px-2">Clean</div>
              <div v-for="f in unstagedList" :key="f.filepath" class="group flex items-center justify-between px-2 py-1.5 rounded-lg cursor-pointer hover:bg-white border border-transparent hover:border-gray-200" :class="{'bg-white border-gray-200 shadow-sm': selectedFile===f.filepath}" @click="showDiff(f.filepath)">
                <div class="flex items-center gap-2 min-w-0">
                  <div class="w-2 h-2 rounded-full bg-amber-400"></div>
                  <span class="text-sm truncate">{{ getBasename(f.filepath) }}</span>
                </div>
                <button @click.stop="stageFile(f.filepath)" class="opacity-0 group-hover:opacity-100 hover:bg-brand hover:text-white p-1 rounded transition-all"><Play size="12" fill="currentColor"/></button>
              </div>
            </div>
          </div>

          <div class="p-4 border-t border-border bg-white">
            <textarea v-model="commitMsg" placeholder="Commit message..." class="w-full border border-border rounded-xl p-3 text-sm focus:outline-brand h-20 resize-none"></textarea>
            <button @click="doCommit" :disabled="!stagedList.length || !commitMsg" class="w-full mt-2 bg-brand text-white py-2 rounded-lg text-sm font-bold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed">Commit</button>
          </div>
        </aside>

        <main class="flex-1 bg-white relative flex flex-col">

          <div v-if="selectedFile" class="absolute inset-0 z-20 bg-white flex flex-col">
            <div class="h-10 border-b border-border flex items-center justify-between px-4 bg-gray-50 shrink-0">
              <div class="flex items-center gap-2 text-sm text-txt-main font-mono"><FileCode size="14" class="text-brand"/> {{ selectedFile }}</div>
              <button @click="selectedFile = ''" class="hover:bg-gray-200 p-1 rounded"><X size="16"/></button>
            </div>
            <div class="flex-1 overflow-auto p-4 font-mono text-xs">
              <div v-if="!diffContent" class="text-center text-gray-400 mt-10">Preview requires backend /diff endpoint update</div>
              <pre v-else>{{ diffContent }}</pre>
            </div>
          </div>

          <div class="flex-1 flex flex-col overflow-hidden">
            <div class="h-10 border-b border-border flex items-center px-6 bg-gray-50 text-xs font-bold text-txt-sub uppercase tracking-wider shrink-0">
              <History size="14" class="mr-2"/> Recent History
            </div>
            <div class="flex-1 overflow-y-auto p-6 space-y-4">
              <div v-for="c in commits" :key="c.oid" class="flex gap-4 group">
                <div class="w-8 h-8 rounded-full bg-brand/10 text-brand flex items-center justify-center text-xs font-bold shrink-0 border border-brand/20">
                  {{ c.author.charAt(0).toUpperCase() }}
                </div>
                <div class="flex-1 min-w-0 pb-4 border-b border-dashed border-border group-last:border-0">
                  <div class="flex justify-between items-baseline">
                    <h3 class="font-medium text-txt-main truncate pr-4">{{ c.message }}</h3>
                    <span class="font-mono text-xs text-txt-sub bg-gray-100 px-1.5 rounded">{{ c.shortOid }}</span>
                  </div>
                  <div class="text-xs text-txt-sub mt-1 flex gap-2">
                    <span>{{ c.author }}</span> • <span>{{ formatDistanceToNow(c.timestamp * 1000) }} ago</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </main>
      </div>
    </div>
  </div>
</template>