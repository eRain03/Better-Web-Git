<template>
  <div class="trader-console">

    <div class="connection-bar">
      <div class="left-section">
        <div class="conn-status">
          <span class="indicator" :class="{ active: isConnected && repoStatus !== 'no_git' }"></span>
          <span class="text">{{ getStatusText }}</span>
        </div>
        <div class="live-ticker" v-if="isConnected && repoStatus === 'connected'">
          <span class="ticker-symbol">{{ repo.name.toUpperCase() }}</span>
          <div class="branch-selector">
            <span class="label">BR:</span>
            <select v-model="currentBranch" @change="switchBranch" class="tiny-select">
              <option v-for="b in branches" :key="b" :value="b">{{ b }}</option>
              <option value="__NEW__">[+ NEW BRANCH]</option>
            </select>
          </div>
        </div>
      </div>
      <div class="account-info">
        <span class="info-item">PATH: <span class="mono-val">{{ config.path }}</span></span>
      </div>
    </div>

    <div class="control-panel">

      <div class="row-primary" v-if="!isConnected">
        <div class="input-group flex-grow">
          <label>LOCAL PATH</label>
          <input v-model="config.path" type="text" placeholder="D:\Projects\..." class="mono-input" />
        </div>
        <div class="input-group">
          <label>SECRET</label>
          <input v-model="config.secret" type="password" class="mono-input" style="width: 100px;" />
        </div>
        <div class="actions">
          <button @click="connect" :disabled="loading" class="btn btn-buy">CONNECT SYSTEM</button>
        </div>
      </div>

      <div class="row-primary" v-else-if="repoStatus === 'no_git'">
        <div class="warning-box">
          DETECTED FOLDER IS NOT A REPOSITORY.
        </div>
        <div class="actions">
          <button @click="initRepo" :disabled="loading" class="btn btn-buy">INITIALIZE (GIT INIT)</button>
        </div>
      </div>

      <div class="control-layout" v-else>

        <div class="row-secondary">
          <div class="input-group flex-grow">
             <label>REMOTE URL (ORIGIN)</label>
             <div class="input-with-action">
               <input v-model="remoteUrl" type="text" placeholder="https://github.com/..." class="mono-input" />
               <button @click="addRemote" class="mini-btn">SET</button>
             </div>
          </div>
          <div class="actions">
             <button @click="handlePull" :disabled="loading" class="btn btn-blue" title="Pull from Origin">↓ PULL</button>
             <button @click="handlePush" :disabled="loading" class="btn btn-red" title="Push to Origin">↑ PUSH</button>
          </div>
        </div>

        <div class="row-primary">
          <div class="input-group flex-grow">
            <label>COMMIT MESSAGE</label>
            <input
              v-model="commitMsg"
              type="text"
              placeholder="Summary of changes..."
              class="mono-input note-input"
              @keydown.ctrl.enter="doCommit"
            />
          </div>
          <div class="actions">
            <button @click="refresh" class="btn" title="Refresh Status">REFRESH</button>
            <button @click="doCommit" :disabled="!stagedList.length || !commitMsg" class="btn btn-buy">EXECUTE COMMIT</button>
          </div>
        </div>
      </div>

    </div>

    <div class="status-bar" :class="{ 'has-position': stagedList.length > 0 }">
      <div class="status-left">
        <div class="status-item">
          <span class="label">STAGED:</span>
          <span class="value green">{{ stagedList.length }} FILES</span>
        </div>
        <div class="status-item">
          <span class="label">CHANGES:</span>
          <span class="value red">{{ unstagedList.length }} FILES</span>
        </div>
        <div class="status-item" v-if="selectedFile">
          <span class="label">VIEWING:</span>
          <span class="value" style="color: #feeb7a">{{ getBasename(selectedFile) }}</span>
        </div>
      </div>
      <div class="status-right" v-if="selectedFile">
        <button @click="selectedFile = ''" class="flatten-btn">CLOSE VIEW</button>
      </div>
    </div>

    <div class="table-container" v-if="isConnected && repoStatus === 'connected'">

      <div v-if="selectedFile" class="paper-sheet diff-sheet">
        <div class="diff-content font-mono text-xs whitespace-pre-wrap">{{ diffContent || 'Fetching data...' }}</div>
      </div>

      <div v-else class="content-split">
        <div class="paper-sheet half-sheet">
          <div class="sheet-header red-header">WORKING DIRECTORY</div>
          <table class="classic-table">
            <thead><tr><th>ST</th><th>FILE</th><th>OP</th></tr></thead>
            <tbody>
              <tr v-if="unstagedList.length === 0"><td colspan="3" class="empty-cell">CLEAN</td></tr>
              <tr v-for="f in unstagedList" :key="f.filepath" class="hover-row">
                <td :class="f.status === 'new' ? 'green' : 'red'" style="font-weight:bold; width:30px">{{ f.status === 'new' ? 'N' : 'M' }}</td>
                <td @click="showDiff(f.filepath)" class="clickable-cell">{{ getBasename(f.filepath) }}</td>
                <td style="width:40px"><button @click="stageFile(f.filepath)" class="mini-btn">+</button></td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="paper-sheet half-sheet">
          <div class="sheet-header green-header">STAGING AREA</div>
          <table class="classic-table">
            <thead><tr><th>ST</th><th>FILE</th><th>OP</th></tr></thead>
            <tbody>
              <tr v-if="stagedList.length === 0"><td colspan="3" class="empty-cell">EMPTY</td></tr>
              <tr v-for="f in stagedList" :key="f.filepath" class="hover-row">
                <td class="green" style="font-weight:bold; width:30px">R</td>
                <td @click="showDiff(f.filepath)" class="clickable-cell">{{ getBasename(f.filepath) }}</td>
                <td style="width:40px">-</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="table-header-bar mt-2"><span class="title">TRANSACTION LOG</span></div>
      <div class="paper-sheet">
        <table class="classic-table">
          <thead><tr><th>OID</th><th>MESSAGE</th><th>AUTHOR</th><th>TIME</th></tr></thead>
          <tbody>
            <tr v-for="c in commits" :key="c.oid">
              <td class="order-id">{{ c.shortOid }}</td>
              <td style="font-weight:bold">{{ c.message }}</td>
              <td>{{ c.author }}</td>
              <td class="tiny-time">{{ formatTime(c.timestamp) }}</td>
            </tr>
          </tbody>
        </table>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { formatDistanceToNow } from 'date-fns';

