import fs from "fs-extra";
import path from "path";
import os from "os";
import chalk from "chalk";
import inquirer from "inquirer";

export class ProjectHandler {
  constructor() {
    this.currentPath = process.cwd();
    this.projectContext = null;
    this.trustedProjects = [];
    this.settingsPath = path.join(
      os.homedir(),
      ".local",
      "bin",
      "sage-cli",
      "trusted-projects.json"
    );
    this.indexPath = path.join(
      os.homedir(),
      ".local",
      "bin",
      "sage-cli",
      "project-index.json"
    );
    this.loadTrustedProjects();
  }

  async loadTrustedProjects() {
    try {
      if (await fs.pathExists(this.settingsPath)) {
        this.trustedProjects = await fs.readJson(this.settingsPath);
      }
    } catch {
      this.trustedProjects = [];
    }
  }

  async saveTrustedProjects() {
    try {
      await fs.ensureDir(path.dirname(this.settingsPath));
      await fs.writeJson(this.settingsPath, this.trustedProjects, {
        spaces: 2,
      });
    } catch (error) {
      console.error(
        chalk.red("Failed to save trusted projects:"),
        error.message
      );
    }
  }

  isProjectTrusted(projectPath) {
    return this.trustedProjects.some(
      project =>
        project.path === projectPath ||
        projectPath.startsWith(project.path + path.sep)
    );
  }

  async requestProjectAccess(projectPath) {
    const projectName = path.basename(projectPath);
    const title = "Project Access Request";
    const question = "Do you trust this folder?";
    const contentPadding = 4;

    const maxContentLength = Math.max(
      title.length,
      question.length,
      projectPath.length
    );

    const boxWidth = maxContentLength + contentPadding + 2;
    const topBorder = `┌${"─".repeat(boxWidth - 2)}┐`;
    const bottomBorder = `└${"─".repeat(boxWidth - 2)}┘`;

    const leftPadding = 2;
    const titleLine = `│${" ".repeat(leftPadding)}${title}${" ".repeat(boxWidth - leftPadding - title.length - 2)}│`;
    const questionLine = `│${" ".repeat(leftPadding)}${question}${" ".repeat(boxWidth - leftPadding - question.length - 2)}│`;
    const pathLine = `│${" ".repeat(leftPadding)}${projectPath}${" ".repeat(boxWidth - leftPadding - projectPath.length - 2)}│`;

    const emptyLine = `│${" ".repeat(boxWidth - 2)}│`;

    console.log(chalk.cyan(`\n${topBorder}`));
    console.log(chalk.cyan(titleLine));
    console.log(chalk.cyan(emptyLine));
    console.log(chalk.white(questionLine));
    console.log(chalk.gray(pathLine));
    console.log(chalk.cyan(`${bottomBorder}\n`));

    console.log(chalk.yellow("Sage CLI will be able to:"));
    console.log(chalk.gray("   • Read project files"));
    console.log(chalk.gray("   • Analyze code structure"));
    console.log(chalk.gray("   • Send code context to AI"));
    console.log(chalk.gray("   • Execute safe commands in this directory"));
    console.log();

    const { trustProject } = await inquirer.prompt([
      {
        type: "list",
        name: "trustProject",
        message: "Choose an option:",
        choices: [
          { name: "✓ Yes, analyze this project", value: "trust" },
          {
            name: "✓ Yes, trust this and all subdirectories",
            value: "trust_all",
          },
          { name: "✗ No, use basic mode only", value: "basic" },
          { name: "✗ Exit", value: "exit" },
        ],
      },
    ]);

    if (trustProject === "exit") {
      process.exit(0);
    }

    if (trustProject === "trust" || trustProject === "trust_all") {
      const trustPath =
        trustProject === "trust_all" ? path.dirname(projectPath) : projectPath;

      this.trustedProjects.push({
        path: trustPath,
        name: projectName,
        trusted_at: new Date().toISOString(),
        recursive: trustProject === "trust_all",
      });

      await this.saveTrustedProjects();
      console.log(chalk.green(`✓ Project "${projectName}" is now trusted`));
      return true;
    }

    return false;
  }

  async checkProjectAccess(projectPath = null) {
    const targetPath = projectPath || this.currentPath;

    const isProject = await this.detectProject(targetPath);
    if (!isProject) {
      return { hasAccess: true, isProject: false };
    }

    if (this.isProjectTrusted(targetPath)) {
      return { hasAccess: true, isProject: true, trusted: true };
    }

    const hasAccess = await this.requestProjectAccess(targetPath);
    return { hasAccess, isProject: true, trusted: hasAccess };
  }

