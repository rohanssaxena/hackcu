import { supabase, USER_ID } from "./supabase";

const BUCKET = "workspace-files";

/**
 * Fetch all folders for the user and build a nested tree.
 */
export async function fetchFolderTree() {
  const { data: folders } = await supabase
    .from("folders")
    .select("*")
    .eq("user_id", USER_ID)
    .order("sort_order");

  const { data: files } = await supabase
    .from("course_files")
    .select("*, folders(id)")
    .order("filename");

  if (!folders) return { name: "My Workspace", children: [] };

  const folderMap = new Map();
  for (const f of folders) {
    folderMap.set(f.id, {
      id: f.id,
      name: f.name,
      type: "folder",
      modified: formatRelative(f.last_accessed_at || f.updated_at),
      children: [],
    });
  }

  const roots = [];
  for (const f of folders) {
    const node = folderMap.get(f.id);
    if (f.parent_id && folderMap.has(f.parent_id)) {
      folderMap.get(f.parent_id).children.push(node);
    } else if (!f.parent_id) {
      roots.push(node);
    }
  }

  if (files) {
    for (const file of files) {
      const folderId = file.folder_id;
      const node = {
        id: file.id,
        name: file.filename,
        type: mapFileType(file.file_type),
        size: formatBytes(file.file_size_bytes),
        modified: formatRelative(file.uploaded_at),
      };
      if (folderId && folderMap.has(folderId)) {
        folderMap.get(folderId).children.push(node);
      }
    }
  }

  return { name: "My Workspace", children: roots };
}

/**
 * Navigate a tree by path segments (folder names).
 */
export function resolvePathToNode(tree, pathSegments) {
  let node = tree;
  for (const seg of pathSegments) {
    const child = node.children?.find((c) => c.name === seg);
    if (!child) return node;
    node = child;
  }
  return node;
}

/**
 * Resolve a path of folder names to the leaf folder's DB id.
 */
export async function resolveFolderId(pathSegments) {
  if (!pathSegments.length) return null;

  let parentId = null;
  for (const name of pathSegments) {
    const query = supabase
      .from("folders")
      .select("id")
      .eq("user_id", USER_ID)
      .eq("name", name);

    if (parentId) query.eq("parent_id", parentId);
    else query.is("parent_id", null);

    const { data } = await query.maybeSingle();
    if (!data) return null;
    parentId = data.id;
  }
  return parentId;
}

/**
 * Find a course linked to a folder or any of its ancestors.
 */
async function findCourseForFolder(folderId) {
  let currentId = folderId;
  while (currentId) {
    const { data: course } = await supabase
      .from("courses")
      .select("id")
      .eq("folder_id", currentId)
      .limit(1)
      .single();
    if (course) return course.id;

    const { data: folder } = await supabase
      .from("folders")
      .select("parent_id")
      .eq("id", currentId)
      .single();
    currentId = folder?.parent_id || null;
  }
  return null;
}

/**
 * Upload files to Supabase Storage + insert records into course_files.
 * Returns { uploaded: number, errors: string[] }
 */
export async function uploadFiles(files, pathSegments) {
  const folderId = await resolveFolderId(pathSegments);
  if (!folderId) return { uploaded: 0, errors: ["Could not resolve folder"] };

  const courseId = await findCourseForFolder(folderId);
  const storagePath = pathSegments.join("/");
  const results = { uploaded: 0, errors: [] };

  for (const file of files) {
    const filePath = `${USER_ID}/${storagePath}/${file.name}`;

    const { error: storageError } = await supabase.storage
      .from(BUCKET)
      .upload(filePath, file, { upsert: true });

    if (storageError) {
      results.errors.push(`${file.name}: ${storageError.message}`);
      continue;
    }

    const ext = file.name.split(".").pop()?.toLowerCase() || "";
    const fileType = mapExtToDbType(ext);

    const { error: dbError } = await supabase.from("course_files").insert({
      course_id: courseId,
      folder_id: folderId,
      filename: file.name,
      storage_path: filePath,
      file_type: fileType,
      file_size_bytes: file.size,
      mime_type: file.type,
      processed: false,
    });

    if (dbError) {
      results.errors.push(`${file.name}: ${dbError.message}`);
    } else {
      results.uploaded++;
    }
  }

  return results;
}

