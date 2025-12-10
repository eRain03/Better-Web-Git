import { ref } from 'vue';

export function useGit() {
  // 这些配置可以保存在 localStorage 里，就像 Clash 面板保存连接配置一样
  const kernelUrl = ref('http://127.0.0.1:8888');
  const kernelSecret = ref('tayen-git-secret');

  const repoInfo = ref<any>(null);
  const commits = ref<any[]>([]);
  const stagedFiles = ref<any[]>([]);
  const unstagedFiles = ref<any[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  // 通用的 fetch 包装器，自动带上 Secret
  const api = async (endpoint: string, method = 'GET', body?: any) => {
    const res = await fetch(`${kernelUrl.value}${endpoint}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${kernelSecret.value}` // 发送密钥
      },
      body: body ? JSON.stringify(body) : undefined
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(JSON.parse(errText).detail || res.statusText);
    }
    return res.json();
  };

  const connectRepo = async (path: string) => {
    loading.value = true;
    error.value = null;
    try {
      // 1. 测试连接并切换仓库
      const data = await api('/connect', 'POST', { path });
      repoInfo.value = data;
      // 2. 刷新数据
      await refresh();
    } catch (e: any) {
      error.value = "Kernel Error: " + e.message;
    } finally {
      loading.value = false;
    }
  };

  const refresh = async () => {
    if (!repoInfo.value) return;
    loading.value = true;
    try {
      const [statusData, historyData] = await Promise.all([
        api('/status'),
        api('/history')
      ]);
      stagedFiles.value = statusData.staged;
      unstagedFiles.value = statusData.unstaged;
      commits.value = historyData;
    } catch (e: any) {
      error.value = e.message;
    } finally {
      loading.value = false;
    }
  };

  const addToStage = async (path: string) => {
    await api('/stage', 'POST', { path });
    await refresh();
  };

  const commit = async (message: string) => {
    await api('/commit', 'POST', { message });
    await refresh();
  };

  return {
    repoHandle: repoInfo,
    kernelUrl,      // 暴露给 UI 用于修改
    kernelSecret,   // 暴露给 UI 用于修改
    connectRepo,
    refresh,
    commits,
    stagedFiles,
    unstagedFiles,
    addToStage,
    commit,
    loading,
    error
  };
}