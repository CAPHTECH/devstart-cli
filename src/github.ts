import { runCommand, tryRunCommand } from "./commands.js";
import type { ListPage, ListType, RepoInfo } from "./types.js";

const PAGE_SIZE = 10;

type GraphqlConnection = {
  nodes: { number: number; title: string }[];
  pageInfo: { hasNextPage: boolean; endCursor: string | null };
};

type GraphqlResponse = {
  data?: {
    repository?: {
      issues?: GraphqlConnection;
      pullRequests?: GraphqlConnection;
    };
  };
  errors?: { message: string }[];
};

export function getRepoInfo(): RepoInfo {
  const slug = runCommand("gh", [
    "repo",
    "view",
    "--json",
    "nameWithOwner",
    "--jq",
    ".nameWithOwner",
  ]);

  const [owner, name] = slug.split("/");
  if (!owner || !name) {
    throw new Error("Failed to resolve repository owner/name.");
  }

  return { owner, name };
}

export function fetchListPage(
  listType: ListType,
  repo: RepoInfo,
  cursor: string | null
): ListPage {
  const query = listType === "issues" ? ISSUE_LIST_QUERY : PR_LIST_QUERY;
  const args = [
    "api",
    "graphql",
    "-f",
    `query=${query}`,
    "-f",
    `owner=${repo.owner}`,
    "-f",
    `name=${repo.name}`,
    "-F",
    `pageSize=${PAGE_SIZE}`,
  ];

  if (cursor) {
    args.push("-f", `cursor=${cursor}`);
  }

  const output = runCommand("gh", args);

  const parsed = JSON.parse(output) as GraphqlResponse;

  if (parsed.errors && parsed.errors.length > 0) {
    const message = parsed.errors.map((err) => err.message).join("; ");
    throw new Error(`GitHub API error: ${message}`);
  }

  const connection = parsed.data?.repository?.[
    listType === "issues" ? "issues" : "pullRequests"
  ];

  if (!connection) {
    throw new Error("Failed to load list data from GitHub API.");
  }

  return {
    items: connection.nodes.map((node) => ({ number: node.number, title: node.title })),
    hasNext: connection.pageInfo.hasNextPage,
    nextCursor: connection.pageInfo.endCursor ?? null,
  };
}

export function describeListType(listType: ListType): string {
  return listType === "issues" ? "issues" : "pull requests";
}

export function tryRunGhJson<T>(args: string[]): T | null {
  const output = tryRunCommand("gh", args);
  if (!output) {
    return null;
  }

  try {
    return JSON.parse(output) as T;
  } catch (error) {
    throw new Error(`gh output parsing failed: ${error}`);
  }
}

const ISSUE_LIST_QUERY = `
  query($owner: String!, $name: String!, $pageSize: Int!, $cursor: String) {
    repository(owner: $owner, name: $name) {
      issues(
        states: OPEN
        first: $pageSize
        after: $cursor
        orderBy: { field: UPDATED_AT, direction: DESC }
      ) {
        nodes {
          number
          title
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
  }
`;

const PR_LIST_QUERY = `
  query($owner: String!, $name: String!, $pageSize: Int!, $cursor: String) {
    repository(owner: $owner, name: $name) {
      pullRequests(
        states: OPEN
        first: $pageSize
        after: $cursor
        orderBy: { field: UPDATED_AT, direction: DESC }
      ) {
        nodes {
          number
          title
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
  }
`;
