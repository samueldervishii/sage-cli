/**
 * Tests for ConfigManager
 *
 * To run: node tests/config-manager.test.mjs
 */

import assert from "assert";
import ConfigManager from "../src/config/config-manager.mjs";

console.log("Running ConfigManager tests...\n");

let passedTests = 0;
let failedTests = 0;

// Test 1: ConfigManager initialization
try {
  const configManager = new ConfigManager();
  assert(configManager !== null, "ConfigManager should be instantiated");
  console.log("Test 1: ConfigManager initialization");
  passedTests++;
} catch (error) {
  console.error("Test 1 failed:", error.message);
  failedTests++;
}

// Test 2: Encryption and decryption
try {
  const configManager = new ConfigManager();
  const originalText = "test-api-key-12345";
  const encrypted = configManager.encrypt(originalText);
  const decrypted = configManager.decrypt(encrypted);

  assert(
    encrypted !== originalText,
    "Encrypted text should differ from original"
  );
  assert(decrypted === originalText, "Decrypted text should match original");
  assert(
    encrypted.split(":").length === 3,
    "Encrypted format should be salt:iv:encrypted"
  );
  console.log("Test 2: Encryption and decryption");
  passedTests++;
} catch (error) {
  console.error("Test 2 failed:", error.message);
  failedTests++;
}

// Test 3: getGeminiModel returns default
try {
  const configManager = new ConfigManager();
  const model = await configManager.getGeminiModel();

  assert(typeof model === "string", "Model should be a string");
  assert(model.includes("gemini"), "Model should include 'gemini'");
  console.log(`Test 3: getGeminiModel returns default (${model})`);
  passedTests++;
} catch (error) {
  console.error("Test 3 failed:", error.message);
  failedTests++;
}

// Test 4: getDefaultConfig structure
try {
  const configManager = new ConfigManager();
  const config = configManager.getDefaultConfig();

  assert(config.apiKeys !== undefined, "Config should have apiKeys");
  assert(config.preferences !== undefined, "Config should have preferences");
  assert(config.apiKeys.gemini === null, "Default gemini key should be null");
  assert(
    config.preferences.geminiModel !== undefined,
    "Config should have geminiModel preference"
  );
  console.log("Test 4: getDefaultConfig structure");
  passedTests++;
} catch (error) {
  console.error("Test 4 failed:", error.message);
  failedTests++;
}

// Summary
console.log(`\n${"=".repeat(50)}`);
console.log(`Tests passed: ${passedTests}`);
console.log(`Tests failed: ${failedTests}`);
console.log(`Total: ${passedTests + failedTests}`);
console.log("=".repeat(50));

process.exit(failedTests > 0 ? 1 : 0);
