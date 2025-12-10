<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue';
import { formatDistanceToNow } from 'date-fns';

// 模拟配置和状态
const config = ref({
  url: localStorage.getItem('k_url') || 'http://127.0.0.1:8888',
  secret: localStorage.getItem('k_secret') || 'tayen-git-secret',
  path: localStorage.getItem('k_path') || 'D:/Projects/MyCode'
});

const isConnected = ref(false);
const loading = ref(false);
const error = ref('');
const terminalLog = ref<string[]>(['> SYSTEM BOOT_SEQUENCE_INIT...', '> WAITING_FOR_LINK...']);

// Data
const repo = ref<any>(null);
const status = ref({ staged: [], unstaged: [] });
const commits = ref([]);
const diffContent = ref('');
const selectedFile = ref('');
const commitMsg = ref('');

// === LOGIC ===
const log = (msg: string) => {
  terminalLog.value.push(`> ${msg}`);
  if (terminalLog.value.length > 5) terminalLog.value.shift();
};

const api = async (endpoint: string, method = 'GET', body?: any) => {
  try {
    const res = await fetch(`${config.value.url}${endpoint}`, {
      method,
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${config.value.secret}` },
      body: body ? JSON.stringify(body) : undefined
    });
    if (!res.ok) throw new Error((await res.json()).detail || res.statusText);
    return await res.json();
  } catch (e: any) {
    error.value = e.message;
    log(`ERR: ${e.message.toUpperCase()}`);
    throw e;
  }
};

const connect = async () => {
  loading.value = true;
  error.value = '';
  log(`CONNECTING TO KERNEL AT ${config.value.path}...`);
  try {
    localStorage.setItem('k_url', config.value.url);
    localStorage.setItem('k_secret', config.value.secret);
    localStorage.setItem('k_path', config.value.path);

    const data = await api('/connect', 'POST', { path: config.value.path });
    repo.value = data;
    isConnected.value = true;
    log(`LINK ESTABLISHED: ${data.name.toUpperCase()}`);
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
    log('DATA SYNC COMPLETE');
  } finally { loading.value = false; }
};

const stageFile = async (path: string) => {
  await api('/stage', 'POST', { path });
  log(`STAGED: ${getBasename(path)}`);
  await refresh();
};

const doCommit = async () => {
  if (!commitMsg.value) return;
  await api('/commit', 'POST', { message: commitMsg.value });
  log(`COMMIT SENT: "${commitMsg.value}"`);
  commitMsg.value = '';
  await refresh();
};

const showDiff = async (path: string) => {
  selectedFile.value = path;
  log(`FETCHING DIFF: ${getBasename(path)}`);
  try {
    const res = await api(`/diff?filepath=${encodeURIComponent(path)}`);
    diffContent.value = res.content || 'NO TEXT CHANGES DETECTED';
  } catch (e) {
    diffContent.value = "ERR: COULD NOT READ DIFF";
  }
};

const stagedList = computed(() => status.value.staged || []);
const unstagedList = computed(() => status.value.unstaged || []);
const getBasename = (p: string) => p.split('/').pop() || p;

onMounted(() => { if(config.value.path) connect(); });
</script>

<template>
  <div class="w-[1024px] h-[768px] bg-[#111] rounded-lg p-6 shadow-crt-casing relative flex flex-col border-t border-[#333]">

    <div class="w-full h-full bg-crt-bg border-4 border-crt-border shadow-[inset_0_0_80px_rgba(0,0,0,0.8)] relative crt-effect text-amber flex flex-col p-2 text-xl font-medium tracking-wide">

      <header class="border-b-2 border-amber flex justify-between items-center px-2 py-1 shrink-0 bg-crt-bg z-10">
        <div class="flex gap-4">
          <span class="bg-amber text-crt-bg px-2 font-bold">GIT_TERM v1.0</span>
          <span v-if="repo">REPO: {{ repo.name.toUpperCase() }} // BRANCH: {{ repo.branch }}</span>
          <span v-else>NO CONNECTION</span>
        </div>
        <div class="flex gap-4">
          <span v-if="loading" class="animate-pulse">PROCESSING...</span>
          <span>{{ new Date().toLocaleTimeString() }}</span>
        </div>
      </header>

      <div v-if="!isConnected" class="absolute inset-0 z-40 bg-crt-bg flex items-center justify-center">
        <div class="border-2 border-amber p-4 w-[500px] shadow-glow">
          <h1 class="text-3xl mb-6 text-center border-b border-amber border-dashed pb-2">SYSTEM LOGIN</h1>

          <div class="space-y-4">
             <div class="flex gap-2 items-center">
               <span class="w-24 text-right">KERNEL_URL:</span>
               <input v-model="config.url" class="flex-1 bg-crt-panel border-b border-amber text-amber outline-none px-2 uppercase" />
             </div>
             <div class="flex gap-2 items-center">
               <span class="w-24 text-right">SECRET:</span>
               <input v-model="config.secret" type="password" class="flex-1 bg-crt-panel border-b border-amber text-amber outline-none px-2" />
             </div>
             <div class="flex gap-2 items-center">
               <span class="w-24 text-right">PATH:</span>
               <input v-model="config.path" class="flex-1 bg-crt-panel border-b border-amber text-amber outline-none px-2 uppercase" />
             </div>

             <div class="pt-4 text-center">
               <button @click="connect" class="bg-amber text-crt-bg px-8 py-1 hover:bg-amber-bright font-bold uppercase">
                 [ INITIALIZE LINK ]
               </button>
             </div>

             <div class="h-20 border border-amber-dim p-2 text-amber-dim text-sm mt-4 font-mono overflow-hidden">
                <div v-for="l in terminalLog" :key="l">{{ l }}</div>
                <div v-if="error" class="text-red-500">{{ error }}</div>
             </div>
          </div>
        </div>
      </div>

      <div v-else class="flex flex-1 overflow-hidden mt-2 border-2 border-amber-dim">

        <aside class="w-80 border-r-2 border-amber-dim flex flex-col bg-crt-bg">

          <div class="flex-1 overflow-y-auto p-2">
            <div class="mb-4">
              <div class="bg-amber-dim text-crt-bg px-1 mb-1 flex justify-between">
                <span>INDEX (STAGED)</span>
                <span>[{{ stagedList.length }}]</span>
              </div>
              <div v-if="!stagedList.length" class="text-amber-dim px-2">-- EMPTY --</div>
              <div v-for="f in stagedList" :key="f.filepath"
                   @click="showDiff(f.filepath)"
                   class="cursor-pointer hover:bg-amber-dim hover:text-crt-bg px-1 flex gap-2 truncate"
                   :class="selectedFile === f.filepath ? 'bg-amber text-crt-bg' : ''">
                <span>*</span> {{ getBasename(f.filepath) }}
              </div>
            </div>

            <div>
              <div class="bg-amber-dim text-crt-bg px-1 mb-1 flex justify-between">
                <span>WORKING DIR</span>
                <span>[{{ unstagedList.length }}]</span>
              </div>
              <div v-if="!unstagedList.length" class="text-amber-dim px-2">-- CLEAN --</div>
              <div v-for="f in unstagedList" :key="f.filepath"
                   class="flex justify-between hover:bg-amber-dim hover:text-crt-bg px-1 cursor-pointer group"
                   :class="selectedFile === f.filepath ? 'bg-amber text-crt-bg' : ''"
                   @click="showDiff(f.filepath)">
                <span class="truncate">{{ getBasename(f.filepath) }}</span>
                <span @click.stop="stageFile(f.filepath)" class="text-amber-dim group-hover:text-crt-bg font-bold hover:underline">[ADD]</span>
              </div>
            </div>
          </div>

          <div class="h-32 border-t-2 border-amber-dim p-2 flex flex-col">
            <textarea v-model="commitMsg" class="flex-1 bg-transparent text-amber outline-none resize-none placeholder-amber-dim uppercase" placeholder="ENTER COMMIT MESSAGE..."></textarea>
            <div class="flex justify-between items-center mt-1">
              <span class="text-sm text-amber-dim cursor-blink">_</span>
              <button @click="doCommit" class="border border-amber px-2 hover:bg-amber hover:text-crt-bg uppercase text-sm">
                [ EXECUTE COMMIT ]
              </button>
            </div>
          </div>
        </aside>

        <main class="flex-1 flex flex-col bg-crt-bg relative">

          <div v-if="selectedFile" class="absolute inset-0 flex flex-col z-20 bg-crt-bg">
            <div class="border-b border-amber-dim px-2 py-1 flex justify-between items-center bg-crt-panel">
              <span>VIEWING: {{ selectedFile }}</span>
              <button @click="selectedFile = ''" class="hover:bg-amber hover:text-crt-bg px-2">[ X ]</button>
            </div>
            <div class="flex-1 overflow-auto p-2 text-lg leading-tight custom-scrollbar">
              <pre class="whitespace-pre-wrap font-mono">{{ diffContent }}</pre>
            </div>
          </div>

          <div class="flex-1 flex flex-col overflow-hidden">
             <div class="border-b border-amber-dim px-2 py-1 bg-amber-dim text-crt-bg">
               TRANSACTION LOG (HISTORY)
             </div>
             <div class="flex-1 overflow-y-auto p-2 space-y-2">
                <div v-for="c in commits" :key="c.oid" class="border-l-2 border-amber-dim pl-2 hover:border-amber">
                   <div class="flex justify-between">
                     <span class="font-bold">{{ c.message.toUpperCase() }}</span>
                     <span class="text-amber-dim">{{ c.shortOid }}</span>
                   </div>
                   <div class="text-sm text-amber-dim">
                     USER: {{ c.author.toUpperCase() }} // {{ formatDistanceToNow(c.timestamp * 1000).toUpperCase() }} AGO
                   </div>
                </div>
             </div>
          </div>

        </main>
      </div>

      <footer class="mt-auto border-t-2 border-amber py-1 px-2 flex justify-between text-sm text-amber-dim uppercase">
        <span>MEM: OK</span>
        <span>STATUS: {{ isConnected ? 'CONNECTED' : 'OFFLINE' }}</span>
        <span>MODE: READ/WRITE</span>
      </footer>

    </div>
  </div>
</template>