/**
 * Create a new folder inside the current path.
 */
export async function createFolder(name, pathSegments) {
  const parentId = await resolveFolderId(pathSegments);
  if (!parentId && pathSegments.length > 0) {
    return { error: "Could not resolve parent folder" };
  }

  const { data, error } = await supabase
    .from("folders")
    .insert({
      user_id: USER_ID,
      name,
      parent_id: parentId,
      last_accessed_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) return { error: error.message };
  return { folder: data };
}

/**
 * Get a signed URL for a file by its DB id or by folder path + filename.
 */
export async function getFileUrl(fileId) {
  const { data: file } = await supabase
    .from("course_files")
    .select("storage_path, mime_type, file_type")
    .eq("id", fileId)
    .maybeSingle();

  if (!file) return null;

  const { data } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(file.storage_path, 3600);

  return data?.signedUrl
    ? { url: data.signedUrl, mimeType: file.mime_type, fileType: file.file_type }
    : null;
}

/**
 * Download file content as text (for md, txt, etc.).
 */
export async function getFileText(fileId) {
  const { data: file } = await supabase
    .from("course_files")
    .select("storage_path")
    .eq("id", fileId)
    .maybeSingle();

  if (!file) return null;

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .download(file.storage_path);

  if (error || !data) return null;
  return await data.text();
}

/**
 * Save text content back to storage (overwrite).
 */
export async function saveFileText(fileId, content) {
  const { data: file } = await supabase
    .from("course_files")
    .select("storage_path, mime_type")
    .eq("id", fileId)
    .maybeSingle();

  if (!file) return { error: "File not found" };

  const blob = new Blob([content], { type: file.mime_type || "text/plain" });
  const { error } = await supabase.storage
    .from(BUCKET)
    .update(file.storage_path, blob, { upsert: true });

  if (error) return { error: error.message };

  await supabase
    .from("course_files")
    .update({ file_size_bytes: blob.size })
    .eq("id", fileId);

  return { ok: true };
}

/**
 * Download a file by triggering a browser save dialog.
 */
export async function downloadFile(fileId, filename) {
  const result = await getFileUrl(fileId);
  if (!result?.url) return { error: "Could not get download URL" };

  const a = document.createElement("a");
  a.href = result.url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  return { ok: true };
}

/**
 * Delete a file from storage and the database.
 */
export async function deleteFile(fileId) {
  const { data: file } = await supabase
    .from("course_files")
    .select("storage_path")
    .eq("id", fileId)
    .maybeSingle();

  if (!file) return { error: "File not found" };

  await supabase.storage.from(BUCKET).remove([file.storage_path]);

  const { error } = await supabase
    .from("course_files")
    .delete()
    .eq("id", fileId);

  if (error) return { error: error.message };
  return { ok: true };
}

/**
 * Rename a file (updates filename in the database).
 */
export async function renameFile(fileId, newName) {
  const { error } = await supabase
    .from("course_files")
    .update({ filename: newName })
    .eq("id", fileId);

  if (error) return { error: error.message };
  return { ok: true };
}

// ---- Helpers ----

function formatBytes(bytes) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatRelative(dateStr) {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins} minutes ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} day${days > 1 ? "s" : ""} ago`;
  return `${Math.floor(days / 7)} week${Math.floor(days / 7) > 1 ? "s" : ""} ago`;
}

function mapFileType(dbType) {
  if (!dbType) return "file";
  if (dbType === "pdf") return "pdf";
  if (dbType === "md" || dbType === "docx" || dbType === "txt") return "doc";
  if (dbType === "pptx") return "pptx";
  return "file";
}

function mapExtToDbType(ext) {
  const map = {
    pdf: "pdf",
    pptx: "pptx",
    txt: "txt",
    md: "md",
    docx: "docx",
    png: "png",
    jpg: "jpg",
    jpeg: "jpg",
    other: "other",
  };
  return map[ext] || "other";
}
