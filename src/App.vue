<template>
  <div class="trader-console">

    <div class="connection-bar">
      <div class="left-section">
        <div class="conn-status">
          <span class="indicator" :class="{ active: isConnected }"></span>
          <span class="text">{{ isConnected ? 'KERNEL LINKED' : 'DISCONNECTED' }}</span>
        </div>
        <div class="live-ticker" v-if="repo">
          <span class="ticker-symbol">{{ repo.name.toUpperCase() }}</span>
          <span class="ticker-price ask">BR: {{ repo.branch }}</span>
        </div>
      </div>
      <div class="account-info">
        <span class="info-item">PATH: <span class="mono-val">{{ config.path }}</span></span>
      </div>
    </div>

    <div class="control-panel">
      <div class="row-primary" v-if="!isConnected">
        <div class="input-group flex-grow">
          <label>REPO PATH</label>
          <input v-model="config.path" type="text" placeholder="D:\Projects\..." class="mono-input" />
        </div>
        <div class="input-group">
          <label>SECRET</label>
          <input v-model="config.secret" type="password" class="mono-input" style="width: 100px;" />
        </div>
        <div class="actions">
          <button @click="connect" :disabled="loading" class="btn btn-buy">CONNECT</button>
        </div>
      </div>

      <div class="row-primary" v-else>
        <div class="input-group flex-grow">
          <label>COMMIT MESSAGE</label>
          <input
            v-model="commitMsg"
            type="text"
            placeholder="Type summary..."
            class="mono-input note-input"
            @keydown.ctrl.enter="doCommit"
          />
        </div>

        <div class="actions">
          <button @click="refresh" class="btn" title="Refresh Status">REFRESH</button>
          <button @click="doCommit" :disabled="!stagedList.length || !commitMsg" class="btn btn-buy">COMMIT</button>
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
        <button @click="selectedFile = ''" class="flatten-btn">CLOSE DIFF</button>
      </div>
    </div>

    <div class="table-container">

      <div v-if="selectedFile" class="paper-sheet diff-sheet">
        <div class="diff-content font-mono text-xs whitespace-pre-wrap">{{ diffContent || 'Fetching diff data...' }}</div>
      </div>

      <div v-else class="content-split">

        <div class="paper-sheet half-sheet">
          <div class="sheet-header red-header">WORKING DIRECTORY</div>
          <table class="classic-table">
            <thead>
              <tr>
                <th>STAT</th>
                <th>FILENAME</th>
                <th>ACT</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="unstagedList.length === 0"><td colspan="3" style="text-align: center; color: #999;">CLEAN</td></tr>
              <tr v-for="f in unstagedList" :key="f.filepath" class="hover-row">
                <td :class="f.status === 'new' ? 'green' : 'red'" style="font-weight: bold; width: 40px;">{{ f.status === 'new' ? 'NEW' : 'MOD' }}</td>
                <td style="text-align: left;" @click="showDiff(f.filepath)" class="clickable-cell">{{ getBasename(f.filepath) }}</td>
                <td style="width: 50px;">
                  <button @click="stageFile(f.filepath)" class="mini-btn">ADD</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="paper-sheet half-sheet">
          <div class="sheet-header green-header">STAGING AREA (INDEX)</div>
          <table class="classic-table">
            <thead>
              <tr>
                <th>STAT</th>
                <th>FILENAME</th>
                <th>ACT</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="stagedList.length === 0"><td colspan="3" style="text-align: center; color: #999;">EMPTY</td></tr>
              <tr v-for="f in stagedList" :key="f.filepath" class="hover-row">
                <td class="green" style="font-weight: bold; width: 40px;">RDY</td>
                <td style="text-align: left;" @click="showDiff(f.filepath)" class="clickable-cell">{{ getBasename(f.filepath) }}</td>
                <td style="width: 50px;">-</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="table-header-bar" style="margin-top: 10px;">
        <span class="title">COMMIT LOG</span>
      </div>
      <div class="paper-sheet">
        <table class="classic-table">
          <thead>
            <tr>
              <th>OID</th>
              <th>MESSAGE</th>
              <th>AUTHOR</th>
              <th>TIME</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="c in commits" :key="c.oid">
              <td class="order-id">{{ c.shortOid }}</td>
              <td style="text-align: left; font-weight: bold;">{{ c.message }}</td>
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
import { ref, computed, onMounted } from 'vue';
import { formatDistanceToNow } from 'date-fns';

// === CONFIG & STATE ===
const config = ref({
  url: localStorage.getItem('k_url') || 'http://127.0.0.1:8888',
  secret: localStorage.getItem('k_secret') || 'tayen-git-secret',
  path: localStorage.getItem('k_path') || 'D:/Projects/MyCode'
});

const isConnected = ref(false);
const loading = ref(false);
const error = ref('');

// Data
const repo = ref(null);
const status = ref({ staged: [], unstaged: [] });
const commits = ref([]);
const diffContent = ref('');
const selectedFile = ref('');
const commitMsg = ref('');

// === API LOGIC ===
const api = async (endpoint, method = 'GET', body) => {
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
  } catch (e) {
    console.error(e);
    alert(`KERNEL ERROR: ${e.message}`);
    throw e;
  }
};

