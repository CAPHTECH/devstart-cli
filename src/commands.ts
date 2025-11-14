import { spawnSync, type SpawnSyncOptions } from "node:child_process";

export function runCommand(
  command: string,
  args: string[],
  options?: SpawnSyncOptions
): string {
  const spawnOptions: SpawnSyncOptions = {
    encoding: "utf8",
    stdio: "pipe",
    ...options,
  };

  const result = spawnSync(command, args, spawnOptions);

  if (result.status !== 0) {
    const message =
      typeof result.stderr === "string" && result.stderr.length > 0
        ? result.stderr
        : `Command failed: ${command} ${args.join(" ")}`;
    throw new Error(message.trim());
  }

  if (spawnOptions.stdio === "inherit") {
    return "";
  }

  return typeof result.stdout === "string" ? result.stdout.trim() : "";
}

export function tryRunCommand(command: string, args: string[]): string | null {
  try {
    return runCommand(command, args);
  } catch {
    return null;
  }
}
