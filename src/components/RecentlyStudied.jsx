const ITEMS = [
  { name: "Data Structures & Algorithms", path: "~/github/cs-notes" },
  { name: "Data Structures & Algorithms", path: "~/github/cs-notes" },
  { name: "Data Structures & Algorithms", path: "~/github/cs-notes" },
  { name: "Data Structures & Algorithms", path: "~/github/cs-notes" },
  { name: "Data Structures & Algorithms", path: "~/github/cs-notes" },
  { name: "Data Structures & Algorithms", path: "~/github/cs-notes" },
];

export default function RecentlyStudied() {
  return (
    <div className="flex w-full flex-col gap-1.5 rounded p-px">
      <div className="flex h-9 items-center justify-between border-b border-border-default pb-px">
        <span className="font-sans text-[11px] font-medium leading-[16.5px] text-text-muted">
          Recently Studied
        </span>
        <button className="cursor-pointer font-sans text-[11px] font-medium leading-[16.5px] text-text-secondary transition-colors hover:text-text-primary">
          View all (5)
        </button>
      </div>

      <div className="flex flex-col">
        {ITEMS.map((item, i) => (
          <button
            key={i}
            className="flex cursor-pointer items-center justify-between rounded px-1 py-0.5 transition-colors hover:bg-[#2a2a2e]"
          >
            <span className="font-sans text-[13px] leading-[19.5px] text-text-primary">
              {item.name}
            </span>
            <span className="font-sans text-[11px] leading-[19.5px] text-text-secondary">
              {item.path}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
