/**
 * Tests for FileOperations
 *
 * To run: node tests/file-operations.test.mjs
 */

import assert from "assert";
import path from "path";
import fs from "fs-extra";
import FileOperations from "../src/utils/file-operations.mjs";

console.log("Running FileOperations tests...\n");

let passedTests = 0;
let failedTests = 0;

// Test 1: FileOperations initialization
try {
  const fileOps = new FileOperations();
  assert(fileOps !== null, "FileOperations should be instantiated");
  console.log("Test 1: FileOperations initialization");
  passedTests++;
} catch (error) {
  console.error("Test 1 failed:", error.message);
  failedTests++;
}

// Test 2: Path traversal protection
try {
  const fileOps = new FileOperations();
  const result = fileOps.validatePath("../../../etc/passwd");

  assert(result.valid === false, "Path traversal should be blocked");
  assert(
    result.error.includes("outside the working directory"),
    "Should return appropriate error message"
  );
  console.log("Test 2: Path traversal protection");
  passedTests++;
} catch (error) {
  console.error("Test 2 failed:", error.message);
  failedTests++;
}

// Test 3: Sensitive file blocking - .env
try {
  const fileOps = new FileOperations();
  const result = fileOps.validatePath(".env");

  assert(result.valid === false, "Should block access to .env file");
  assert(
    result.error.includes("sensitive file"),
    "Should return sensitive file error"
  );
  console.log("Test 3: Sensitive file blocking - .env");
  passedTests++;
} catch (error) {
  console.error("Test 3 failed:", error.message);
  failedTests++;
}

// Test 4: Sensitive file blocking - private key
try {
  const fileOps = new FileOperations();
  const result = fileOps.validatePath("id_rsa");

  assert(result.valid === false, "Should block access to private key files");
  assert(
    result.error.includes("sensitive file"),
    "Should return sensitive file error"
  );
  console.log("Test 4: Sensitive file blocking - private key");
  passedTests++;
} catch (error) {
  console.error("Test 4 failed:", error.message);
  failedTests++;
}

// Test 5: Valid path acceptance
try {
  const fileOps = new FileOperations();
  const testFile = path.join(process.cwd(), "package.json");
  const result = fileOps.validatePath(testFile);

  assert(
    result.valid === true,
    "Should accept valid paths within working directory"
  );
  assert(result.absolutePath !== undefined, "Should return absolute path");
  console.log("Test 5: Valid path acceptance");
  passedTests++;
} catch (error) {
  console.error("Test 5 failed:", error.message);
  failedTests++;
}

// Test 6: isSensitiveFile detection
try {
  const fileOps = new FileOperations();
  const sensitiveFiles = [
    ".env",
    ".env.local",
    "id_rsa",
    "id_rsa.pub",
    "credentials.json",
    "auth.json",
    ".aws/credentials",
    "secret.txt",
    "password.txt",
  ];

  for (const file of sensitiveFiles) {
    const fullPath = path.join(process.cwd(), file);
    assert(
      fileOps.isSensitiveFile(fullPath),
      `Should detect ${file} as sensitive`
    );
  }

  console.log("Test 6: isSensitiveFile detection");
  passedTests++;
} catch (error) {
  console.error("Test 6 failed:", error.message);
  failedTests++;
}

// Test 7: Read file with validation
try {
  const fileOps = new FileOperations();

  // Try to read a sensitive file
  const result = await fileOps.readFile(".env");

  assert(result.success === false, "Should fail when reading sensitive file");
  assert(
    result.error.includes("Access denied"),
    "Should return access denied error"
  );

  console.log("Test 7: Read file with validation");
  passedTests++;
} catch (error) {
  console.error("Test 7 failed:", error.message);
  failedTests++;
}

// Test 8: Create temporary test file and validate write operations
try {
  const fileOps = new FileOperations();
  const testDir = path.join(process.cwd(), "test-temp");
  const testFile = path.join(testDir, "test.txt");

  // Ensure test directory exists
  await fs.ensureDir(testDir);

  // Write test file
  const writeResult = await fileOps.writeFile(testFile, "Test content");
  assert(writeResult.success === true, "File should be written successfully");

  // Verify file was created
  const exists = await fs.pathExists(testFile);
  assert(exists, "File should be created");

  // Read back content
  const readResult = await fileOps.readFile(testFile);
  assert(readResult.success === true, "File should be read successfully");
  assert(
    readResult.content.includes("Test content"),
    "Content should match what was written"
  );

  // Cleanup
  await fs.remove(testDir);

  console.log("Test 8: Write and read operations");
  passedTests++;
} catch (error) {
  console.error("Test 8 failed:", error.message);
  failedTests++;
}

// Summary
console.log(`\n${"=".repeat(50)}`);
console.log(`Tests passed: ${passedTests}`);
console.log(`Tests failed: ${failedTests}`);
console.log(`Total: ${passedTests + failedTests}`);
console.log("=".repeat(50));

process.exit(failedTests > 0 ? 1 : 0);