  async detectProject(projectPath) {
    const indicators = [
      "package.json",
      "requirements.txt",
      "pom.xml",
      "build.gradle",
      "Cargo.toml",
      "go.mod",
      "composer.json",
      ".git",
      "src",
      "lib",
      "index.js",
      "main.py",
      "app.py",
      "Main.java",
    ];

    for (const indicator of indicators) {
      const indicatorPath = path.join(projectPath, indicator);
      if (await fs.pathExists(indicatorPath)) {
        return true;
      }
    }

    return false;
  }

  async analyzeProjectStructure(projectPath = null) {
    const targetPath = projectPath || this.currentPath;

    try {
      const structure = {
        path: targetPath,
        name: path.basename(targetPath),
        type: "unknown",
        framework: null,
        mainFiles: [],
        configFiles: [],
        dependencies: {},
        structure: {},
        analyzed_at: new Date().toISOString(),
      };

      await this.detectProjectType(targetPath, structure);

      await this.scanProjectFiles(targetPath, structure);

      await this.cacheProjectAnalysis(targetPath, structure);

      this.projectContext = structure;
      return structure;
    } catch (error) {
      console.error(chalk.red("Failed to analyze project:"), error.message);
      return null;
    }
  }

  async detectProjectType(projectPath, structure) {
    const packageJsonPath = path.join(projectPath, "package.json");
    if (await fs.pathExists(packageJsonPath)) {
      const packageJson = await fs.readJson(packageJsonPath);
      structure.type = "nodejs";
      structure.dependencies = packageJson.dependencies || {};
      structure.configFiles.push("package.json");

      if (packageJson.dependencies?.react) structure.framework = "React";
      else if (packageJson.dependencies?.next) structure.framework = "Next.js";
      else if (packageJson.dependencies?.vue) structure.framework = "Vue";
      else if (packageJson.dependencies?.express)
        structure.framework = "Express";
      else if (packageJson.dependencies?.["@nestjs/core"])
        structure.framework = "NestJS";
    }

    const requirementsPath = path.join(projectPath, "requirements.txt");
    const pyprojectPath = path.join(projectPath, "pyproject.toml");
    if (
      (await fs.pathExists(requirementsPath)) ||
      (await fs.pathExists(pyprojectPath))
    ) {
      structure.type = "python";
      if (await fs.pathExists(requirementsPath)) {
        structure.configFiles.push("requirements.txt");
      }
      if (await fs.pathExists(pyprojectPath)) {
        structure.configFiles.push("pyproject.toml");
      }

      if (await fs.pathExists(path.join(projectPath, "manage.py"))) {
        structure.framework = "Django";
      } else if (await fs.pathExists(path.join(projectPath, "app.py"))) {
        structure.framework = "Flask";
      }
    }

    const pomPath = path.join(projectPath, "pom.xml");
    const gradlePath = path.join(projectPath, "build.gradle");
    if (await fs.pathExists(pomPath)) {
      structure.type = "java";
      structure.framework = "Maven";
      structure.configFiles.push("pom.xml");
    } else if (await fs.pathExists(gradlePath)) {
      structure.type = "java";
      structure.framework = "Gradle";
      structure.configFiles.push("build.gradle");
    }

    const cargoPath = path.join(projectPath, "Cargo.toml");
    if (await fs.pathExists(cargoPath)) {
      structure.type = "rust";
      structure.configFiles.push("Cargo.toml");
    }

    const goModPath = path.join(projectPath, "go.mod");
    if (await fs.pathExists(goModPath)) {
      structure.type = "go";
      structure.configFiles.push("go.mod");
    }
  }

  async scanProjectFiles(
    projectPath,
    structure,
    maxDepth = 3,
    currentDepth = 0
  ) {
    if (currentDepth >= maxDepth) return;

    try {
      const items = await fs.readdir(projectPath);

      for (const item of items) {
        if (item.startsWith(".") && item !== ".env") continue;
        if (
          ["node_modules", "__pycache__", "target", "dist", "build"].includes(
            item
          )
        )
          continue;

        const itemPath = path.join(projectPath, item);
        const stats = await fs.stat(itemPath);

        if (stats.isDirectory()) {
          structure.structure[item] = {};
          await this.scanProjectFiles(
            itemPath,
            { structure: structure.structure[item] },
            maxDepth,
            currentDepth + 1
          );
        } else {
          if (this.isMainFile(item)) {
            structure.mainFiles.push(path.relative(structure.path, itemPath));
          }
          if (this.isConfigFile(item)) {
            structure.configFiles.push(path.relative(structure.path, itemPath));
          }
          structure.structure[item] = "file";
        }
      }
    } catch (error) {
      // Log errors during directory scan (permissions, symlinks, etc.)
      if (process.env.DEBUG) {
        console.error(
          chalk.gray(`Debug: Error scanning ${projectPath} - ${error.message}`)
        );
      }
    }
  }

