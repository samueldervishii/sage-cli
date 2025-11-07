/**
 * Tests for ConversationHistory
 *
 * To run: node tests/conversation-history.test.mjs
 */

import assert from "assert";
import path from "path";
import fs from "fs-extra";
import os from "os";
import ConversationHistory from "../src/utils/conversation-history.mjs";

console.log("Running ConversationHistory tests...\n");

let passedTests = 0;
let failedTests = 0;

// Use a temporary directory for tests
const testStorageDir = path.join(os.tmpdir(), "sage-test-history");

// Helper to create test instance with custom directory
function createTestInstance() {
  const history = new ConversationHistory();
  // Override the default directory for testing
  history.historyDir = testStorageDir;
  return history;
}

// Helper to clean up test directory
async function cleanupTestDir() {
  try {
    if (await fs.pathExists(testStorageDir)) {
      await fs.remove(testStorageDir);
    }
  } catch {
    // Ignore cleanup errors
  }
}

// Test 1: ConversationHistory initialization
try {
  await cleanupTestDir();
  const history = createTestInstance();
  assert(history !== null, "ConversationHistory should be instantiated");
  console.log("Test 1: ConversationHistory initialization");
  passedTests++;
} catch (error) {
  console.error("Test 1 failed:", error.message);
  failedTests++;
}

// Test 2: Create new conversation
try {
  await cleanupTestDir();
  const history = createTestInstance();
  await history.init();
  await history.startNewConversation();

  assert(history.currentConversation !== null, "Should create conversation");
  assert(history.currentConversation.id !== undefined, "Should have ID");
  assert(
    Array.isArray(history.currentConversation.messages),
    "Should have messages array"
  );
  assert(
    history.currentConversation.startedAt !== undefined,
    "Should have timestamp"
  );

  console.log("Test 2: Create new conversation");
  passedTests++;
} catch (error) {
  console.error("Test 2 failed:", error.message);
  failedTests++;
}

// Test 3: Add messages to conversation
try {
  await cleanupTestDir();
  const history = createTestInstance();
  await history.init();
  await history.startNewConversation();

  await history.addMessage("user", "Hello");
  await history.addMessage("model", "Hi there!");

  assert(
    history.currentConversation.messages.length === 2,
    "Should have 2 messages"
  );
  assert(
    history.currentConversation.messages[0].role === "user",
    "First message should be from user"
  );
  assert(
    history.currentConversation.messages[0].content === "Hello",
    "First message content should match"
  );
  assert(
    history.currentConversation.messages[1].role === "model",
    "Second message should be from model"
  );

  console.log("Test 3: Add messages to conversation");
  passedTests++;
} catch (error) {
  console.error("Test 3 failed:", error.message);
  failedTests++;
}

// Test 4: Save and load conversation
try {
  await cleanupTestDir();
  const history = createTestInstance();
  await history.init();
  await history.startNewConversation();
  await history.addMessage("user", "Test message");

  const conversationId = history.currentConversation.id;

  // Create new instance and load
  const history2 = createTestInstance();
  const loaded = await history2.loadConversation(conversationId);

  assert(loaded !== null, "Should load conversation");
  assert(loaded.id === conversationId, "Should have same ID");
  assert(loaded.messages.length === 1, "Should have saved message");
  assert(
    loaded.messages[0].content === "Test message",
    "Message content should match"
  );

  console.log("Test 4: Save and load conversation");
  passedTests++;
} catch (error) {
  console.error("Test 4 failed:", error.message);
  failedTests++;
}

// Test 5: List conversations
try {
  await cleanupTestDir();
  const history = createTestInstance();
  await history.init();

  // Create first conversation and save it
  await history.startNewConversation();
  await history.addMessage("user", "First conversation");
  const firstId = history.currentConversation.id;

  // Wait 1 second to ensure different timestamp IDs (IDs are YYYYMMDD-HHMMSS format)
  await new Promise(resolve => setTimeout(resolve, 1100));

  // Create second conversation and save it
  await history.startNewConversation();
  await history.addMessage("user", "Second conversation");
  const secondId = history.currentConversation.id;

  // Verify both conversations are saved
  assert(firstId !== secondId, "Should have different IDs");

  const conversations = await history.listConversations();

  assert(
    conversations.length === 2,
    `Should list 2 conversations, found ${conversations.length}`
  );
  assert(
    conversations[0].messageCount !== undefined,
    "Should include message count"
  );
  assert(
    conversations[0].firstUserMessage !== undefined,
    "Should include first user message"
  );

  console.log("Test 5: List conversations");
  passedTests++;
} catch (error) {
  console.error("Test 5 failed:", error.message);
  failedTests++;
}

