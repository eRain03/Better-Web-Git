import { Buffer } from 'buffer';

// 辅助：递归获取文件/目录句柄
async function getHandle(root: FileSystemDirectoryHandle, path: string, create = false, isDir = false) {
  // 处理根目录情况
  if (path === '/' || path === '.' || path === '') return root;

  const parts = path.split('/').filter(p => p !== '.' && p !== '');
  let current: any = root;
  
  // 遍历到父目录
  for (let i = 0; i < parts.length - 1; i++) {
    try {
      current = await current.getDirectoryHandle(parts[i], { create });
    } catch (e) {
      throw createError('ENOENT', `Directory not found: ${parts.slice(0, i+1).join('/')}`);
    }
  }
  
  const name = parts[parts.length - 1];
  if (!name) return root; 

  try {
    if (isDir) {
      return await current.getDirectoryHandle(name, { create });
    } else {
      return await current.getFileHandle(name, { create });
    }
  } catch (e) {
    throw createError('ENOENT', `File/Dir not found: ${path}`);
  }
}

// 辅助：创建类似 Node.js 的错误对象
function createError(code: string, message?: string) {
  const err: any = new Error(message || code);
  err.code = code;
  if (code === 'ENOENT') err.errno = -2; // isomorphic-git 经常检查 errno
  return err;
}

// 核心适配器
export function createWebFS(rootHandle: FileSystemDirectoryHandle) {
  
  // 定义核心 stat 逻辑，供 stat 和 lstat 共用
  const statImpl = async (path: string) => {
    try {
      let handle: any;
      let isDirectory = false;
      
      // 先尝试作为目录获取
      try {
        if (path === '/' || path === '.') {
           handle = rootHandle;
           isDirectory = true;
        } else {
           // 这是一个简单的探测逻辑
           // 由于 FileSystem API 不区分获取句柄时的类型，我们必须试错
           try {
             handle = await getHandle(rootHandle, path, false, false); // 试文件
           } catch {
             handle = await getHandle(rootHandle, path, false, true); // 试目录
             isDirectory = true;
           }
        }
      } catch (e) {
        throw createError('ENOENT');
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
        isSymbolicLink: () => false, // 浏览器不支持软链，永远返回 false
        size,
        mtimeMs,
        ctimeMs: mtimeMs,
        atimeMs: mtimeMs,
        dev: 0,
        ino: 0,
        mode: isDirectory ? 0o40755 : 0o100644,
        uid: 0,
        gid: 0,
      };
    } catch (e: any) {
      throw e.code ? e : createError('ENOENT');
    }
  };

  return {
    promises: {
      readFile: async (path: string, options?: any) => {
        const handle = await getHandle(rootHandle, path);
        const file = await handle.getFile();
        const buffer = Buffer.from(await file.arrayBuffer());
        if (typeof options === 'string' || options?.encoding === 'utf8') {
          return buffer.toString('utf8');
        }
        return buffer;
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
        if (!name) return;
        const parentPath = parts.join('/');
        const parentHandle = await getHandle(rootHandle, parentPath, false, true);
        await parentHandle.removeEntry(name);
      },

      readdir: async (path: string) => {
        const handle = await getHandle(rootHandle, path, false, true);
        const entries = [];
        for await (const [name, ] of handle.entries()) {
          entries.push(name);
        }
        return entries;
      },

      mkdir: async (path: string) => {
        await getHandle(rootHandle, path, true, true);
      },

      rmdir: async (path: string) => {
        // 与 unlink 逻辑类似，但在 FS API 中 removeEntry 通用
        const parts = path.split('/').filter(p => p !== '.' && p !== '');
        const name = parts.pop();
        if (!name) return;
        const parentPath = parts.join('/');
        const parentHandle = await getHandle(rootHandle, parentPath, false, true);
        await parentHandle.removeEntry(name);
      },

      stat: statImpl,

      // ▼▼▼ 修复报错的关键：必须实现 lstat 和 readlink ▼▼▼
      
      // 在不支持软链的系统中，lstat 等同于 stat
      lstat: statImpl, 

      // 必须有 readlink，否则 isomorphic-git 会报错
      readlink: async (path: string) => {
        // 因为我们没有软链，任何对 readlink 的调用都应该抛出 EINVAL (不是软链)
        // 或者直接抛出 ENOENT，视 git 内部逻辑而定。
        // 为了安全起见，我们抛出 EINVAL
        throw createError('EINVAL', 'Not a symbolic link');
      },
      
      // 占位符
      symlink: async () => {
        throw createError('ENosys', 'Symbolic links not supported');
      },
      chmod: async () => {}, // 忽略权限修改
    }
  };
}
