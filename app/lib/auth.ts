import { createHash } from "crypto";

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123";

// Debug function - remove after fixing
export function debugAuth() {
  console.log("Environment ADMIN_PASSWORD:", process.env.ADMIN_PASSWORD);
  console.log("Using password:", ADMIN_PASSWORD);
  console.log("All env vars:", Object.keys(process.env).filter(key => key.includes('ADMIN')));
}

export function hashPassword(password: string): string {
  return createHash("sha256").update(password).digest("hex");
}

export function validatePassword(inputPassword: string): boolean {
  // Add debug logging
  debugAuth();
  console.log("Input password:", inputPassword);
  console.log("Stored password:", ADMIN_PASSWORD);
  
  const hashedInput = hashPassword(inputPassword);
  const hashedStored = hashPassword(ADMIN_PASSWORD);
  
  console.log("Hashed input:", hashedInput);
  console.log("Hashed stored:", hashedStored);
  console.log("Match:", hashedInput === hashedStored);
  
  return hashedInput === hashedStored;
}

export function isSessionExpired(loginTime: number): boolean {
  const now = Date.now();
  const sessionDuration = 24 * 60 * 60 * 1000; // 24 hours
  
  return (now - loginTime) > sessionDuration;
}