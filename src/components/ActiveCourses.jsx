import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { TrendingUp } from "lucide-react";
import { supabase, USER_ID } from "../lib/supabase";

export default function ActiveCourses() {
  const navigate = useNavigate();
  const [folders, setFolders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: folderRows } = await supabase
        .from("folders")
        .select("id, name, last_accessed_at, updated_at")
        .eq("user_id", USER_ID)
        .order("last_accessed_at", { ascending: false, nullsFirst: false })
        .limit(5);

      if (!folderRows) {
        setLoading(false);
        return;
      }

      const enriched = await Promise.all(
        folderRows.map(async (f) => {
          const { count } = await supabase
            .from("course_files")
            .select("*", { count: "exact", head: true })
            .eq("folder_id", f.id);
          const fileCount = count ?? 0;
          return {
            id: f.id,
            name: f.name,
            fileCount,
            status: fileCount > 0 ? "Has content" : "Empty",
          };
        }),
      );

      setFolders(enriched);
      setLoading(false);
    }
    load();
  }, []);

  return (
    <div className="flex w-full flex-col pb-px">
      <div className="flex h-9 items-center gap-2 border-b border-border-default pb-px">
        <TrendingUp className="size-3.5 text-text-muted" />
        <span className="font-sans text-[11px] font-medium leading-[16.5px] text-text-muted">
          Recent Folders
        </span>
      </div>

      <div className="flex flex-col gap-4 pt-4">
        {loading ? (
          <div className="py-2 text-center font-sans text-[11px] text-text-faint">
            Loading…
          </div>
        ) : (
          folders.map((folder) => (
            <button
              key={folder.id}
              onClick={() => navigate(`/course/${folder.id}`)}
              className="flex cursor-pointer flex-col gap-1.5 text-left transition-colors hover:opacity-90"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="size-1.5 rounded-full bg-accent-green" />
                  <span className="font-mono text-[11px] leading-[16.5px] text-text-primary">
                    {folder.name}
                  </span>
                </div>
                <span className="font-sans text-[10px] font-medium leading-[15px] text-accent-green">
                  {folder.status}
                </span>
              </div>

              <div className="flex h-1 w-full overflow-hidden rounded-full bg-bg-elevated">
                <div
                  className="h-full rounded-full bg-accent-blue"
                  style={{ width: `${folder.fileCount > 0 ? 50 : 0}%` }}
                />
              </div>

              <div className="flex items-center justify-between">
                <span className="font-sans text-[10px] leading-[15px] text-text-secondary">
                  {folder.fileCount} file{folder.fileCount !== 1 ? "s" : ""}
                </span>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
