import { useState, useEffect } from "react";
import { supabase, USER_ID } from "../lib/supabase";

export default function RecentlyStudied() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("study_actions")
        .select("id, action_type, metadata, created_at, courses(title)")
        .eq("user_id", USER_ID)
        .order("created_at", { ascending: false })
        .limit(6);

      if (data) {
        setItems(
          data.map((row) => ({
            id: row.id,
            name: row.metadata?.label || `${row.action_type} session`,
            course: row.courses?.title || "",
          })),
        );
      }
      setLoading(false);
    }
    load();
  }, []);

  return (
    <div className="flex w-full flex-col gap-1.5 rounded p-px">
      <div className="flex h-9 items-center justify-between border-b border-border-default pb-px">
        <span className="font-sans text-[11px] font-medium leading-[16.5px] text-text-muted">
          Recently Studied
        </span>
        <button className="cursor-pointer font-sans text-[11px] font-medium leading-[16.5px] text-text-secondary transition-colors hover:text-text-primary">
          View all ({items.length})
        </button>
      </div>

      <div className="flex flex-col">
        {loading ? (
          <div className="py-2 text-center font-sans text-[11px] text-text-faint">
            Loading…
          </div>
        ) : (
          items.map((item) => (
            <button
              key={item.id}
              className="flex cursor-pointer items-center justify-between rounded px-1 py-0.5 transition-colors hover:bg-[#2a2a2e]"
            >
              <span className="font-sans text-[13px] leading-[19.5px] text-text-primary">
                {item.name}
              </span>
              <span className="font-sans text-[11px] leading-[19.5px] text-text-secondary">
                {item.course}
              </span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
