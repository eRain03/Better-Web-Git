import { ref, computed } from 'vue';
import git from 'isomorphic-git';
import { createWebFS } from '../utils/web-fs';

export type CommitInfo = {
  oid: string;
  message: string;
  author: string;
  timestamp: number;
};

export type FileStatus = {
  filepath: string;
  status: string; // 'modified' | 'new' | 'deleted' | 'unmodified'
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

  // 初始化仓库连接
  const openRepo = async () => {
    try {
      const handle = await window.showDirectoryPicker();
      repoHandle.value = handle;
      fs.value = createWebFS(handle);
      await refresh();
    } catch (e) {
      console.error('Failed to open repo', e);
    }
  };

  // 刷新所有数据
  const refresh = async () => {
    if (!fs.value) return;
    loading.value = true;
    try {
      // 1. 获取当前分支
      currentBranch.value = await git.currentBranch({ fs: fs.value, dir: '/' }) || 'HEAD';

      // 2. 获取提交历史
      const logs = await git.log({ fs: fs.value, dir: '/', depth: 20, ref: currentBranch.value });
      commits.value = logs.map(l => ({
        oid: l.oid,
        message: l.commit.message,
        author: l.commit.author.name,
        timestamp: l.commit.author.timestamp
      }));

      // 3. 获取文件状态矩阵
      // FILE, HEAD, WORKDIR, STAGE
      const statusMatrix = await git.statusMatrix({ fs: fs.value, dir: '/' });

      const staged: FileStatus[] = [];
      const unstaged: FileStatus[] = [];

      statusMatrix.forEach(row => {
        const [filepath, head, workdir, stage] = row;
        // head: 0(absent), 1(present)
        // workdir: 0(absent), 1(identical), 2(modified)
        // stage: 0(absent), 1(identical), 2(modified), 3(added/modified but uncommitted)

        // 解析逻辑简化版
        if (head === 1 && workdir === 2) {
          unstaged.push({ filepath, status: 'modified', staged: false });
        }
        if (head === 0 && workdir === 2) {
          unstaged.push({ filepath, status: 'new', staged: false });
        }
        if (head === 1 && workdir === 0) {
           unstaged.push({ filepath, status: 'deleted', staged: false });
        }

        // Staged detection (simplified)
        if (stage !== head && stage !== 0) {
           // 注意：isomorphic-git 的 statusMatrix 比较复杂
           // 这里为了演示，我们假设只要 stage 不等于 head 就是有变更在暂存区
           staged.push({ filepath, status: 'staged', staged: true });
        }
      });

      stagedFiles.value = staged;
      unstagedFiles.value = unstaged;

    } catch (e) {
      console.error(e);
    } finally {
      loading.value = false;
    }
  };

  // 添加到暂存区
  const addToStage = async (filepath: string) => {
    if (!fs.value) return;
    await git.add({ fs: fs.value, dir: '/', filepath });
    await refresh();
  };

  // 提交
  const commit = async (message: string) => {
    if (!fs.value) return;
    await git.commit({
      fs: fs.value,
      dir: '/',
      message,
      author: { name: 'Tayen', email: 'tayen@local' } // 可以做成配置项
    });
    await refresh();
  };

  return {
    fs,
    repoHandle,
    openRepo,
    refresh,
    commits,
    stagedFiles,
    unstagedFiles,
    currentBranch,
    addToStage,
    commit,
    loading
  };
}