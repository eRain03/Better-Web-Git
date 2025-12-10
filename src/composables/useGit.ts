import { ref } from 'vue';
import git from 'isomorphic-git';
import http from 'isomorphic-git/http/web';
import { createWebFS } from '../utils/web-fs'; // 确保你保留了之前的 utils/web-fs.ts

export function useGit() {
  const repoHandle = ref<FileSystemDirectoryHandle | null>(null);
  const fs = ref<any>(null);

  // Data States
  const commits = ref<any[]>([]);
  const statusList = ref<any[]>([]); // 合并 staged/unstaged 以便统一处理
  const currentBranch = ref('');

  // UI States
  const loading = ref(false);
  const error = ref<string | null>(null);

  // 初始化仓库
  const openRepo = async () => {
    error.value = null;
    try {
      const handle = await window.showDirectoryPicker();
      repoHandle.value = handle;
      // 关键：立即初始化 FS
      fs.value = createWebFS(handle);

      await refresh();
    } catch (e: any) {
      if (e.name !== 'AbortError') { // 忽略用户取消选择
        error.value = e.message;
        console.error(e);
      }
    }
  };

  // 刷新核心数据
  const refresh = async () => {
    if (!fs.value) return;
    loading.value = true;
    error.value = null;

    try {
      // 1. Get Branch
      currentBranch.value = await git.currentBranch({ fs: fs.value, dir: '/' }) || 'HEAD';

      // 2. Get Logs
      const logs = await git.log({ fs: fs.value, dir: '/', depth: 50, ref: currentBranch.value });
      commits.value = logs.map(l => ({
        oid: l.oid,
        shortOid: l.oid.slice(0, 7),
        message: l.commit.message,
        author: l.commit.author.name,
        email: l.commit.author.email,
        timestamp: new Date(l.commit.author.timestamp * 1000)
      }));

      // 3. Get Status Matrix (一次性获取所有文件状态)
      const matrix = await git.statusMatrix({ fs: fs.value, dir: '/' });

      // 解析状态矩阵
      const list = matrix.map(row => {
        const [filepath, head, workdir, stage] = row;
        // Logic:
        // 0: absent, 1: present, 2: modified
        // stage !== head -> Staged
        // workdir !== stage -> Unstaged changes

        let status = 'unmodified';
        let type = 'neutral';

        if (head === 0 && workdir === 2) { status = 'New'; type = 'added'; }
        else if (head === 1 && workdir === 0) { status = 'Deleted'; type = 'deleted'; }
        else if (head === 1 && workdir === 2) { status = 'Modified'; type = 'modified'; }

        const isStaged = stage !== head && stage !== 0;
        const hasUnstagedChanges = workdir !== stage && workdir !== 0; // Simplified

        // 我们只关心有变动的文件
        if (status === 'unmodified' && !isStaged && !hasUnstagedChanges) return null;

        return { filepath, status, type, isStaged, hasUnstagedChanges };
      }).filter(Boolean); // 过滤掉 null

      statusList.value = list;

    } catch (e: any) {
      error.value = "Failed to refresh repo: " + e.message;
    } finally {
      loading.value = false;
    }
  };

  const addToStage = async (filepath: string) => {
    if (!fs.value) return;
    await git.add({ fs: fs.value, dir: '/', filepath });
    await refresh();
  };

  const commit = async (message: string) => {
    if (!fs.value) return;
    try {
      await git.commit({
        fs: fs.value,
        dir: '/',
        message,
        author: { name: 'Tayen', email: 'user@local' } // 暂用默认
      });
      await refresh();
    } catch (e: any) {
      error.value = e.message;
    }
  };

  return {
    fs, repoHandle, openRepo, refresh,
    commits, statusList, currentBranch,
    addToStage, commit, loading, error
  };
}