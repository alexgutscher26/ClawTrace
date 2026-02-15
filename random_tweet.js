import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Configuration ---
const APP_NAME = "ClawTrace";
const AGENT_FRAMEWORK = "OpenClaw";

// --- Data Generators ---
/**
 * Generates a random integer between min and max, inclusive.
 */
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomFloat = (min, max) => (Math.random() * (max - min) + min).toFixed(1);
/**
 * Returns a random element from the given array.
 */
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

// --- Content Libraries ---
const features = [
  "the new dashboard", "websocket telemetry", "policy guardrails", "agent kill-switch", 
  "distributed tracing", "cost attribution", "latency monitoring", "secure enclave"
];

const bugs = [
  "a race condition in the heartbeat loop", "a memory leak in the parser", 
  "an infinite recursion in tool calling", "a WebSocket timeout issue", 
  "a weird edge case with emojis", "a timezone parsing error"
];

const techStack = [
  "Rust", "Go", "TypeScript", "Node.js", "Postgres", "ClickHouse", "Redis", "Kafka"
];

const emotions = [
  "😭", "😤", "😅", "🚀", "💀", "☕", "🔥", "🤔", "👀", "🎉"
];

// --- Tweet Templates ---

const templates = {
  // 🐛 BTS & Struggles
  bts: [
    () => `Just spent ${randomInt(2, 6)} hours debugging ${pick(bugs)}. Turns out it was a single line of config. ${pick(emotions)} #buildinpublic #${APP_NAME}`,
    () => `Refactoring the ${pick(features)} module. Deleted ${randomInt(100, 500)} lines of legacy code. Feels good. 🧹 #refactoring #cleanCode`,
    () => `Current status: Powered by ${randomInt(3, 6)} cups of coffee and sheer panic. Shipping the new ${pick(features)} update tonight. 🌙 #${APP_NAME} #startup`,
    () => `Why is ${pick(techStack)} error handling so verbose? Asking for a friend who is currently crying over a stack trace. ${pick(emotions)} #devlife`,
    () => `That moment when the ${AGENT_FRAMEWORK} agent starts hallucinating loops and you have to kill -9 the whole fleet. 💀 #AI #Ops`
  ],

  // ⚡ Performance Wins
  perf: [
    () => `${APP_NAME} performance update: Latency dropped to ${randomFloat(0.5, 2.0)}ms p95 after moving the ingestion to ${pick(techStack)}. ⚡ #performance #engineering`,
    () => `Just handled ${randomInt(1000, 5000)} concurrent agent traces on a single node. ${AGENT_FRAMEWORK} is a beast when tuned right. 🚀 #scaling #AI`,
    () => `Optimized the ${pick(features)} pipeline. Throughput increased by ${randomInt(20, 50)}%. Your agents will thank you. 📈 #${APP_NAME}`,
    () => `Database migration complete. Query times for traces went from ${randomInt(100, 300)}ms to ${randomInt(5, 20)}ms. Speed is a feature. 🏎️`
  ],

  // 🛡️ Security & Governance
  security: [
    () => `Caught a rogue agent trying to spend $${randomInt(100, 500)} in 5 minutes. The new ${APP_NAME} circuit breaker saved the day. 🛡️ #AIsecurity #Governance`,
    () => `Security tip: Always sanitize your tool outputs. Just blocked ${randomInt(10, 50)} malicious injection attempts on the ${AGENT_FRAMEWORK} gateway. 🛑 #InfoSec`,
    () => `Audit log: Found an agent trying to access /etc/passwd via a shell tool. This is why we need sandboxing, folks. 👀 #${APP_NAME} #Safety`,
    () => `Implementing Zero Trust for ${AGENT_FRAMEWORK} fleets. No agent gets an API key without a signed handshake. 🤝 #Security`
  ],

  // 🚀 Feature Teasers
  marketing: [
    () => `Sneak peek of the new ${pick(features)}. It's going to change how you debug autonomous agents. Dropping next week. 👀 #${APP_NAME}`,
    () => `Who else is tired of grepping through log files? The new visual tracer in ${APP_NAME} is pure magic. ✨ #DevTools #DX`,
    () => `Building the "Control Plane" for AI. If you're running more than ${randomInt(5, 10)} agents, you need this. 🎛️ #${APP_NAME} #${AGENT_FRAMEWORK}`
  ]
};

// --- Generator Logic ---

function generateTweet() {
  const categories = Object.keys(templates);
  const randomCategory = pick(categories);
  const generator = pick(templates[randomCategory]);
  
  const tweet = generator();
  
  return {
    category: randomCategory.toUpperCase(),
    content: tweet
  };
}

// --- Execution ---

console.log("\n🎲 Generating Random SaaS Tweet...\n");
const tweetData = generateTweet();

console.log(`[${tweetData.category}]`);
console.log("---------------------------------------------------");
console.log(tweetData.content);
console.log("---------------------------------------------------\n");
