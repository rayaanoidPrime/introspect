import { getDefaultReactSlashMenuItems } from "@blocknote/react";
import { customBlockSchema } from "./createCustomBlockSchema";
import { getBlockSchemaFromSpecs } from "@blocknote/core";

const insertCustom = (type, editor) => (editor) => {
  // Block that the text cursor is currently in.
  const currentBlock = editor.getTextCursorPosition().block;

  // New block we want to insert.
  const customBlock = {
    type: type,
  };

  // Inserting the new block after the current one.
  editor.insertBlocks([customBlock], currentBlock);
};

// Custom Slash Menu item which executes the above function.
const analysisItem = {
  name: "Analysis",
  execute: insertCustom("analysis"),
  aliases: ["analysis", "analyze"],
  group: "Data tools",
  icon: <p>x y</p>,
  hint: "Run an analysis on your data.",
};

export const customSlashMenuItemList = [
  ...getDefaultReactSlashMenuItems(getBlockSchemaFromSpecs(customBlockSchema)),
  analysisItem,
];
