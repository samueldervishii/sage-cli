import fs from "fs-extra";
import path from "path";
import chalk from "chalk";
import { GoogleGenerativeAI } from "@google/generative-ai";

export class ProjectAI {
  constructor(projectHandler) {
    this.projectHandler = projectHandler;
    this.gemini = null;
    this.model = null;
    this.initializeAI();
  }

  async initializeAI() {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        console.error(
          chalk.red("GEMINI_API_KEY not found. Please run 'sage setup'")
        );
        return;
      }

      this.gemini = new GoogleGenerativeAI(apiKey);
      this.model = this.gemini.getGenerativeModel({
        model: "gemini-2.0-flash",
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 2048,
        },
      });
    } catch (error) {
      console.error(chalk.red("Failed to initialize AI:"), error.message);
    }
  }

  async analyzeProject() {
    if (!this.model || !this.projectHandler.projectContext) {
      return null;
    }

    const context = this.projectHandler.projectContext;
    const prompt = this.buildProjectAnalysisPrompt(context);

    try {
      const result = await this.model.generateContent(prompt);
      const response = result.response;
      return this.formatResponse(response.text());
    } catch (error) {
      console.error(chalk.red("AI analysis failed:"), error.message);
      return null;
    }
  }

  async explainFile(filePath) {
    if (!this.model || !this.projectHandler.projectContext) {
      return null;
    }

    try {
      let absolutePath;
      let foundPath = null;

      if (path.isAbsolute(filePath)) {
        absolutePath = filePath;
      } else {
        absolutePath = path.join(this.projectHandler.currentPath, filePath);
      }

      if (!(await fs.pathExists(absolutePath))) {
        foundPath = await this.projectHandler.findFile(filePath);
        if (foundPath && (await fs.pathExists(foundPath))) {
          absolutePath = foundPath;
        } else {
          return `File not found: ${filePath}\n\nSearched for files containing "${filePath}" but no matches were found.\nTry using the exact filename or check if the file exists in the project.`;
        }
      }

      const fileContent = await fs.readFile(absolutePath, "utf-8");
      const fileExtension = path.extname(absolutePath);
      const relativePath = path.relative(
        this.projectHandler.currentPath,
        absolutePath
      );

      const actualFileName = path.basename(absolutePath);
      const requestedFileName = path.basename(filePath);
      let fileInfo = "";

      if (
        foundPath &&
        actualFileName.toLowerCase() !== requestedFileName.toLowerCase()
      ) {
        fileInfo = `Found file: ${relativePath}\n\n`;
      }

      const prompt = this.buildFileExplanationPrompt(
        relativePath,
        fileContent,
        fileExtension,
        this.projectHandler.projectContext
      );

      const result = await this.model.generateContent(prompt);
      return fileInfo + this.formatResponse(result.response.text());
    } catch (error) {
      console.error(chalk.red("File explanation failed:"), error.message);
      return `Error analyzing file: ${error.message}`;
    }
  }

  async suggestImprovements(scope = "project") {
    if (!this.model || !this.projectHandler.projectContext) {
      return null;
    }

    try {
      let prompt;

      if (scope === "project") {
        prompt = this.buildProjectSuggestionsPrompt(
          this.projectHandler.projectContext
        );
      } else {
        return await this.explainFile(scope);
      }

      const result = await this.model.generateContent(prompt);
      return this.formatResponse(result.response.text());
    } catch (error) {
      console.error(chalk.red("Suggestions failed:"), error.message);
      return null;
    }
  }

  async securityAnalysis() {
    if (!this.model || !this.projectHandler.projectContext) {
      return null;
    }

    try {
      const context = this.projectHandler.projectContext;
      const prompt = this.buildSecurityAnalysisPrompt(context);

      const result = await this.model.generateContent(prompt);
      return this.formatResponse(result.response.text());
    } catch (error) {
      console.error(chalk.red("Security analysis failed:"), error.message);
      return null;
    }
  }

  async answerProjectQuestion(question) {
    if (!this.model || !this.projectHandler.projectContext) {
      return "No project context available. Please ensure you're in a trusted project directory.";
    }

    try {
      const context = this.projectHandler.projectContext;
      const prompt = this.buildQuestionPrompt(question, context);

      const result = await this.model.generateContent(prompt);
      return this.formatResponse(result.response.text());
    } catch (error) {
      console.error(chalk.red("Question answering failed:"), error.message);
      return null;
    }
  }

  buildProjectAnalysisPrompt(context) {
    return `Analyze this software project and provide insights:

PROJECT INFORMATION:
- Name: ${context.name}
- Type: ${context.type}
- Framework: ${context.framework || "None detected"}
- Path: ${context.path}

MAIN FILES:
${context.mainFiles.map(file => `- ${file}`).join("\n")}

CONFIG FILES:
${context.configFiles.map(file => `- ${file}`).join("\n")}

DEPENDENCIES:
${Object.keys(context.dependencies || {})
  .slice(0, 10)
  .map(dep => `- ${dep}`)
  .join("\n")}

PROJECT STRUCTURE:
${this.formatStructureForAI(context.structure, "", 2)}

Please provide:
1. **Project Overview**: What this project does
2. **Architecture**: How it's structured and organized  
3. **Tech Stack**: Technologies and frameworks used
4. **Key Components**: Important files and their purposes
5. **Recommendations**: Suggestions for improvements

Keep the analysis concise but comprehensive.`;
  }

  buildFileExplanationPrompt(filePath, content, extension, context) {
    const truncatedContent =
      content.length > 5000
        ? content.substring(0, 5000) + "\n... (truncated)"
        : content;

    return `Explain this ${extension} file from a ${context.type} ${context.framework ? context.framework : ""} project:

FILE: ${filePath}

PROJECT CONTEXT:
- Type: ${context.type}
- Framework: ${context.framework || "None"}
- Main files: ${context.mainFiles.join(", ")}

FILE CONTENT:
\`\`\`${extension}
${truncatedContent}
\`\`\`

Please explain:
1. **Purpose**: What this file does in the project
2. **Key Functions/Components**: Important parts of the code
3. **Dependencies**: What it imports/uses
4. **Role in Project**: How it fits into the overall architecture
5. **Potential Issues**: Any problems or improvements you notice

Be specific and focus on the most important aspects.`;
  }

  buildProjectSuggestionsPrompt(context) {
    return `Provide improvement suggestions for this ${context.type} project:

PROJECT: ${context.name}
TYPE: ${context.type}
FRAMEWORK: ${context.framework || "None"}

STRUCTURE:
${this.formatStructureForAI(context.structure, "", 2)}

MAIN FILES: ${context.mainFiles.join(", ")}
CONFIG FILES: ${context.configFiles.join(", ")}

Please suggest improvements for:
1. **Code Organization**: File structure and architecture
2. **Performance**: Optimization opportunities  
3. **Security**: Potential vulnerabilities
4. **Best Practices**: Code quality improvements
5. **Tooling**: Missing tools or configurations

Focus on actionable, specific recommendations.`;
  }

  buildSecurityAnalysisPrompt(context) {
    return `Perform a security analysis of this ${context.type} project:

PROJECT: ${context.name}
TYPE: ${context.type}
FRAMEWORK: ${context.framework || "None"}

DEPENDENCIES: ${Object.keys(context.dependencies || {})
      .slice(0, 15)
      .join(", ")}
CONFIG FILES: ${context.configFiles.join(", ")}

Please analyze:
1. **Dependency Vulnerabilities**: Known issues with packages
2. **Configuration Security**: Insecure settings
3. **Common Vulnerabilities**: Based on project type
4. **Best Practices**: Security recommendations
5. **Action Items**: Specific fixes needed

Focus on the most critical security concerns.`;
  }

  buildQuestionPrompt(question, context) {
    return `Answer this question about the current project:

QUESTION: ${question}

PROJECT CONTEXT:
- Name: ${context.name}
- Type: ${context.type}
- Framework: ${context.framework || "None"}
- Main files: ${context.mainFiles.join(", ")}
- Structure: ${Object.keys(context.structure).slice(0, 10).join(", ")}

Please provide a helpful answer based on the project context. If you need to reference specific files, mention them by name. Keep the answer concise but thorough.`;
  }

  formatStructureForAI(structure, prefix = "", maxDepth = 3) {
    if (maxDepth <= 0) return "";

    let result = "";
    let count = 0;

    for (const [name, value] of Object.entries(structure)) {
      if (count >= 20) break;

      result += `${prefix}${name}\n`;

      if (typeof value === "object" && value !== null && value !== "file") {
        result += this.formatStructureForAI(value, prefix + "  ", maxDepth - 1);
      }

      count++;
    }

    return result;
  }

  formatResponse(text) {
    if (!text) return "";

    const formatted = text
      .replace(/\*\*([^*]+)\*\*/g, (_, content) => chalk.cyan.bold(content))
      .replace(
        /\*\*(\d+\.\s+[^*]+):\*\*/g,
        (_, content) => `\n${chalk.yellow.bold(content + ":")}`
      )
      .replace(/\*\*([^*]+):\*\*/g, (_, content) =>
        chalk.yellow.bold(content + ":")
      )
      .replace(/^\s*\*\s+(.+)$/gm, (_, content) => `  • ${content}`)
      .replace(
        /^\s*\*\s+\*\*`([^`]+)`[^*]*\*\*:\s*(.+)$/gm,
        (_, code, desc) => `  • ${chalk.cyan(code)}: ${desc}`
      )
      .replace(/`([^`]+)`/g, (_, code) => chalk.gray(code))
      .replace(
        /^(\d+\.\s+[^:]+):$/gm,
        (_, content) => `\n${chalk.yellow.bold(content + ":")}`
      )
      .replace(/\n{3,}/g, "\n\n")
      .replace(/^[ \t]+/gm, "")
      .trim();

    return formatted;
  }
}

export default ProjectAI;
