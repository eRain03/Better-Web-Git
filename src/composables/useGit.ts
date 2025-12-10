import { ref } from 'vue';
import git from 'isomorphic-git';
import http from 'isomorphic-git/http/web'; // 引入 HTTP 插件
import { createWebFS } from '../utils/web-fs';

export type CommitInfo = {
  oid: string;
  message: string;
  author: string;
  timestamp: number;
};

export type FileStatus = {
  filepath: string;
  status: string;
  staged: boolean;
};

export function useGit() {
  const repoHandle = ref<FileSystemDirectoryHandle | null>(null);
  const fs = ref<any>(null);
  const commits = ref<CommitInfo[]>([]);
  const stagedFiles = ref<FileStatus[]>([]);
  const unstagedFiles = ref<FileStatus[]>([]);
  const currentBranch = ref('');
  const loading = ref(false);
  const remoteUrl = ref('');

  // 必须配置 CORS 代理，否则浏览器无法 fetch GitHub
  const corsProxy = 'https://cors.isomorphic-git.org';

  const openRepo = async () => {
    try {
      const handle = await window.showDirectoryPicker();
      repoHandle.value = handle;
      fs.value = createWebFS(handle);
      await refresh();
      // 尝试读取 remote url
      try {
        const remotes = await git.listRemotes({ fs: fs.value, dir: '/' });
        const origin = remotes.find(r => r.remote === 'origin');
        if (origin) remoteUrl.value = origin.url;
      } catch (e) {}
    } catch (e) {
      console.error(e);
    }
  };

  const refresh = async () => {
    if (!fs.value) return;
    loading.value = true;
    try {
      currentBranch.value = await git.currentBranch({ fs: fs.value, dir: '/' }) || 'HEAD';

      // 读取历史
      const logs = await git.log({ fs: fs.value, dir: '/', depth: 20, ref: currentBranch.value });
      commits.value = logs.map(l => ({
        oid: l.oid,
        message: l.commit.message,
        author: l.commit.author.name,
        timestamp: l.commit.author.timestamp
      }));

      // 读取状态 (逻辑同前)
      const statusMatrix = await git.statusMatrix({ fs: fs.value, dir: '/' });
      const staged: FileStatus[] = [];
      const unstaged: FileStatus[] = [];

      statusMatrix.forEach(row => {
        const [filepath, head, workdir, stage] = row;
        if (head === 1 && workdir === 2) unstaged.push({ filepath, status: 'modified', staged: false });
        if (head === 0 && workdir === 2) unstaged.push({ filepath, status: 'new', staged: false });
        if (head === 1 && workdir === 0) unstaged.push({ filepath, status: 'deleted', staged: false });
        if (stage !== head && stage !== 0) staged.push({ filepath, status: 'staged', staged: true });
      });

      stagedFiles.value = staged;
      unstagedFiles.value = unstaged;
    } catch (e) { console.error(e); }
    finally { loading.value = false; }
  };

  const addToStage = async (filepath: string) => {
    if (!fs.value) return;
    await git.add({ fs: fs.value, dir: '/', filepath });
    await refresh();
  };

  const commit = async (message: string, authorName: string, authorEmail: string) => {
    if (!fs.value) return;
    await git.commit({
      fs: fs.value,
      dir: '/',
      message,
      author: { name: authorName, email: authorEmail }
    });
    await refresh();
  };

  // === 新增：PULL ===
  const pull = async (username: string, token: string) => {
    if (!fs.value) return;
    loading.value = true;
    try {
      await git.pull({
        fs: fs.value,
        http,
        dir: '/',
        corsProxy,
        singleBranch: true,
        author: { name: 'user', email: 'user@example.com' }, // Merge 需要 author
        onAuth: () => ({ username: token }), // GitHub Token 认证
      });
      await refresh();
    } catch (e) {
      alert(`Pull Failed: ${e.message}`);
    } finally {
      loading.value = false;
    }
  };

  // === 新增：PUSH ===
  const push = async (username: string, token: string) => {
    if (!fs.value) return;
    loading.value = true;
    try {
      await git.push({
        fs: fs.value,
        http,
        dir: '/',
        corsProxy,
        onAuth: () => ({ username: token }),
      });
      await refresh();
      alert('Push Successful!');
    } catch (e) {
      alert(`Push Failed: ${e.message}`);
    } finally {
      loading.value = false;
    }
  };

  return {
    fs, repoHandle, openRepo, refresh, commits,
    stagedFiles, unstagedFiles, currentBranch, remoteUrl,
    addToStage, commit, pull, push, loading
  };
}