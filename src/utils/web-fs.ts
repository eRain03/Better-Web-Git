import { Buffer } from 'buffer';

// ----------------------------------------------------------------------
// 辅助函数
// ----------------------------------------------------------------------

function createError(code: string, message?: string) {
  const err: any = new Error(message || code);
  err.code = code;
  if (code === 'ENOENT') err.errno = -2;
  if (code === 'EEXIST') err.errno = -17;
  if (code === 'EISDIR') err.errno = -21;
  if (code === 'EINVAL') err.errno = -22;
  return err;
}

async function getHandle(root: FileSystemDirectoryHandle, path: string, create = false, isDir = false) {
  if (path === '/' || path === '.' || path === '') return root;

  // 移除开头的 ./ 或 /
  const cleanPath = path.replace(/^\.\//, '').replace(/^\//, '');
  if (cleanPath === '') return root;

  const parts = cleanPath.split('/');
  const name = parts.pop(); 
  let current: any = root;
  
  // 遍历父目录
  for (const part of parts) {
    try {
      current = await current.getDirectoryHandle(part, { create });
    } catch (e) {
      throw createError('ENOENT', `Directory not found: ${part} in ${path}`);
    }
  }
  
  if (!name) return current;

  try {
    if (isDir) {
      return await current.getDirectoryHandle(name, { create });
    } else {
      return await current.getFileHandle(name, { create });
    }
  } catch (e) {
    // 只有在明确不创建时才抛错，方便外部捕获进行 retry (比如 stat 探测)
    throw createError('ENOENT', `Entry not found: ${name}`);
  }
}

// ----------------------------------------------------------------------
// 核心适配器
// ----------------------------------------------------------------------

export function createWebFS(rootHandle: FileSystemDirectoryHandle) {
  
  // === 1. 实现核心方法 ===

  const readFile = async (path: string, options?: any) => {
    const handle = await getHandle(rootHandle, path, false, false);
    const file = await handle.getFile();
    const buffer = Buffer.from(await file.arrayBuffer());
    if (typeof options === 'string' || options?.encoding === 'utf8') {
      return buffer.toString('utf8');
    }
    return buffer;
  };

  const writeFile = async (path: string, data: Uint8Array | string) => {
    const handle = await getHandle(rootHandle, path, true, false);
    const writable = await handle.createWritable();
    await writable.write(data);
    await writable.close();
  };

  const unlink = async (path: string) => {
    const cleanPath = path.replace(/^\.\//, '').replace(/^\//, '');
    const parts = cleanPath.split('/');
    const name = parts.pop();
    
    if (!name) return; // 根目录无法删除
    
    // 获取父目录句柄
    let parent = rootHandle;
    if (parts.length > 0) {
      parent = await getHandle(rootHandle, parts.join('/'), false, true);
    }
    await parent.removeEntry(name);
  };

  const readdir = async (path: string) => {
    const handle = await getHandle(rootHandle, path, false, true);
    const entries = [];
    for await (const [name, ] of handle.entries()) {
      entries.push(name);
    }
    return entries;
  };

  const mkdir = async (path: string) => {
    await getHandle(rootHandle, path, true, true);
  };

  const rmdir = async (path: string) => {
    // 复用 unlink 逻辑，FileSystem API 中 removeEntry 通用于文件和文件夹
    await unlink(path);
  };

  const stat = async (path: string) => {
    let handle: any;
    let isDirectory = false;

    // 探测逻辑：先试文件，失败则试目录
    try {
      if (path === '/' || path === '.' || path === '') {
        handle = rootHandle;
        isDirectory = true;
      } else {
        try {
          handle = await getHandle(rootHandle, path, false, false);
        } catch {
          handle = await getHandle(rootHandle, path, false, true);
          isDirectory = true;
        }
      }
    } catch (e) {
      throw createError('ENOENT', path);
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
      isSymbolicLink: () => false,
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
  };

  const lstat = stat; // 浏览器没有软链，lstat = stat

  const readlink = async () => {
    throw createError('EINVAL', 'Not a symbolic link'); 
  };

  const symlink = async () => {
    throw createError('ENOSYS', 'symlink not supported');
  };

  // === 2. 构造混合对象 ===
  // 这里的关键是：fs 对象本身拥有这些方法，同时 fs.promises 也指向 fs (或包含相同方法)
  
  const fs: any = {
    readFile,
    writeFile,
    unlink,
    readdir,
    mkdir,
    rmdir,
    stat,
    lstat,
    readlink,
    symlink,
    chmod: async () => {}, 
  };

  // 这一步解决了 "reading 'bind'" 的问题
  // isomorphic-git 既可以通过 fs.promises.readFile 调用
  // 也可以通过 fs.readFile 调用
  fs.promises = fs;

  return fs;
}
