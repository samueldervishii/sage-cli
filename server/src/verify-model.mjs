import conversationStorage from "./services/conversation-storage.mjs";
import ChatService from "./services/chat-service.mjs";
import mongoDBService from "./services/mongodb-service.mjs";
import dotenv from "dotenv";

dotenv.config();

async function verify() {
  console.log("Starting verification...");

  try {
    // 1. Verify ConversationStorage
    console.log("1. Verifying ConversationStorage...");
    await conversationStorage.initialize();

    const testModel = "test-model-v1";
    const conversation = await conversationStorage.createConversation(
      {},
      testModel
    );

    if (conversation.model === testModel) {
      console.log(
        "ConversationStorage saved model correctly:",
        conversation.model
      );
    } else {
      console.error(
        "ConversationStorage failed to save model. Expected:",
        testModel,
        "Got:",
        conversation.model
      );
    }

    // Verify in DB
    const savedConv = await conversationStorage.getConversation(
      conversation.id
    );
    if (savedConv.model === testModel) {
      console.log("Model field persisted in MongoDB correctly");
    } else {
      console.error("Model field not found in MongoDB document");
    }

    // Clean up
    await conversationStorage.permanentlyDeleteConversation(conversation.id);
    console.log("Cleaned up test conversation");

    // 2. Verify ChatService logic
    console.log("\n2. Verifying ChatService logic...");
    const chatService = new ChatService();

    // Test _getFullModelString (accessing private method for testing)
    const geminiModel = chatService._getFullModelString("gemini");
    console.log("Gemini model string:", geminiModel);

    const deepseekModel = chatService._getFullModelString("deepseek");
    console.log("DeepSeek model string:", deepseekModel);

    if (deepseekModel.includes("deepseek")) {
      console.log("DeepSeek model string looks correct");
    } else {
      console.error("DeepSeek model string looks incorrect");
    }

    console.log("\nVerification complete!");
  } catch (error) {
    console.error("Verification failed:", error);
  } finally {
    await mongoDBService.disconnect();
  }
}

verify();
