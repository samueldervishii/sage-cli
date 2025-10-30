import path from "path";
import os from "os";
import inquirer from "inquirer";
import chalk from "chalk";
import { fileURLToPath } from "url";
import { dirname } from "path";
import ConfigManager from "./config-manager.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class SetupWizard {
  constructor() {
    this.configManager = new ConfigManager();
    this.envPath = path.join(__dirname, "..", ".env");
    this.userEnvPath = path.join(
      os.homedir(),
      ".local",
      "bin",
      "sage-cli",
      ".env"
    );
  }

  async checkConfig() {
    try {
      const config = await this.configManager.loadConfig();
      const hasGeminiKey = !!config.apiKeys?.gemini;
      const hasSerperKey = !!config.apiKeys?.serper;

      return {
        exists: hasGeminiKey || hasSerperKey,
        hasGeminiKey,
        hasSerperKey,
      };
    } catch {
      return {
        exists: false,
        hasGeminiKey: false,
        hasSerperKey: false,
      };
    }
  }

  async showWelcome() {
    console.log(chalk.cyan("\nSage CLI Setup Wizard\n"));
    console.log(
      chalk.gray(
        "This wizard will help you configure API keys for enhanced features.\n"
      )
    );
  }

  async promptForKeys(existing = {}) {
    const questions = [];

    if (!existing.hasGeminiKey) {
      questions.push({
        type: "list",
        name: "primaryProvider",
        message: "Which AI provider would you like to use?",
        choices: [
          {
            name: "Google Gemini (Recommended - Free tier available)",
            value: "gemini",
          },
        ],
        default: "gemini",
      });
    }

    if (!existing.hasGeminiKey) {
      questions.push({
        type: "password",
        name: "geminiKey",
        message: "Enter your Google Gemini API key:",
        mask: "*",
        when: answers => {
          if (existing.hasGeminiKey) return false;
          return (
            answers.primaryProvider === "gemini" ||
            answers.primaryProvider === "both"
          );
        },
        validate: input => {
          if (!input.trim()) {
            return "Please enter a valid Gemini API key";
          }
          return true;
        },
      });
    }

    if (!existing.hasSerperKey) {
      questions.push({
        type: "confirm",
        name: "wantSerper",
        message: "Add Serper API key for web search? (optional)",
        default: false,
      });

      questions.push({
        type: "password",
        name: "serperKey",
        message: "Enter your Serper API key (get free key from serper.dev):",
        mask: "*",
        when: answers => answers.wantSerper,
        validate: input => {
          if (!input.trim()) {
            return 'Please enter a valid Serper API key or choose "no" above';
          }
          return true;
        },
      });
    }

    if (questions.length === 0) {
      return null;
    }

    return await inquirer.prompt(questions);
  }

  async saveConfig(keys) {
    try {
      //const config = await this.configManager.loadConfig();

      if (keys.geminiKey) {
        await this.configManager.setApiKey("gemini", keys.geminiKey);
      }
      if (keys.serperKey) {
        await this.configManager.setApiKey("serper", keys.serperKey);
      }

      if (keys.primaryProvider) {
        await this.configManager.setPreference(
          "defaultModel",
          keys.primaryProvider
        );
      }

      const configInfo = await this.configManager.getConfigInfo();
      return configInfo.configPath;
    } catch (error) {
      console.error(chalk.red("Error saving configuration:"), error.message);
      throw error;
    }
  }

  async showInstructions() {
    console.log(chalk.green("\nSetup complete!\n"));

    console.log(chalk.cyan("Get your API keys:"));
    console.log(
      chalk.gray("  • Gemini API: https://makersuite.google.com/app/apikey")
    );
    console.log(
      chalk.gray("  • Serper API: https://serper.dev/api-key (optional)\n")
    );

    console.log(chalk.cyan("Next steps:"));
    console.log(chalk.gray('  • Run "sage" to start using Sage CLI'));
    console.log(chalk.gray('  • Try "sage chat" for conversational mode'));
    console.log(chalk.gray('  • Use "sage files" for file exploration\n'));

    const configInfo = await this.configManager.getConfigInfo();
    console.log(chalk.yellow("Note: Your secure configuration is stored at:"));
    console.log(chalk.gray(`     ${configInfo.configPath}\n`));
    console.log(
      chalk.dim("Your API keys are encrypted and will persist across updates.")
    );
  }

  async run() {
    try {
      await this.showWelcome();

      const configStatus = await this.checkConfig();

      if (configStatus.exists && configStatus.hasGeminiKey) {
        console.log(chalk.green("Configuration found!"));

        const configInfo = await this.configManager.getConfigInfo();
        console.log(
          chalk.gray(
            `Providers configured: ${Object.entries(configInfo.providers)
              .filter(([_k, v]) => v)
              .map(([k, _v]) => k)
              .join(", ")}`
          )
        );

        if (!configStatus.hasSerperKey) {
          const addSerper = await inquirer.prompt([
            {
              type: "confirm",
              name: "addSerper",
              message: "Add Serper API key for web search?",
              default: false,
            },
          ]);

          if (addSerper.addSerper) {
            const serperAnswer = await inquirer.prompt([
              {
                type: "password",
                name: "serperKey",
                message: "Enter your Serper API key:",
                mask: "*",
              },
            ]);

            if (serperAnswer.serperKey) {
              await this.saveConfig(serperAnswer);
              console.log(chalk.green("Serper API key added!"));
            }
          }
        }

        console.log(chalk.gray('Run "sage" to start using the CLI.\n'));
        return;
      }

      const answers = await this.promptForKeys(configStatus);

      if (answers) {
        const configPath = await this.saveConfig(answers);
        console.log(chalk.green(`Configuration saved to: ${configPath}`));
      }

      await this.showInstructions();
    } catch (error) {
      console.error(chalk.red("\nSetup failed:"), error.message);
      process.exit(1);
    }
  }

  async quickSetup() {
    const hasValidConfig = await this.configManager.hasValidConfig();

    if (!hasValidConfig) {
      console.log(chalk.yellow("\nNo API keys configured!"));
      console.log(
        chalk.gray("Sage CLI needs at least one AI provider key to function.\n")
      );

      const runSetup = await inquirer.prompt([
        {
          type: "confirm",
          name: "runSetup",
          message: "Would you like to run the setup wizard now?",
          default: true,
        },
      ]);

      if (runSetup.runSetup) {
        await this.run();
        return true;
      } else {
        console.log(
          chalk.yellow('\nRun "sage setup" anytime to configure API keys.\n')
        );
        return false;
      }
    }

    return true;
  }
}

export default SetupWizard;
