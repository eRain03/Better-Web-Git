import { Buffer } from 'buffer';

// 递归获取文件/目录句柄的辅助函数
async function getHandle(root: FileSystemDirectoryHandle, path: string, create = false, isDir = false) {
  const parts = path.split('/').filter(p => p !== '.' && p !== '');
  let current: any = root;

  // 遍历到倒数第二层
  for (let i = 0; i < parts.length - 1; i++) {
    current = await current.getDirectoryHandle(parts[i], { create });
  }

  const name = parts[parts.length - 1];
  if (!name) return root; // 根目录

  if (isDir) {
    return current.getDirectoryHandle(name, { create });
  } else {
    return current.getFileHandle(name, { create });
  }
}

// 构造 isomorphic-git 需要的 fs 接口
export function createWebFS(rootHandle: FileSystemDirectoryHandle) {
  return {
    promises: {
      readFile: async (path: string, options?: any) => {
        try {
          const handle = await getHandle(rootHandle, path);
          const file = await handle.getFile();
          const buffer = Buffer.from(await file.arrayBuffer());
          // 支持 utf8 编码返回字符串
          if (typeof options === 'string' || options?.encoding === 'utf8') {
            return buffer.toString('utf8');
          }
          return buffer;
        } catch (e: any) {
          if (e.name === 'NotFoundError') {
             const err: any = new Error('ENOENT');
             err.code = 'ENOENT';
             throw err;
          }
          throw e;
        }
      },
      writeFile: async (path: string, data: Uint8Array | string) => {
        const handle = await getHandle(rootHandle, path, true, false);
        const writable = await handle.createWritable();
        await writable.write(data);
        await writable.close();
      },
      unlink: async (path: string) => {
        const parts = path.split('/').filter(p => p !== '.' && p !== '');
        const name = parts.pop();
        if(!name) return;
        const parentPath = parts.join('/');
        const parentHandle = await getHandle(rootHandle, parentPath, false, true);
        await parentHandle.removeEntry(name);
      },
      readdir: async (path: string) => {
        try {
          const handle = await getHandle(rootHandle, path, false, true);
          const entries = [];
          for await (const [name, ] of handle.entries()) {
            entries.push(name);
          }
          return entries;
        } catch (e: any) {
          if (e.name === 'NotFoundError') {
             const err: any = new Error('ENOENT');
             err.code = 'ENOENT';
             throw err;
          }
          throw e;
        }
      },
      mkdir: async (path: string) => {
        await getHandle(rootHandle, path, true, true);
      },
      stat: async (path: string) => {
        // 简易 stat 实现
        try {
           // 尝试作为文件
           let handle: any;
           let isDirectory = false;
           try {
             handle = await getHandle(rootHandle, path, false, false);
           } catch {
             // 尝试作为目录
             handle = await getHandle(rootHandle, path, false, true);
             isDirectory = true;
           }

           let size = 0;
           let mtimeMs = Date.now();

           if (!isDirectory) {
             const file = await handle.getFile();
             size = file.size;
             mtimeMs = file.lastModified;
           }

           return {
             isFile: () => !isDirectory,
             isDirectory: () => isDirectory,
             size,
             mtimeMs,
             ctimeMs: mtimeMs,
             dev: 0,
             ino: 0,
             mode: isDirectory ? 0o40755 : 0o100644, // 模拟权限模式
             uid: 0,
             gid: 0,
           };
        } catch (e: any) {
          const err: any = new Error('ENOENT');
          err.code = 'ENOENT';
          throw err;
        }
      },
      lstat: async (path: string) => {
          // 在此简化场景下，lstat 与 stat 相同（不处理软链接）
          // 这里的 this 指向 promises 对象，需要正确调用 stat
          // 但由于闭包问题，我们直接递归调用上面的逻辑有点麻烦，
          // 为了简单，我们让 isomorphic-git 使用 stat 即可，它会自动回退
          // 或者在此处抛出未实现，isomorphic-git 可能会报错。
          // 最稳妥是复制 stat 的逻辑：
          return await createWebFS(rootHandle).promises.stat(path);
      }
    }
  };
}