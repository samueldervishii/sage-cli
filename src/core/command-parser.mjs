import chalk from "chalk";
import { showVersion } from "./banner.mjs";
import { performUpdate } from "../utils/github-api.mjs";
import { startInteractiveMode } from "./interactive-menu.mjs";
import { reloadEnvVars } from "../config/config-handler.mjs";
import SetupWizard from "../config/setup-wizard.mjs";
import ConversationHistory from "../utils/conversation-history.mjs";

export async function parseAndExecuteCommand(args) {
  if (args.length === 0) {
    return await startInteractiveMode();
  }

  const command = args[0];

  switch (command) {
    case "--version":
    case "-v":
      await showVersion();
      process.exit(0);
      break;

    case "update":
      await performUpdate();
      process.exit(0);
      break;

    case "setup": {
      const setupWizard = new SetupWizard();
      await setupWizard.run();
      await reloadEnvVars();
      process.exit(0);
      break;
    }

    case "history": {
      const subCommand = args[1] || "list";
      const history = new ConversationHistory();
      await history.init();

      try {
        switch (subCommand) {
          case "list": {
            const conversations = await history.listConversations();
            if (conversations.length === 0) {
              console.log(chalk.yellow("No conversation history found."));
            } else {
              console.log(chalk.bold.cyan("\nConversation History:\n"));
              console.log(
                chalk.gray(
                  "Use 'sage history show <ID>' to view a conversation\n"
                )
              );
              conversations.forEach((conv, index) => {
                const date = new Date(conv.startedAt).toLocaleString();
                const preview = conv.firstUserMessage.replace(/\n/g, " ");

                console.log(
                  chalk.gray(`${index + 1}.`),
                  chalk.bold.white("ID:"),
                  chalk.bold.cyan(conv.id)
                );
                console.log("   ", chalk.gray("Date:"), chalk.white(date));
                console.log(
                  "   ",
                  chalk.gray("Preview:"),
                  chalk.white(
                    preview.substring(0, 50) +
                      (preview.length > 50 ? "..." : "")
                  )
                );
                console.log(
                  "   ",
                  chalk.gray("Messages:"),
                  chalk.white(conv.messageCount)
                );
                console.log();
              });
              console.log(chalk.gray("─".repeat(60)));
              console.log(
                chalk.gray(
                  `\nShowing ${conversations.length} most recent conversation(s)`
                )
              );
              console.log();
            }
            break;
          }

          case "show": {
            const id = args[2];
            if (!id) {
              console.log(chalk.red("Error: Please provide a conversation ID"));
              console.log(
                chalk.gray("Usage: sage history show <conversation-id>")
              );
              process.exit(1);
            }

            const conversation = await history.loadConversation(id);
            console.log(
              chalk.bold.cyan(`\nConversation: ${conversation.id}\n`)
            );
            console.log(
              chalk.gray(
                `Started: ${new Date(conversation.startedAt).toLocaleString()}`
              )
            );
            console.log(
              chalk.gray(`Messages: ${conversation.messages.length}\n`)
            );

            for (const msg of conversation.messages) {
              const time = new Date(msg.timestamp).toLocaleTimeString();

              if (msg.role === "user") {
                console.log(chalk.bold.blue(`\n> You (${time}):`));
                console.log(chalk.white(msg.content));
              } else if (msg.role === "model") {
                console.log(chalk.bold.green(`\n> Sage (${time}):`));
                console.log(chalk.white(msg.content));

                if (msg.searchUsed) {
                  console.log(chalk.gray("   [Web search was used]"));
                }
                if (msg.functionCalls && msg.functionCalls.length > 0) {
                  console.log(
                    chalk.gray(
                      `   [Functions: ${msg.functionCalls.join(", ")}]`
                    )
                  );
                }
              }
            }
            console.log();
            break;
          }

          case "export": {
            const id = args[2];
            if (!id) {
              console.log(chalk.red("Error: Please provide a conversation ID"));
              console.log(
                chalk.gray("Usage: sage history export <conversation-id>")
              );
              process.exit(1);
            }

            const markdown = await history.exportToMarkdown(id);
            const filename = `conversation-${id}.md`;
            const fs = await import("fs-extra");
            await fs.writeFile(filename, markdown);
            console.log(
              chalk.green(`\n✓ Exported to ${chalk.bold(filename)}\n`)
            );
            break;
          }

          case "clean": {
            console.log(
              chalk.yellow(
                "\nWarning: This will delete ALL conversation history!"
              )
            );
            const readline = await import("readline");
            const rl = readline.createInterface({
              input: process.stdin,
              output: process.stdout,
            });

            const answer = await new Promise(resolve => {
              rl.question(chalk.cyan("Are you sure? (yes/no): "), resolve);
            });
            rl.close();

            if (answer.toLowerCase() === "yes") {
              const count = await history.cleanAll();
              console.log(
                chalk.green(`\n✓ Deleted ${count} conversation(s)\n`)
              );
            } else {
              console.log(chalk.gray("\nCancelled.\n"));
            }
            break;
          }

          case "info": {
            const info = await history.getStorageInfo();
            console.log(chalk.bold.cyan("\nStorage Information:\n"));
            console.log(chalk.gray("Directory:"), chalk.white(info.directory));
            console.log(
              chalk.gray("Conversations:"),
              chalk.white(info.conversationCount)
            );
            console.log(
              chalk.gray("Total Size:"),
              chalk.white(`${info.totalSizeMB} MB`)
            );
            console.log();
            break;
          }

          default:
            console.log(
              chalk.yellow(`Unknown history command: '${subCommand}'`)
            );
            console.log(chalk.gray("\nAvailable commands:"));
            console.log(
              chalk.gray("  sage history list           - List conversations")
            );
            console.log(
              chalk.gray("  sage history show <id>      - Show conversation")
            );
            console.log(
              chalk.gray("  sage history export <id>    - Export to markdown")
            );
            console.log(
              chalk.gray("  sage history clean          - Delete all history")
            );
            console.log(
              chalk.gray("  sage history info           - Show storage info")
            );
            console.log();
            process.exit(1);
        }
      } catch (error) {
        console.log(chalk.red(`Error: ${error.message}`));
        process.exit(1);
      }

      process.exit(0);
      break;
    }

    default:
      console.log(chalk.yellow(`Unknown command: '${command}'`));
      process.exit(1);
  }
}
