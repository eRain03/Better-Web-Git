import { ref } from 'vue';
import git from 'isomorphic-git';
import * as Diff from 'diff';
import { createWebFS } from '../utils/web-fs';

export type DiffLine = {
  type: 'added' | 'removed' | 'neutral';
  value: string;
  lineNumOld?: number;
  lineNumNew?: number;
};

export function useDiff() {
  const diffLines = ref<DiffLine[]>([]);
  const loadingDiff = ref(false);

  // 对比 工作区文件 vs HEAD (用于查看未暂存的变更)
  const diffWorkdir = async (fs: any, filepath: string) => {
    loadingDiff.value = true;
    diffLines.value = [];

    try {
      // 1. 读取 HEAD 中的文件内容 (Old)
      let oldContent = '';
      try {
        const { blob } = await git.readBlob({
          fs,
          dir: '/',
          oid: await git.resolveRef({ fs, dir: '/', ref: 'HEAD' }),
          filepath
        });
        oldContent = new TextDecoder().decode(blob);
      } catch (e) {
        // 文件可能是新创建的，HEAD 里没有
        oldContent = '';
      }

      // 2. 读取工作区的文件内容 (New)
      let newContent = '';
      try {
        newContent = await fs.promises.readFile(filepath, { encoding: 'utf8' });
      } catch (e) {
        // 文件可能被删除了
        newContent = '';
      }

      // 3. 计算差异
      computeDiff(oldContent, newContent);

    } catch (e) {
      console.error("Diff error:", e);
    } finally {
      loadingDiff.value = false;
    }
  };

  const computeDiff = (oldText: string, newText: string) => {
    // 使用 diff 库生成差异数组
    const changes = Diff.diffLines(oldText, newText, { newlineIsToken: false });

    const lines: DiffLine[] = [];
    let lineOld = 1;
    let lineNew = 1;

    changes.forEach(part => {
      // 拆分每一行，因为 diffLines 返回的是块
      const partLines = part.value.split('\n');
      if (partLines[partLines.length - 1] === '') partLines.pop(); // 去除末尾空行

      partLines.forEach(line => {
        if (part.added) {
          lines.push({ type: 'added', value: line, lineNumNew: lineNew++ });
        } else if (part.removed) {
          lines.push({ type: 'removed', value: line, lineNumOld: lineOld++ });
        } else {
          lines.push({ type: 'neutral', value: line, lineNumOld: lineOld++, lineNumNew: lineNew++ });
        }
      });
    });

    diffLines.value = lines;
  };

  return {
    diffLines,
    loadingDiff,
    diffWorkdir
  };
}