// Test 6: Conversation metadata
try {
  await cleanupTestDir();
  const history = createTestInstance();
  await history.init();
  await history.startNewConversation();
  await history.addMessage("user", "Hello");
  await history.addMessage("model", "Hi!");

  const conv = history.currentConversation;

  assert(conv.startedAt !== undefined, "Should have start timestamp");
  assert(
    conv.lastMessageAt !== undefined,
    "Should have last message timestamp"
  );
  assert(conv.messages.length === 2, "Should have 2 messages");

  console.log("Test 6: Conversation metadata");
  passedTests++;
} catch (error) {
  console.error("Test 6 failed:", error.message);
  failedTests++;
}

// Test 7: Load conversation by ID
try {
  await cleanupTestDir();
  const history = createTestInstance();
  await history.init();
  await history.startNewConversation();
  await history.addMessage("user", "Test");

  const id = history.currentConversation.id;
  const loaded = await history.loadConversation(id);

  assert(loaded !== null, "Should load conversation by ID");
  assert(loaded.id === id, "Should match requested ID");
  assert(loaded.messages.length === 1, "Should have messages");

  console.log("Test 7: Load conversation by ID");
  passedTests++;
} catch (error) {
  console.error("Test 7 failed:", error.message);
  failedTests++;
}

// Test 8: Auto-cleanup old conversations
try {
  await cleanupTestDir();
  const history = createTestInstance();
  await history.init();

  // Create conversations with old timestamps
  for (let i = 0; i < 3; i++) {
    await history.startNewConversation();
    await history.addMessage("user", `Message ${i}`);

    // Manually set old timestamp
    const filePath = path.join(
      testStorageDir,
      `${history.currentConversation.id}.json`
    );
    const data = await fs.readJson(filePath);
    data.startedAt = new Date(
      Date.now() - 40 * 24 * 60 * 60 * 1000
    ).toISOString(); // 40 days ago
    data.lastMessageAt = data.startedAt;
    await fs.writeJson(filePath, data);
  }

  // Trigger cleanup manually
  await history.autoCleanup();

  const conversations = await history.listConversations();

  // Should have cleaned up old conversations (> 30 days removed)
  assert(conversations.length === 0, "Should clean up old conversations");

  console.log("Test 8: Auto-cleanup old conversations");
  passedTests++;
} catch (error) {
  console.error("Test 8 failed:", error.message);
  failedTests++;
}

// Test 9: Export conversation to markdown
try {
  await cleanupTestDir();
  const history = createTestInstance();
  await history.init();
  await history.startNewConversation();
  await history.addMessage("user", "Hello");
  await history.addMessage("model", "Hi there!");

  const id = history.currentConversation.id;
  const markdown = await history.exportToMarkdown(id);

  assert(markdown.includes("Hello"), "Should include user message");
  assert(markdown.includes("Hi there!"), "Should include model message");
  assert(markdown.includes("User"), "Should have user section");
  assert(markdown.includes("Sage"), "Should have Sage section");

  console.log("Test 9: Export conversation to markdown");
  passedTests++;
} catch (error) {
  console.error("Test 9 failed:", error.message);
  failedTests++;
}

// Cleanup
await cleanupTestDir();

// Summary
console.log(`\n${"=".repeat(50)}`);
console.log(`Tests passed: ${passedTests}`);
console.log(`Tests failed: ${failedTests}`);
console.log(`Total: ${passedTests + failedTests}`);
console.log("=".repeat(50));

process.exit(failedTests > 0 ? 1 : 0);
