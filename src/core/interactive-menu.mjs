import chalk from "chalk";
import { displayBanner } from "./banner.mjs";
import { checkForUpdates } from "../utils/github-api.mjs";
import { reloadEnvVars } from "../config/config-handler.mjs";
import SetupWizard from "../config/setup-wizard.mjs";
import SimpleChat from "../chat/simple-chat.mjs";

let globalChatInstance = null;

export async function startInteractiveMode() {
  await displayBanner();
  console.log();

  const setupWizard = new SetupWizard();
  const hasKeys = await setupWizard.quickSetup();
  if (!hasKeys) return;

  await reloadEnvVars();

  try {
    const updateInfo = await checkForUpdates(true);
    if (updateInfo) {
      console.log(
        chalk.yellow("New version available!"),
        chalk.cyan(`v${updateInfo.latest}`)
      );
      console.log(
        chalk.gray(`Run 'sage update' to update from v${updateInfo.current}`)
      );
      console.log();
    }
  } catch (error) {
    if (process.env.DEBUG)
      console.error(
        chalk.gray(`Debug: Update check failed - ${error.message}`)
      );
  }

  try {
    globalChatInstance = new SimpleChat();
    await globalChatInstance.initialize();
  } catch {
    console.log(
      chalk.yellow(
        "Chat functionality unavailable. Run 'sage setup' to configure API keys."
      )
    );
    return;
  }

  // --- REPL-style Chat Mode ---
  const readline = await import("readline");

  // Keep stdin in raw mode for persistent REPL
  if (process.stdin.isTTY && process.stdin.setRawMode) {
    process.stdin.setRawMode(true);
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: true,
  });

  let isProcessing = false;
  let hasExited = false;

  const showPrompt = () => {
    if (!hasExited && !isProcessing) rl.prompt(true);
  };

  rl.on("close", () => {
    const farewells = [
      chalk.magenta("\nThanks for using Sage! Goodbye!"),
      chalk.magenta("\nSee you soon, traveler of code."),
      chalk.magenta("\nGoodbye — may your stack traces be clean."),
      chalk.magenta("\nSage signing off... until next time."),
      chalk.magenta("\nAdios! Keep building something amazing."),
      chalk.magenta("\nSee ya! Remember: stay curious."),
      chalk.magenta("\nFarewell, my human friend."),
      chalk.magenta("\nGoodbye for now — knowledge never sleeps."),
      chalk.magenta("\nSage rests... but wisdom remains."),
      chalk.magenta("\nUntil we meet again... stay sharp."),
    ];

    const randomFarewell =
      farewells[Math.floor(Math.random() * farewells.length)];
    console.log(randomFarewell);
    setTimeout(() => process.exit(0), 120);
  });

  rl.on("line", async input => {
    if (hasExited || isProcessing) return;

    const trimmed = input.trim();

    if (trimmed === ".exit") {
      hasExited = true;
      rl.close();
      return;
    }

    if (!trimmed) {
      showPrompt();
      return;
    }

    isProcessing = true;

    try {
      await handleChatMessage(trimmed);
      console.log();
    } catch (err) {
      console.error(chalk.red("Unexpected error:"), err.message);
      if (process.env.DEBUG) console.error(err.stack);
    } finally {
      isProcessing = false;
      showPrompt();
    }
  });

  rl.on("SIGINT", () => {
    if (!hasExited) {
      hasExited = true;
      rl.close();
    }
  });
  rl.setPrompt(chalk.cyan("> "));
  showPrompt();
}

async function handleChatMessage(message) {
  try {
    if (!globalChatInstance) {
      console.log(
        chalk.red(
          "Chat functionality is not available. Run 'sage setup' to configure API keys."
        )
      );
      return;
    }
    await globalChatInstance.sendSingleMessage(message);
  } catch (error) {
    console.log(chalk.red("Error processing message:"), error.message);
    if (error.message.includes("GEMINI_API_KEY")) {
      console.log(chalk.yellow("Run 'sage setup' to configure your API keys"));
    }
  }
}
