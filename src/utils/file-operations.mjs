import fs from "fs-extra";
import path from "path";
import chalk from "chalk";

class FileOperations {
  /**
   * Read a file from the filesystem
   * @param {string} filePath - Path to the file to read
   * @returns {Promise<{success: boolean, content?: string, error?: string}>}
   */
  async readFile(filePath) {
    try {
      // Resolve to absolute path
      const absolutePath = path.resolve(filePath);

      // Check if file exists
      const exists = await fs.pathExists(absolutePath);
      if (!exists) {
        return {
          success: false,
          error: `File not found: ${filePath}`,
        };
      }

      // Check if it's a file (not a directory)
      const stats = await fs.stat(absolutePath);
      if (!stats.isFile()) {
        return {
          success: false,
          error: `Path is not a file: ${filePath}`,
        };
      }

      // Read file content
      const content = await fs.readFile(absolutePath, "utf-8");

      return {
        success: true,
        content,
        path: absolutePath,
      };
    } catch (error) {
      return {
        success: false,
        error: `Error reading file: ${error.message}`,
      };
    }
  }

  /**
   * Write content to a file
   * @param {string} filePath - Path to the file to write
   * @param {string} content - Content to write to the file
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async writeFile(filePath, content) {
    try {
      // Resolve to absolute path
      const absolutePath = path.resolve(filePath);

      // Ensure directory exists
      await fs.ensureDir(path.dirname(absolutePath));

      // Write file
      await fs.writeFile(absolutePath, content, "utf-8");

      return {
        success: true,
        path: absolutePath,
      };
    } catch (error) {
      return {
        success: false,
        error: `Error writing file: ${error.message}`,
      };
    }
  }

  /**
   * Check if a file path is sensitive (e.g., credentials, env files)
   * @param {string} filePath - Path to check
   * @returns {boolean}
   */
  isSensitiveFile(filePath) {
    const fileName = path.basename(filePath).toLowerCase();
    const sensitivePatterns = [
      /^\.env/,
      /credentials/,
      /secret/,
      /password/,
      /private.*key/,
      /^id_rsa/,
      /\.pem$/,
      /\.key$/,
    ];

    return sensitivePatterns.some(pattern => pattern.test(fileName));
  }

  /**
   * Search for files matching a pattern
   * @param {string} pattern - File name or pattern to search for
   * @param {string} searchDir - Directory to search in (defaults to cwd)
   * @returns {Promise<{success: boolean, files?: string[], error?: string}>}
   */
  async searchFiles(pattern, searchDir = process.cwd()) {
    try {
      const { glob } = await import("glob");

      // If pattern is just a filename, search for it anywhere
      const searchPattern = pattern.includes("/") ? pattern : `**/${pattern}`;

      const files = await glob(searchPattern, {
        cwd: searchDir,
        nodir: true,
        ignore: [
          "**/node_modules/**",
          "**/.git/**",
          "**/dist/**",
          "**/build/**",
        ],
        maxDepth: 5,
      });

      return {
        success: true,
        files: files.slice(0, 20), // Limit to 20 results
      };
    } catch (error) {
      return {
        success: false,
        error: `Error searching for files: ${error.message}`,
      };
    }
  }

  /**
   * Format file content for display
   * @param {string} filePath - Path to the file
   * @param {string} content - File content
   * @param {number} maxLines - Maximum lines to display
   * @returns {string}
   */
  formatFilePreview(filePath, content, maxLines = 50) {
    const lines = content.split("\n");
    const fileName = path.basename(filePath);
    const truncated = lines.length > maxLines;
    const displayLines = truncated ? lines.slice(0, maxLines) : lines;

    let preview = chalk.gray(`\n┌─ ${fileName} (${lines.length} lines)\n`);
    displayLines.forEach((line, i) => {
      const lineNum = String(i + 1).padStart(4, " ");
      preview +=
        chalk.gray("│ ") +
        chalk.yellow(lineNum) +
        chalk.gray(" │ ") +
        line +
        "\n";
    });

    if (truncated) {
      preview += chalk.gray(`│ ... (${lines.length - maxLines} more lines)\n`);
    }

    preview += chalk.gray("└─");

    return preview;
  }
}

export default FileOperations;
