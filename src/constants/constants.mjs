export const URLS = {
  GITHUB_API: "https://api.github.com",
  INSTALL_SCRIPT:
    "https://raw.githubusercontent.com/samueldervishii/sage-cli/main/install.sh",
  REPO_URL: "https://github.com/samueldervishii/sage-cli",
};

export const PATHS = {
  PACKAGE: "../../package.json",
};

export const TIMEOUTS = {
  NETWORK: 10000,
  GITHUB_API: 5000,
  MCP_CONNECTION: 10000,
  MCP_INSTALL: 60000,
  GIT_OPERATION: 5000,
};

export const DEFAULTS = {
  VERSION: "0.0.1-beta",
  GEMINI_MODEL: "gemini-2.0-flash-exp",
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

// Gradient blocks design (horizontal)
export const BANNER_ASCII = ` █▓▒░▒▓█▓░▒▓█ `;