const connect = async () => {
  loading.value = true;
  try {
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

const stageFile = async (path) => {
  await api('/stage', 'POST', { path });
  await refresh();
};

const doCommit = async () => {
  if (!commitMsg.value) return;
  await api('/commit', 'POST', { message: commitMsg.value });
  commitMsg.value = '';
  await refresh();
};

const showDiff = async (path) => {
  selectedFile.value = path;
  diffContent.value = 'Loading...';
  try {
    const res = await api(`/diff?filepath=${encodeURIComponent(path)}`);
    diffContent.value = res.content || 'Binary file or empty.';
  } catch (e) {
    diffContent.value = "Error fetching diff.";
  }
};

// Helpers
const stagedList = computed(() => status.value.staged || []);
const unstagedList = computed(() => status.value.unstaged || []);
const getBasename = (p) => p.split('/').pop() || p;
const formatTime = (ts) => formatDistanceToNow(ts * 1000) + ' ago';

onMounted(() => { if(config.value.path) connect(); });
</script>

<style scoped>
/* === TRADER CONSOLE STYLE === */
.trader-console {
  font-family: 'Courier New', Courier, monospace;
  max-width: 950px;
  margin: 20px auto;
  color: #111;
  background-color: #f0f0f0;
  border: 1px solid #888;
  box-shadow: 5px 5px 0px rgba(0,0,0,0.1);
}

/* Header */
.connection-bar {
  background: #222;
  color: #fff;
  padding: 6px 15px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  border-bottom: 2px solid #000;
}
.left-section, .conn-status, .live-ticker, .account-info { display: flex; align-items: center; gap: 10px; }
.indicator { width: 8px; height: 8px; border-radius: 50%; background: #555; }
.indicator.active { background: #0f0; box-shadow: 0 0 5px #0f0; }
.ticker-symbol { color: #feeb7a; font-weight: bold; }
.ticker-price.ask { color: #ff4d4d; margin-right: 5px; }
.mono-val { font-weight: bold; color: #fff; }

/* Control Panel */
.control-panel {
  padding: 15px;
  background: #e0e0e0;
  border-bottom: 1px solid #999;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.row-primary { display: flex; gap: 15px; align-items: flex-end; }
.input-group { display: flex; flex-direction: column; }
.input-group label { font-size: 10px; font-weight: bold; margin-bottom: 3px; color: #555; }
.mono-input {
  font-family: 'Consolas', monospace; padding: 5px 8px;
  border: 1px solid #777; background: #fff; font-size: 13px; outline: none;
}
.note-input { width: 100%; min-width: 300px; }
.flex-grow { flex: 1; }

.actions { display: flex; gap: 8px; margin-left: auto; }
.btn {
  padding: 6px 15px; font-weight: bold; cursor: pointer;
  border: 2px solid #000; box-shadow: 2px 2px 0 #444; font-size: 12px;
  background: #ccc;
  transition: transform 0.1s;
}
.btn:active { transform: translate(2px, 2px); box-shadow: none; }
.btn-buy { background: #d4edda; color: #155724; } /* Commit Button */

/* Status Bar */
.status-bar {
  padding: 8px 15px;
  background: #333;
  color: #ccc;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
  border-bottom: 1px solid #000;
}
.status-bar.has-position { background: #2a2a2a; }
.status-left { display: flex; gap: 20px; }
.status-bar .value { font-weight: bold; margin-left: 5px; color: #fff; }
.flatten-btn { background: #f0ad4e; color: #222; border: 1px solid #f0ad4e; font-weight: bold; cursor: pointer; padding: 2px 8px; font-size: 11px; }

/* Tables & Content */
.table-container {
  background: #f0f0f0;
  display: flex;
  flex-direction: column;
  padding-bottom: 20px;
}
.table-header-bar {
  background: #000; color: #fff; padding: 6px 15px;
  display: flex; justify-content: space-between; align-items: center;
}
.title { font-weight: bold; letter-spacing: 2px; font-size: 12px; }

.content-split {
  display: flex;
  gap: 0;
}

.paper-sheet {
  background: #fff;
  margin: 15px;
  border: 1px solid #ccc;
  box-shadow: 0 2px 5px rgba(0,0,0,0.05);
  padding: 0;
}

.half-sheet { flex: 1; margin: 15px 7.5px; }
.half-sheet:first-child { margin-left: 15px; }
.half-sheet:last-child { margin-right: 15px; }

.sheet-header {
  font-size: 11px; font-weight: bold; padding: 5px 10px; border-bottom: 2px solid #000;
}
.red-header { background: #f8d7da; color: #721c24; }
.green-header { background: #d4edda; color: #155724; }

.classic-table { width: 100%; border-collapse: collapse; font-size: 12px; color: #333;}
.classic-table th {
  border-bottom: 2px solid #000;
  padding: 8px; text-align: left; font-weight: bold; color: #000; background: #fff; text-transform: uppercase; font-size: 11px;
}
.classic-table td {
  border-bottom: 1px solid #eee; border-right: 1px dashed #e0e0e0;
  padding: 6px 8px; vertical-align: middle;
}
.classic-table td:last-child { border-right: none; }
.hover-row:hover { background-color: #f0f8ff; cursor: pointer; }
.clickable-cell:hover { text-decoration: underline; color: #000; }

.diff-sheet {
  padding: 15px;
  min-height: 300px;
  overflow-x: auto;
}

.mini-btn { font-size: 10px; padding: 0 5px; cursor: pointer; background: #eee; border: 1px solid #888; }
.order-id { font-family: 'Consolas', monospace; color: #666; font-size: 11px; }
.tiny-time { font-size: 10px; color: #888; text-align: right; }

/* Colors */
.green { color: #008000 !important; }
.red { color: #d00000 !important; }
</style>