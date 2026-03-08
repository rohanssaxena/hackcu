export const tools = [
  {
    name: "list_folders",
    description:
      "List folders for the user. Returns id, name, and parent_id for each. " +
      "Use this to look up a folder by name before operating on it.",
    input_schema: {
      type: "object",
      properties: {
        parent_id: {
          type: "string",
          description:
            "Only return folders whose parent matches this ID. Omit to list root-level folders.",
        },
      },
    },
  },
  {
    name: "create_folder",
    description: "Create a new folder (course container).",
    input_schema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Folder name" },
        parent_id: {
          type: "string",
          description:
            "Parent folder ID. Omit or leave null to create at root level.",
        },
      },
      required: ["name"],
    },
  },
  {
    name: "rename_folder",
    description: "Rename an existing folder.",
    input_schema: {
      type: "object",
      properties: {
        folder_id: { type: "string", description: "ID of the folder to rename" },
        new_name: { type: "string", description: "New name for the folder" },
      },
      required: ["folder_id", "new_name"],
    },
  },
  {
    name: "delete_folder",
    description:
      "Permanently delete a folder and all its contents (files, outlines, learning content).",
    input_schema: {
      type: "object",
      properties: {
        folder_id: { type: "string", description: "ID of the folder to delete" },
      },
      required: ["folder_id"],
    },
  },
  {
    name: "list_files",
    description:
      "List files in a folder. Returns id, filename, file_type, and size for each file.",
    input_schema: {
      type: "object",
      properties: {
        folder_id: {
          type: "string",
          description: "ID of the folder to list files from",
        },
      },
      required: ["folder_id"],
    },
  },
  {
    name: "rename_file",
    description: "Rename a file (updates display name only).",
    input_schema: {
      type: "object",
      properties: {
        file_id: { type: "string", description: "ID of the file to rename" },
        new_filename: { type: "string", description: "New filename" },
      },
      required: ["file_id", "new_filename"],
    },
  },
  {
    name: "delete_file",
    description: "Permanently delete a file from storage and the database.",
    input_schema: {
      type: "object",
      properties: {
        file_id: { type: "string", description: "ID of the file to delete" },
      },
      required: ["file_id"],
    },
  },
  {
    name: "get_folder_status",
    description:
      "Get status of a folder: whether outline and learning content have been generated, " +
      "file count, and folder name. Use this before generating outline or content.",
    input_schema: {
      type: "object",
      properties: {
        folder_id: { type: "string", description: "ID of the folder" },
      },
      required: ["folder_id"],
    },
  },
  {
    name: "generate_outline",
    description:
      "Generate a study outline for a folder. The folder must contain uploaded course files. " +
      "This can take 30-60 seconds.",
    input_schema: {
      type: "object",
      properties: {
        folder_id: { type: "string", description: "ID of the folder" },
      },
      required: ["folder_id"],
    },
  },
  {
    name: "generate_learning_content",
    description:
      "Generate learning content (phases, checkpoints, quizzes) for all content nodes " +
      "in a folder's outline. The folder must already have a generated outline. " +
      "This can take several minutes for large outlines.",
    input_schema: {
      type: "object",
      properties: {
        folder_id: { type: "string", description: "ID of the folder" },
      },
      required: ["folder_id"],
    },
  },
  {
    name: "list_content_nodes",
    description:
      "List content nodes (study units) in a folder's outline. Use this to find content node IDs " +
      "before navigating. Returns id, title, and phase count for each.",
    input_schema: {
      type: "object",
      properties: {
        folder_id: { type: "string", description: "ID of the folder" },
      },
      required: ["folder_id"],
    },
  },
  {
    name: "navigate_to_content_node",
    description:
      "Open the Learn page for a content node. The app will navigate to that content. " +
      "Use list_content_nodes to find content node IDs.",
    input_schema: {
      type: "object",
      properties: {
        content_node_id: { type: "string", description: "ID of the content node" },
      },
      required: ["content_node_id"],
    },
  },
  {
    name: "navigate_to_phase",
    description:
      "Open the Learn page for a content node and scroll to a specific phase. " +
      "phase_index is 1-based (1 = first phase).",
    input_schema: {
      type: "object",
      properties: {
        content_node_id: { type: "string", description: "ID of the content node" },
        phase_index: {
          type: "number",
          description: "Phase number (1-based). 1 = first phase.",
        },
      },
      required: ["content_node_id", "phase_index"],
    },
  },
];
