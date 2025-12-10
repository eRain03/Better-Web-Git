import { Buffer } from 'buffer';

// ----------------------------------------------------------------------
// 1. 基础错误工厂 (Node.js Error Polyfill)
// ----------------------------------------------------------------------
function createError(code: string, message?: string, path?: string) {
  const err: any = new Error(message || code);
  err.code = code;
  if (path) err.path = path;
  // Map common codes to errno for isomorphic-git internals
  const map: Record<string, number> = {
    ENOENT: -2, EIO: -5, EEXIST: -17, ENOTDIR: -20, EISDIR: -21, EINVAL: -22, ENOSYS: -38
  };
  if (map[code]) err.errno = map[code];
  return err;
}

// ----------------------------------------------------------------------
// 2. 核心文件系统操作 (Promise Based)
// ----------------------------------------------------------------------
async function getHandle(root: FileSystemDirectoryHandle, path: string, create = false, isDir = false) {
  if (path === '/' || path === '.' || path === '' || path === './') return root;
  
  // Clean path: remove leading ./ or /
  const cleanPath = path.replace(/^\.\//, '').replace(/^\//, '').replace(/\/$/, '');
  if (cleanPath === '') return root;

  const parts = cleanPath.split('/');
  const name = parts.pop();
  let current: any = root;
  
  // Walk directories
  for (const part of parts) {
    try {
      current = await current.getDirectoryHandle(part, { create });
    } catch (e) {
      throw createError('ENOENT', `path not found: ${path}`, path);
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
    if (create) throw e;
    throw createError('ENOENT', `entry not found: ${path}`, path);
  }
}

// ----------------------------------------------------------------------
// 3. 构造器
// ----------------------------------------------------------------------
export function createWebFS(rootHandle: FileSystemDirectoryHandle) {

  // --- Implementations (Async/Promise) ---

  const readFileOps = async (path: string, options?: any) => {
    try {
      const handle = await getHandle(rootHandle, path, false, false);
      const file = await handle.getFile();
      const buffer = Buffer.from(await file.arrayBuffer());
      if (typeof options === 'string') {
        if (options === 'utf8') return buffer.toString('utf8');
      } else if (options?.encoding === 'utf8') {
        return buffer.toString('utf8');
      }
      return buffer;
    } catch (e: any) {
      if (e.code) throw e;
      throw createError('ENOENT', e.message, path);
    }
  };

  const writeFileOps = async (path: string, data: Uint8Array | string) => {
    const handle = await getHandle(rootHandle, path, true, false);
    const writable = await handle.createWritable();
    await writable.write(data);
    await writable.close();
  };

  const unlinkOps = async (path: string) => {
    const cleanPath = path.replace(/^\.\//, '').replace(/^\//, '');
    const parts = cleanPath.split('/');
    const name = parts.pop();
    if (!name) return; // Root cannot be deleted
    
    // Get parent
    let parent = rootHandle;
    if (parts.length > 0) {
      // Must find parent dir
      parent = await getHandle(rootHandle, parts.join('/'), false, true);
    }
    await parent.removeEntry(name);
  };

  const readdirOps = async (path: string) => {
    const handle = await getHandle(rootHandle, path, false, true);
    const entries = [];
    for await (const [name, ] of handle.entries()) {
      entries.push(name);
    }
    return entries;
  };

  const mkdirOps = async (path: string) => {
    await getHandle(rootHandle, path, true, true);
  };

  const rmdirOps = async (path: string) => {
    await unlinkOps(path);
  };

  const statOps = async (path: string) => {
    let handle: any;
    let isDirectory = false;
    
    // Probe: File or Dir?
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
      throw createError('ENOENT', `stat failed ${path}`, path);
    }

    let size = 0;
    let mtimeMs = Date.now();

    if (!isDirectory) {
      const file = await handle.getFile();
      size = file.size;
      mtimeMs = file.lastModified;
    }

    // Return Node.js Stats like object
    return {
      type: isDirectory ? 'dir' : 'file',
      mode: isDirectory ? 0o40755 : 0o100644,
      size,
      mtimeMs,
      ctimeMs: mtimeMs,
      atimeMs: mtimeMs,
      uid: 0,
      gid: 0,
      dev: 0,
      ino: 0,
      isFile: () => !isDirectory,
      isDirectory: () => isDirectory,
      isSymbolicLink: () => false,
    };
  };

  const lstatOps = statOps; // No symlinks in browser

  const readlinkOps = async () => {
    throw createError('EINVAL', 'readlink not supported');
  };

  const symlinkOps = async () => {
    throw createError('ENOSYS', 'symlink not supported');
  };
  
  const renameOps = async (oldPath: string, newPath: string) => {
    // Basic rename: Read Old -> Write New -> Delete Old
    // (File System Access API move() is pending standard)
    const data = await readFileOps(oldPath);
    await writeFileOps(newPath, data);
    await unlinkOps(oldPath);
  };

  // --- 4. 组装对象 ---
  
  // Promise Interface
  const promises = {
    readFile: readFileOps,
    writeFile: writeFileOps,
    unlink: unlinkOps,
    readdir: readdirOps,
    mkdir: mkdirOps,
    rmdir: rmdirOps,
    stat: statOps,
    lstat: lstatOps,
    readlink: readlinkOps,
    symlink: symlinkOps,
    rename: renameOps
  };

  // Callback Interface (Wrapper)
  // This satisfies isomorphic-git's standard fs checks
  const callbackify = (fn: Function) => (...args: any[]) => {
    const cb = args.pop();
    fn(...args).then((res: any) => cb(null, res)).catch((err: any) => cb(err));
  };

  return {
    promises,
    // Top-level callbacks
    readFile: callbackify(readFileOps),
    writeFile: callbackify(writeFileOps),
    unlink: callbackify(unlinkOps),
    readdir: callbackify(readdirOps),
    mkdir: callbackify(mkdirOps),
    rmdir: callbackify(rmdirOps),
    stat: callbackify(statOps),
    lstat: callbackify(lstatOps),
    readlink: callbackify(readlinkOps),
    symlink: callbackify(symlinkOps),
    rename: callbackify(renameOps),
  };
}