  isMainFile(filename) {
    const mainFiles = [
      "index.js",
      "index.ts",
      "main.py",
      "app.py",
      "Main.java",
      "main.go",
      "main.rs",
      "App.jsx",
      "App.tsx",
      "server.js",
    ];
    return mainFiles.includes(filename);
  }

  isConfigFile(filename) {
    const configFiles = [
      "package.json",
      "requirements.txt",
      "pom.xml",
      "build.gradle",
      "Cargo.toml",
      "go.mod",
      ".env",
      "config.js",
      "next.config.js",
      "vite.config.js",
      "webpack.config.js",
      "tsconfig.json",
    ];
    return configFiles.includes(filename);
  }

  async cacheProjectAnalysis(projectPath, analysis) {
    try {
      await fs.ensureDir(path.dirname(this.indexPath));
      let cache = {};

      if (await fs.pathExists(this.indexPath)) {
        cache = await fs.readJson(this.indexPath);
      }

      cache[projectPath] = analysis;
      await fs.writeJson(this.indexPath, cache, { spaces: 2 });
    } catch {
      console.error(chalk.yellow("Warning: Failed to cache project analysis"));
    }
  }

  async findFile(filename) {
    if (!this.projectContext) return null;

    // Try multiple search strategies
    const strategies = [
      () => this.findExactMatch(filename),
      () => this.findPartialMatch(filename),
      () => this.findWithoutExtension(filename),
      () => this.searchInStructure(filename),
    ];

    for (const strategy of strategies) {
      const result = await strategy();
      if (result && (await fs.pathExists(result))) {
        return result;
      }
    }

    return null;
  }

  async findExactMatch(filename) {
    const exactPath = path.join(this.projectContext.path, filename);
    if (await fs.pathExists(exactPath)) {
      return exactPath;
    }
    return null;
  }

  async findPartialMatch(filename) {
    try {
      // Use find command to search for files
      const { spawn } = await import("child_process");
      return new Promise(resolve => {
        const child = spawn(
          "find",
          [this.projectContext.path, "-name", `*${filename}*`, "-type", "f"],
          {
            stdio: ["ignore", "pipe", "ignore"],
          }
        );

        let output = "";
        child.stdout.on("data", data => {
          output += data.toString();
        });

        child.on("close", () => {
          const files = output
            .trim()
            .split("\n")
            .filter(f => f.length > 0);
          if (files.length > 0) {
            const exactMatch = files.find(
              f => path.basename(f).toLowerCase() === filename.toLowerCase()
            );
            resolve(exactMatch || files[0]);
          } else {
            resolve(null);
          }
        });

        child.on("error", () => resolve(null));
      });
    } catch {
      return null;
    }
  }

  async findWithoutExtension(filename) {
    const nameWithoutExt = path.parse(filename).name;
    return this.findPartialMatch(nameWithoutExt);
  }

  searchInStructure(filename) {
    const searchInStructure = (structure, currentPath = "") => {
      for (const [name, value] of Object.entries(structure)) {
        const fullPath = path.join(currentPath, name);

        if (name.toLowerCase().includes(filename.toLowerCase())) {
          return path.join(this.projectContext.path, fullPath);
        }

        if (typeof value === "object" && value !== null && value !== "file") {
          const result = searchInStructure(value, fullPath);
          if (result) return result;
        }
      }
      return null;
    };

    return searchInStructure(this.projectContext.structure);
  }

  getProjectSummary() {
    if (!this.projectContext) return "No project context available";

    const { name, type, framework, mainFiles } = this.projectContext;
    let summary = `Project: ${name}\n`;
    summary += `Type: ${type}${framework ? ` (${framework})` : ""}\n`;

    if (mainFiles.length > 0) {
      summary += `Main files: ${mainFiles.join(", ")}\n`;
    }

    return summary;
  }

  async removeTrustedProject(projectPath) {
    this.trustedProjects = this.trustedProjects.filter(
      p => p.path !== projectPath
    );
    await this.saveTrustedProjects();
  }

  listTrustedProjects() {
    return this.trustedProjects;
  }
}

export default ProjectHandler;