const config = ref({
  url: localStorage.getItem('k_url') || 'http://127.0.0.1:8888',
  secret: localStorage.getItem('k_secret') || 'tayen-git-secret',
  path: localStorage.getItem('k_path') || 'D:/Projects/MyCode'
});

const isConnected = ref(false);
const repoStatus = ref(''); // 'connected' | 'no_git'
const loading = ref(false);
const error = ref('');

const repo = ref({ name: '', branch: '' });
const remoteUrl = ref('');
const branches = ref([]);
const currentBranch = ref('');

const status = ref({ staged: [], unstaged: [] });
const commits = ref([]);
const diffContent = ref('');
const selectedFile = ref('');
const commitMsg = ref('');

// === API ===
const api = async (endpoint, method = 'GET', body) => {
  try {
    const res = await fetch(`${config.value.url}${endpoint}`, {
      method,
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${config.value.secret}` },
      body: body ? JSON.stringify(body) : undefined
    });
    if (!res.ok) throw new Error((await res.json()).detail || res.statusText);
    return await res.json();
  } catch (e) {
    alert(`KERNEL ERROR: ${e.message}`);
    throw e;
  }
};

// === ACTIONS ===
const connect = async () => {
  loading.value = true;
  try {
    localStorage.setItem('k_url', config.value.url);
    localStorage.setItem('k_secret', config.value.secret);
    localStorage.setItem('k_path', config.value.path);

    const data = await api('/connect', 'POST', { path: config.value.path });
    repoStatus.value = data.status; // 'connected' or 'no_git'
    repo.value = { name: data.name, branch: data.branch || '' };

    if (data.status === 'connected') {
      remoteUrl.value = data.remote || '';
      currentBranch.value = data.branch;
      isConnected.value = true;
      await refresh();
      await fetchBranches();
    } else {
      isConnected.value = true; // Connected to kernel, but folder is empty
    }
  } catch (e) { isConnected.value = false; }
  finally { loading.value = false; }
};

const initRepo = async () => {
  loading.value = true;
  await api('/init', 'POST', { path: config.value.path });
  await connect(); // reconnect to load data
};

const addRemote = async () => {
  if(!remoteUrl.value) return;
  await api('/remote/add', 'POST', { url: remoteUrl.value, name: 'origin' });
  alert('REMOTE SET TO ORIGIN');
};

const handlePull = async () => {
  loading.value = true;
  try { await api('/pull', 'POST'); alert('PULL COMPLETE'); await refresh(); }
  catch(e) {} finally { loading.value = false; }
};

const handlePush = async () => {
  loading.value = true;
  try { await api('/push', 'POST'); alert('PUSH COMPLETE'); }
  catch(e) {} finally { loading.value = false; }
};

const switchBranch = async () => {
  if (currentBranch.value === '__NEW__') {
    const name = prompt("Enter new branch name:");
    if (!name) return;
    await api('/branch/checkout', 'POST', { name });
  } else {
    await api('/branch/checkout', 'POST', { name: currentBranch.value });
  }
  await connect(); // Refresh global state
};

const fetchBranches = async () => {
  branches.value = await api('/branches');
};

const refresh = async () => {
  const [s, h] = await Promise.all([api('/status'), api('/history')]);
  status.value = s;
  commits.value = h;
};

const stageFile = async (path) => { await api('/stage', 'POST', { path }); await refresh(); };
const doCommit = async () => {
  if (!commitMsg.value) return;
  await api('/commit', 'POST', { message: commitMsg.value });
  commitMsg.value = ''; await refresh();
};
const showDiff = async (path) => {
  selectedFile.value = path; diffContent.value = 'Loading...';
  const res = await api(`/diff?filepath=${encodeURIComponent(path)}`);
  diffContent.value = res.content || 'Binary/Empty';
};

// Computed
const stagedList = computed(() => status.value.staged || []);
const unstagedList = computed(() => status.value.unstaged || []);
const getBasename = (p) => p.split('/').pop() || p;
const formatTime = (ts) => formatDistanceToNow(ts * 1000) + ' ago';
const getStatusText = computed(() => {
  if (!isConnected.value) return 'DISCONNECTED';
  if (repoStatus.value === 'no_git') return 'NO GIT REPO';
  return 'KERNEL ACTIVE';
});

onMounted(() => { if(config.value.path) connect(); });
</script>

<style scoped>
/* TRADER CONSOLE STYLE (WHITE THEME) */
.trader-console {
  font-family: 'Consolas', monospace;
  max-width: 1000px;
  margin: 40px auto;
  color: #111;
  background-color: #fdfdfd;
  border: 1px solid #999;
  box-shadow: 8px 8px 0px rgba(0,0,0,0.1);
}

.connection-bar {
  background: #222; color: #fff; padding: 6px 15px;
  display: flex; justify-content: space-between; align-items: center; font-size: 12px;
  border-bottom: 2px solid #000;
}
.left-section, .conn-status, .live-ticker, .account-info { display: flex; align-items: center; gap: 15px; }
.indicator { width: 8px; height: 8px; border-radius: 50%; background: #555; }
.indicator.active { background: #0f0; box-shadow: 0 0 5px #0f0; }
.ticker-symbol { color: #feeb7a; font-weight: bold; font-size: 14px; }

/* Control Panel */
.control-panel {
  padding: 15px; background: #e8e8e8; border-bottom: 1px solid #999;
  display: flex; flex-direction: column; gap: 10px;
}
.control-layout { display: flex; flex-direction: column; gap: 10px; }
.row-primary, .row-secondary { display: flex; gap: 15px; align-items: flex-end; }
.input-group { display: flex; flex-direction: column; }
.input-group label { font-size: 10px; font-weight: bold; margin-bottom: 3px; color: #555; }
.mono-input {
  font-family: 'Consolas', monospace; padding: 6px 8px;
  border: 1px solid #777; background: #fff; font-size: 13px; outline: none;
}
.note-input { width: 100%; min-width: 400px; }
.flex-grow { flex: 1; }
.input-with-action { display: flex; gap: 0; }
.input-with-action input { border-right: none; }
.mini-btn { border: 1px solid #777; background: #ddd; cursor: pointer; font-size: 10px; padding: 0 8px; }

.actions { display: flex; gap: 8px; margin-left: auto; }
.btn {
  padding: 6px 15px; font-weight: bold; cursor: pointer;
  border: 2px solid #000; box-shadow: 2px 2px 0 #999; font-size: 12px; background: #ccc;
  transition: transform 0.1s;
}
.btn:active { transform: translate(2px, 2px); box-shadow: none; }
.btn-buy { background: #d4edda; color: #155724; border-color: #155724; }
.btn-blue { background: #d0e8f2; color: #0c5460; }
.btn-red { background: #f8d7da; color: #721c24; }
.warning-box {
  background: #fff3cd; color: #856404; padding: 8px; border: 1px solid #ffeeba; flex: 1; font-weight: bold; text-align: center;
}

/* Branch Selector */
.branch-selector { display: flex; align-items: center; gap: 5px; }
.branch-selector .label { color: #aaa; font-size: 10px; }
.tiny-select { background: #333; color: #fff; border: 1px solid #555; font-family: 'Consolas'; font-size: 11px; }

/* Status Bar */
.status-bar {
  padding: 8px 15px; background: #333; color: #ccc;
  display: flex; justify-content: space-between; align-items: center; font-size: 13px; border-bottom: 1px solid #000;
}
.status-bar .value { font-weight: bold; margin-left: 5px; color: #fff; }

/* Tables */
.table-container { background: #fdfdfd; padding-bottom: 20px; }
.table-header-bar { background: #000; color: #fff; padding: 6px 15px; display: flex; justify-content: space-between; align-items: center; }
.title { font-weight: bold; letter-spacing: 2px; font-size: 12px; }

.content-split { display: flex; gap: 15px; padding: 15px; }
.paper-sheet { background: #fff; border: 1px solid #ccc; box-shadow: 2px 2px 5px rgba(0,0,0,0.05); }
.half-sheet { flex: 1; }

.sheet-header { font-size: 11px; font-weight: bold; padding: 5px 10px; border-bottom: 2px solid #000; }
.red-header { background: #f8d7da; color: #721c24; }
.green-header { background: #d4edda; color: #155724; }

.classic-table { width: 100%; border-collapse: collapse; font-size: 12px; color: #333; }
.classic-table th { border-bottom: 2px solid #000; padding: 8px; text-align: left; font-weight: bold; background: #fff; }
.classic-table td { border-bottom: 1px solid #eee; border-right: 1px dashed #e0e0e0; padding: 6px 8px; }
.hover-row:hover { background-color: #f0f8ff; cursor: pointer; }

.diff-sheet { margin: 15px; padding: 15px; min-height: 300px; border: 1px solid #ccc; }
.empty-cell { text-align: center; color: #999; padding: 10px; }
.green { color: #008000; } .red { color: #d00000; }
</style>