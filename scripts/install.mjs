#!/usr/bin/env node
// HiAPI Seedream 5.0 Pro Skill installer.
// Run with: npx github:HiAPIAI/hiapi-seedream-5-0-pro-skill -y
// Flags: -y / --yes, --target=<dir>, --codex, --claude, --skills-dir=<dir>
import { cpSync, existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { stdin, stdout, exit, env, argv } from 'node:process';
import { pathToFileURL } from 'node:url';
import readline from 'node:readline/promises';

export const SKILL_FOLDER = 'hiapi-seedream-5-0-pro';
export const LEGACY_SKILL_FOLDERS = ['hiapi-seedream-5-pro'];
export const REPO_URL = 'https://github.com/HiAPIAI/hiapi-seedream-5-0-pro-skill.git';
const DISPLAY_NAME = 'HiAPI Seedream 5.0 Pro Skill';
const MODEL_PAGE = 'https://www.hiapi.ai/en/models/seedream-5.0-pro-text-to-image';
const API_KEY_PAGE = 'https://www.hiapi.ai/en/dashboard/api-keys';

const argList = argv.slice(2);
const yes = argList.includes('-y') || argList.includes('--yes') || !stdin.isTTY;

function flagValue(name) {
  const prefix = `--${name}=`;
  const hit = argList.find((a) => a.startsWith(prefix));
  return hit ? hit.slice(prefix.length).replace(/^~(?=$|\/)/, homedir()) : null;
}

const explicitTarget =
  flagValue('target') ?? flagValue('skills-dir') ?? null;
const forceCodex = argList.includes('--codex');
const forceClaude = argList.includes('--claude');

function detectCandidates() {
  const list = [];
  const codexHome = env.CODEX_HOME || join(homedir(), '.codex');
  if (existsSync(codexHome)) {
    list.push({ label: 'Codex', dir: join(codexHome, 'skills') });
  }
  const claudeHome = join(homedir(), '.claude');
  if (existsSync(claudeHome)) {
    list.push({ label: 'Claude Code', dir: join(claudeHome, 'skills') });
  }
  return list;
}

async function resolveTargets() {
  if (explicitTarget) {
    return [{ label: 'explicit', dir: explicitTarget }];
  }
  if (env.AGENT_SKILLS_DIR) {
    return [{ label: '$AGENT_SKILLS_DIR', dir: env.AGENT_SKILLS_DIR }];
  }
  const detected = detectCandidates();
  if (forceCodex) {
    const hit = detected.find((c) => c.label === 'Codex');
    return hit ? [hit] : [{ label: 'Codex', dir: join(env.CODEX_HOME || join(homedir(), '.codex'), 'skills') }];
  }
  if (forceClaude) {
    const hit = detected.find((c) => c.label === 'Claude Code');
    return hit ? [hit] : [{ label: 'Claude Code', dir: join(homedir(), '.claude', 'skills') }];
  }
  if (detected.length === 0) {
    console.error(`[${DISPLAY_NAME}] No agent skills directory detected.`);
    console.error('Pass one of:');
    console.error('  --codex                         install to ~/.codex/skills');
    console.error('  --claude                        install to ~/.claude/skills');
    console.error('  --target=/path/to/skills        install to a custom dir');
    console.error('  AGENT_SKILLS_DIR=/path npx ...  same via env var');
    exit(1);
  }
  if (detected.length === 1) return detected;
  if (yes) {
    console.log(
      `[${DISPLAY_NAME}] Multiple agents detected — installing to all: ${detected.map((c) => c.label).join(', ')}.`,
    );
    return detected;
  }
  console.log('Detected agent skill directories:');
  detected.forEach((c, i) => console.log(`  ${i + 1}) ${c.label} → ${c.dir}`));
  console.log('  a) all');
  const rl = readline.createInterface({ input: stdin, output: stdout });
  const ans = (await rl.question('Choose [1-N / a]: ')).trim().toLowerCase();
  rl.close();
  if (ans === 'a' || ans === 'all') return detected;
  const idx = Number.parseInt(ans, 10);
  if (Number.isFinite(idx) && idx >= 1 && idx <= detected.length) {
    return [detected[idx - 1]];
  }
  console.error('Invalid choice.');
  exit(1);
}

function ensureGit() {
  try {
    execFileSync('git', ['--version'], { stdio: 'ignore' });
  } catch {
    console.error(`[${DISPLAY_NAME}] git is required but not found on PATH.`);
    exit(1);
  }
}

function moveDirectory(source, destination) {
  try {
    renameSync(source, destination);
  } catch (error) {
    if (error?.code !== 'EXDEV') throw error;
    cpSync(source, destination, { recursive: true, errorOnExist: true });
    rmSync(source, { recursive: true, force: true });
  }
}

export function backupExistingSkill(target, folder, { homeDir = homedir(), now = Date.now } = {}) {
  const source = join(target.dir, folder);
  if (!existsSync(source)) return null;

  const backupRoot = join(homeDir, '.cache', 'hiapi-skill-backup');
  mkdirSync(backupRoot, { recursive: true });
  const agentTag = String(target.label || 'agent').replace(/[^a-z0-9_.-]+/gi, '-').toLowerCase();
  const timestamp = typeof now === 'function' ? now() : now;
  const backup = join(backupRoot, `${folder}.${agentTag}.bak.${timestamp}`);
  const envPath = join(source, '.env');
  const envContent = existsSync(envPath) ? readFileSync(envPath) : null;

  console.log(`[${DISPLAY_NAME}] Backing up ${source} -> ${backup}`);
  moveDirectory(source, backup);

  return { source, backup, envContent };
}

export function stageInstall(
  target,
  { repoUrl = REPO_URL, execFileImpl = execFileSync, suffix = `${process.pid}-${Date.now()}` } = {},
) {
  mkdirSync(target.dir, { recursive: true });
  const destination = join(target.dir, SKILL_FOLDER);
  const staging = join(target.dir, `.${SKILL_FOLDER}.staging-${suffix}`);
  if (existsSync(staging)) {
    throw new Error(`Installer staging path already exists: ${staging}`);
  }

  console.log(`[${DISPLAY_NAME}] Staging ${target.label} installation in ${staging} ...`);
  try {
    execFileImpl('git', ['clone', '--depth', '1', repoUrl, staging], { stdio: 'inherit' });
    if (!existsSync(join(staging, 'SKILL.md'))) {
      throw new Error(`Cloned repository does not contain SKILL.md: ${repoUrl}`);
    }
  } catch (error) {
    rmSync(staging, { recursive: true, force: true });
    throw error;
  }

  return {
    target,
    destination,
    staging,
    backups: [],
    preservedEnv: null,
    activated: false,
  };
}

export function activateInstall(state, { homeDir = homedir(), now = Date.now } = {}) {
  for (const folder of [SKILL_FOLDER, ...LEGACY_SKILL_FOLDERS]) {
    const backup = backupExistingSkill(state.target, folder, { homeDir, now });
    if (!backup) continue;
    state.backups.push(backup);
    if (state.preservedEnv === null && backup.envContent !== null) {
      state.preservedEnv = backup.envContent;
    }
  }

  console.log(`[${DISPLAY_NAME}] Activating ${state.destination} ...`);
  moveDirectory(state.staging, state.destination);
  state.activated = true;

  if (state.preservedEnv !== null) {
    writeFileSync(join(state.destination, '.env'), state.preservedEnv, { mode: 0o600 });
    console.log(`[${DISPLAY_NAME}] Preserved existing .env in the new installation.`);
  }

  return state;
}

export function rollbackInstall(state) {
  try {
    if (state.activated && existsSync(state.destination)) {
      rmSync(state.destination, { recursive: true, force: true });
    }
    if (existsSync(state.staging)) {
      rmSync(state.staging, { recursive: true, force: true });
    }
    for (const backup of [...state.backups].reverse()) {
      if (existsSync(backup.backup)) moveDirectory(backup.backup, backup.source);
    }
  } catch (error) {
    console.error(`[${DISPLAY_NAME}] Rollback failed: ${error?.message ?? error}`);
  }
}

export function installTargets(targets, options = {}) {
  const states = [];
  try {
    for (let index = 0; index < targets.length; index += 1) {
      states.push(stageInstall(targets[index], { ...options, suffix: `${process.pid}-${Date.now()}-${index}` }));
    }
    for (const state of states) activateInstall(state, options);
    return states;
  } catch (error) {
    for (const state of [...states].reverse()) rollbackInstall(state);
    throw error;
  }
}

function reportApiKey() {
  if (env.HIAPI_API_KEY) {
    console.log(`[${DISPLAY_NAME}] HIAPI_API_KEY is set.`);
    return;
  }
  console.log('');
  console.log(`[${DISPLAY_NAME}] HIAPI_API_KEY is not set yet.`);
  console.log(`  Get a key: ${API_KEY_PAGE}`);
  console.log('  Then: export HIAPI_API_KEY="your_key_here"');
}

export async function main() {
  ensureGit();
  const targets = await resolveTargets();
  installTargets(targets);
  reportApiKey();
  console.log('');
  console.log(`[${DISPLAY_NAME}] Done. Restart your agent if it caches skills.`);
  console.log(`Model page: ${MODEL_PAGE}`);
}

const isDirectRun = argv[1] && import.meta.url === pathToFileURL(resolve(argv[1])).href;
if (isDirectRun) {
  main().catch((err) => {
    console.error(`[${DISPLAY_NAME}] Failed:`, err?.message ?? err);
    exit(1);
  });
}
