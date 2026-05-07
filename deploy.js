import { existsSync, readdirSync, rmSync, statSync, cpSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const PROD_BRANCH = "prod";
const DIST_DIR = "dist";
const WORKTREE_DIR = ".deploy_prod_worktree";

function run(command, args, options = {}) {
  const printable = `${command} ${args.join(" ")}`;
  console.log(`\n> ${printable}`);

  const isNpm = command === "npm";
  const executable = isNpm && process.env.npm_execpath ? process.execPath : command;
  const executableArgs = isNpm && process.env.npm_execpath ? [process.env.npm_execpath, ...args] : args;
  const result = spawnSync(executable, executableArgs, {
    stdio: "inherit",
    ...options,
  });

  if (result.status !== 0) {
    throw new Error(`Command failed: ${printable}`);
  }
}

function runCapture(command, args, options = {}) {
  const isNpm = command === "npm";
  const executable = isNpm && process.env.npm_execpath ? process.execPath : command;
  const executableArgs = isNpm && process.env.npm_execpath ? [process.env.npm_execpath, ...args] : args;
  const result = spawnSync(executable, executableArgs, {
    encoding: "utf-8",
    ...options,
  });

  return {
    ok: result.status === 0,
    stdout: (result.stdout || "").trim(),
    stderr: (result.stderr || "").trim(),
    status: result.status,
  };
}

function ensureGitRepo() {
  const probe = runCapture("git", ["rev-parse", "--is-inside-work-tree"]);
  if (!probe.ok || probe.stdout !== "true") {
    throw new Error("Current directory is not a git repository.");
  }
}

function removePathIfExists(path) {
  if (existsSync(path)) {
    rmSync(path, { recursive: true, force: true });
  }
}

function clearWorktreeFiles(worktreePath) {
  const entries = readdirSync(worktreePath);
  for (const entry of entries) {
    if (entry === ".git") {
      continue;
    }
    rmSync(join(worktreePath, entry), { recursive: true, force: true });
  }
}

function copyDistToWorktree(repoRoot, worktreePath) {
  const distPath = join(repoRoot, DIST_DIR);

  if (!existsSync(distPath) || !statSync(distPath).isDirectory()) {
    throw new Error(`Build output not found: ${DIST_DIR}`);
  }

  const files = readdirSync(distPath);
  for (const entry of files) {
    const source = join(distPath, entry);
    const target = join(worktreePath, entry);
    cpSync(source, target, { recursive: true });
  }

  // Prevents GitHub Pages from ignoring files/directories that start with "_".
  writeFileSync(join(worktreePath, ".nojekyll"), "");
}

function hasChanges(cwd) {
  const status = runCapture("git", ["status", "--porcelain"], { cwd });
  return status.ok && status.stdout.length > 0;
}

function main() {
  const repoRoot = process.cwd();
  const worktreePath = resolve(repoRoot, WORKTREE_DIR);
  let worktreeCreated = false;

  try {
    ensureGitRepo();

    console.log("1) Building project on current branch...");
    run("npm", ["run", "build"]);

    console.log(`2) Preparing '${PROD_BRANCH}' branch in isolated worktree...`);
    const fetchResult = runCapture("git", ["fetch", "origin", PROD_BRANCH]);
    const missingRemoteBranch = fetchResult.stderr.includes(`couldn't find remote ref ${PROD_BRANCH}`);
    if (!fetchResult.ok && !missingRemoteBranch) {
      throw new Error(`Failed to fetch origin/${PROD_BRANCH}: ${fetchResult.stderr || "unknown error"}`);
    }
    if (!fetchResult.ok && missingRemoteBranch) {
      console.log(`'origin/${PROD_BRANCH}' not found yet. First deploy will create it.`);
    }

    removePathIfExists(worktreePath);

    const localBranch = runCapture("git", ["show-ref", "--verify", "--quiet", `refs/heads/${PROD_BRANCH}`]);
    const remoteBranch = runCapture("git", ["show-ref", "--verify", "--quiet", `refs/remotes/origin/${PROD_BRANCH}`]);

    // Always prefer origin/<branch> as base when it exists.
    // This prevents non-fast-forward push errors when local branch is stale.
    if (remoteBranch.ok) {
      run("git", ["worktree", "add", "--force", "-B", PROD_BRANCH, worktreePath, `origin/${PROD_BRANCH}`]);
    } else if (localBranch.ok) {
      run("git", ["worktree", "add", "--force", worktreePath, PROD_BRANCH]);
    } else {
      // Create first prod deploy on an orphan branch so no source files/history leak in.
      run("git", ["worktree", "add", "--force", "--detach", worktreePath, "HEAD"]);
      run("git", ["checkout", "--orphan", PROD_BRANCH], { cwd: worktreePath });
      run("git", ["reset"], { cwd: worktreePath });
    }
    worktreeCreated = true;

    console.log(`3) Replacing '${PROD_BRANCH}' branch contents with '${DIST_DIR}' output...`);
    clearWorktreeFiles(worktreePath);
    copyDistToWorktree(repoRoot, worktreePath);

    run("git", ["add", "-A"], { cwd: worktreePath });

    if (!hasChanges(worktreePath)) {
      console.log("\nNo changes to deploy. Branch is already up to date.");
      return;
    }

    run("git", ["commit", "-m", "Deploy static site"], { cwd: worktreePath });
    run("git", ["push", "-u", "origin", PROD_BRANCH], { cwd: worktreePath });

    console.log("\nDeploy completed successfully.");
  } finally {
    if (worktreeCreated) {
      try {
        run("git", ["worktree", "remove", "--force", worktreePath]);
      } catch (error) {
        console.warn(`Could not remove temporary worktree: ${String(error)}`);
      }
    }
  }
}

main();
