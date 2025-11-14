import readline from "node:readline";

import { fetchListPage, describeListType } from "./github.js";
import type { ListType, RepoInfo } from "./types.js";

export async function selectTicketFromList(
  listType: ListType,
  repo: RepoInfo
): Promise<string | null> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  let cursor: string | null = null;
  let page = 1;

  try {
    while (true) {
      const pageData = fetchListPage(listType, repo, cursor);

      if (pageData.items.length === 0) {
        if (page === 1) {
          console.log(`No open ${describeListType(listType)} found.`);
        } else {
          console.log("No further results.");
        }
        return null;
      }

      console.log(`\nOpen ${describeListType(listType)} (page ${page})`);
      pageData.items.forEach((item, index) => {
        const label = formatSelectionLabel(index);
        console.log(`${label}. #${item.number} ${item.title}`);
      });

      const selectionHint = buildSelectionHint(pageData.items.length);
      const answer = (await promptSelection(
        rl,
        `${selectionHint}, 'n' for next page, 'q' to quit: `
      )).trim();
      const normalized = answer.toLowerCase();

      if (normalized === "q" || normalized === "quit") {
        return null;
      }

      if (normalized === "n" || normalized === "next") {
        if (!pageData.hasNext) {
          console.log("No more pages available.");
          continue;
        }
        cursor = pageData.nextCursor;
        page += 1;
        continue;
      }

      const selectionIndex = resolveSelectionIndex(normalized, pageData.items.length);
      if (selectionIndex === null) {
        console.log("Invalid selection.");
        continue;
      }

      const choice = pageData.items[selectionIndex];
      if (!choice) {
        console.log("Invalid selection.");
        continue;
      }

      console.log(`Selected #${choice.number}`);
      return String(choice.number);
    }
  } finally {
    rl.close();
  }
}

function promptSelection(rl: readline.Interface, promptText: string): Promise<string> {
  return new Promise((resolve) => rl.question(promptText, resolve));
}

function formatSelectionLabel(index: number): number {
  if (index === 9) {
    return 0;
  }
  return index + 1;
}

function buildSelectionHint(count: number): string {
  if (count === 10) {
    return "Select 1-9 or 0 for item 10";
  }
  return `Select 1-${count}`;
}

function resolveSelectionIndex(input: string, count: number): number | null {
  if (!/^[0-9]$/.test(input)) {
    return null;
  }

  const digit = Number(input);
  if (digit === 0) {
    if (count === 10) {
      return 9;
    }
    return null;
  }

  if (digit >= 1 && digit <= Math.min(9, count)) {
    return digit - 1;
  }

  return null;
}
