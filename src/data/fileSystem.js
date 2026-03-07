export const FILE_SYSTEM = {
  name: "My Workspace",
  children: [
    {
      name: "College",
      type: "folder",
      children: [
        {
          name: "Y1S2",
          type: "folder",
          children: [
            {
              name: "APPM 1360",
              type: "folder",
              children: [
                {
                  name: "Exam 1",
                  type: "folder",
                  modified: "2 hours ago",
                  children: [
                    { name: "practice-exam.pdf", type: "pdf", size: "1.2 MB", modified: "2 hours ago" },
                    { name: "solutions.pdf", type: "pdf", size: "890 KB", modified: "3 hours ago" },
                  ],
                },
                {
                  name: "Exam 2",
                  type: "folder",
                  modified: "1 day ago",
                  children: [
                    { name: "review-sheet.pdf", type: "pdf", size: "540 KB", modified: "1 day ago" },
                  ],
                },
                { name: "Syllabus.pdf", type: "pdf", size: "31 KB", modified: "3 hours ago" },
                { name: "Textbook.pdf", type: "pdf", size: "892 B", modified: "1 week ago" },
                { name: "Working document", type: "doc", size: "4.2 KB", modified: "2 days ago" },
                { name: ".gitignore", type: "file", size: "245 B", modified: "1 week ago" },
                { name: "vite.config.ts", type: "ts", size: "1.5 KB", modified: "1 week ago" },
              ],
            },
          ],
        },
      ],
    },
  ],
};

export function resolvePathToNode(pathSegments) {
  let node = FILE_SYSTEM;
  for (const seg of pathSegments) {
    const child = node.children?.find((c) => c.name === seg);
    if (!child) return node;
    node = child;
  }
  return node;
}
