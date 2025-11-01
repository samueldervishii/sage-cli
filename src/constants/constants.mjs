export const URLS = {
  GITHUB_API: "https://api.github.com",
  INSTALL_SCRIPT:
    "https://raw.githubusercontent.com/samueldervishii/sage-cli/main/install.sh",
  REPO_URL: "https://github.com/samueldervishii/sage-cli",
};

export const PATHS = {
  PACKAGE: "../../package.json",
  LOGS_DIR: "../../logs",
  HISTORY_FILE: "../../logs/history.json",
  CONFIG_FILE: "../../.sage.json",
  GENERATED_DIR: "../../generated",
  GENERATOR_SCRIPT: "src/generate/generate.mjs",
};

export const TIMEOUTS = {
  GENERATION: 30000,
  NETWORK: 10000,
  GITHUB_API: 5000,
  TERMINAL_COMMAND: 5000,
  MCP_CONNECTION: 10000,
  MCP_INSTALL: 60000,
  GIT_OPERATION: 5000,
};

export const DEFAULTS = {
  VERSION: "0.0.1-beta",
  TEST_HOST: "http://localhost:3000",
};

export const RETRY_LIMITS = {
  MCP_CONNECTION: 2,
  FILESYSTEM_OPERATION: 3,
};

export const BANNER_GRADIENT = [
  "#FF6B6B",
  "#4ECDC4",
  "#45B7D1",
  "#96CEB4",
  "#FFEAA7",
];

// Gradient blocks design
export const BANNER_ASCII = `
 █▓▒░
 ▒▓█▓
 ░▒▓█
`;

export function getQuickCommands() {
  const isWindows = process.platform === "win32";

  if (isWindows) {
    return [
      { name: "System Info", value: "systeminfo" },
      { name: "Current Directory", value: "cd" },
      { name: "Date and Time", value: "echo %date% %time%" },
      { name: "Who Am I", value: "whoami" },
      {
        name: "Disk Usage",
        value: "wmic logicaldisk get size,freespace,caption",
      },
      { name: "List Directory", value: "dir" },
      { name: "Network Test (ping)", value: "ping -n 3 google.com" },
      { name: "Git Status", value: "git status" },
      { name: "Node Version", value: "node --version" },
      { name: "NPM Version", value: "npm --version" },
      { name: "Environment Variables", value: "set" },
      { name: "Back to Terminal Menu", value: "back" },
    ];
  } else {
    return [
      { name: "System Info (uname -a)", value: "uname -a" },
      { name: "Current Directory (pwd)", value: "pwd" },
      { name: "Date and Time (date)", value: "date" },
      { name: "Who Am I (whoami)", value: "whoami" },
      { name: "Disk Usage (df -h)", value: "df -h" },
      { name: "Memory Info (free -h)", value: "free -h" },
      {
        name: "Network Test (ping -c 3 google.com)",
        value: "ping -c 3 google.com",
      },
      { name: "Git Status", value: "git status" },
      { name: "Node Version", value: "node --version" },
      { name: "NPM Version", value: "npm --version" },
      { name: "Back to Terminal Menu", value: "back" },
    ];
  }
}

// Legacy export for compatibility
export const QUICK_COMMANDS = getQuickCommands();
