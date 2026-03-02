#!/usr/bin/env node
"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// src/index.ts
var import_react7 = __toESM(require("react"));
var import_ink7 = require("ink");
var import_dotenv = __toESM(require("dotenv"));

// src/lib/config.ts
var import_conf = __toESM(require("conf"));
var readline = __toESM(require("readline"));
var fs = __toESM(require("fs"));
var path = __toESM(require("path"));
var FALLBACK_SYSTEM_PROMPT = `You are COREX, an elite AI assistant living inside a terminal.
You are direct, insightful, and technically brilliant.
Format your responses for terminal display using clean spacing.
When showing code, use markdown code blocks.
Keep responses focused and avoid unnecessary filler text.`;
function loadSystemPrompt() {
  const filename = "COREX_SYSTEM_PROMPT.txt";
  const possiblePaths = [
    path.join(__dirname, "..", "assets", filename),
    path.join(__dirname, "..", "..", "assets", filename),
    path.join(process.cwd(), "assets", filename)
  ];
  for (const p of possiblePaths) {
    try {
      if (fs.existsSync(p)) {
        return fs.readFileSync(p, "utf-8").trim();
      }
    } catch {
    }
  }
  return FALLBACK_SYSTEM_PROMPT;
}
var DEFAULT_SYSTEM_PROMPT = loadSystemPrompt();
var defaults = {
  apiKey: "",
  model: "claude-3-5-sonnet-20241022",
  theme: "dark",
  systemPrompt: DEFAULT_SYSTEM_PROMPT,
  maxTokens: 4096,
  temperature: 0.7,
  saveHistory: false,
  userName: "You"
};
var config = new import_conf.default({
  projectName: "corex",
  defaults
});
function loadConfig() {
  return {
    apiKey: config.get("apiKey"),
    model: config.get("model"),
    theme: config.get("theme"),
    systemPrompt: config.get("systemPrompt"),
    maxTokens: config.get("maxTokens"),
    temperature: config.get("temperature"),
    saveHistory: config.get("saveHistory"),
    userName: config.get("userName")
  };
}
function saveConfig(partial) {
  for (const [key, value] of Object.entries(partial)) {
    config.set(key, value);
  }
}
function isFirstRun() {
  const apiKey = config.get("apiKey");
  return !apiKey || apiKey.trim() === "";
}
function prompt(rl, question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim());
    });
  });
}
function promptMasked(rl, question) {
  return new Promise((resolve) => {
    const stdout = process.stdout;
    stdout.write(question);
    const stdin = process.stdin;
    const wasRaw = stdin.isRaw;
    if (stdin.setRawMode) {
      stdin.setRawMode(true);
    }
    stdin.resume();
    let input = "";
    const onData = (char) => {
      const c = char.toString("utf8");
      if (c === "\n" || c === "\r") {
        stdin.removeListener("data", onData);
        if (stdin.setRawMode) {
          stdin.setRawMode(wasRaw || false);
        }
        stdout.write("\n");
        resolve(input.trim());
      } else if (c === "\x7F" || c === "\b") {
        if (input.length > 0) {
          input = input.slice(0, -1);
          stdout.write("\b \b");
        }
      } else if (c === "") {
        process.exit(0);
      } else {
        input += c;
        stdout.write("*");
      }
    };
    stdin.on("data", onData);
  });
}
var MODELS = [
  { id: "claude-3-5-sonnet-20241022", label: "claude-3-5-sonnet-20241022   Recommended" },
  { id: "claude-3-opus-20240229", label: "claude-3-opus-20240229       Most Powerful" },
  { id: "claude-3-haiku-20240307", label: "claude-3-haiku-20240307      Fastest" }
];
async function runFirstRunWizard() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  console.log("");
  console.log("+------------------------------------------+");
  console.log("|   Welcome to COREX - First Setup         |");
  console.log("+------------------------------------------+");
  console.log("");
  rl.close();
  let apiKey = "";
  while (true) {
    apiKey = await promptMasked(
      readline.createInterface({ input: process.stdin, output: process.stdout }),
      "Enter your Anthropic API key: "
    );
    if (apiKey.startsWith("sk-ant-")) {
      break;
    }
    console.log('  Error: API key must start with "sk-ant-". Please try again.');
  }
  const rl2 = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  console.log("");
  console.log("Choose your default model:");
  MODELS.forEach((m, i) => {
    console.log(`  ${i + 1}) ${m.label}`);
  });
  const modelChoice = await prompt(rl2, "Enter choice [1]: ");
  const modelIndex = modelChoice ? parseInt(modelChoice, 10) - 1 : 0;
  const model = MODELS[modelIndex >= 0 && modelIndex < MODELS.length ? modelIndex : 0].id;
  console.log("");
  const themeChoice = await prompt(rl2, "Choose your theme: dark / light / neon / retro [dark]: ");
  const validThemes = ["dark", "light", "neon", "retro"];
  const theme = validThemes.includes(themeChoice) ? themeChoice : "dark";
  rl2.close();
  saveConfig({ apiKey, model, theme });
  console.log("");
  console.log("Config saved to ~/.config/corex/config.json");
  console.log("Launching COREX...");
  console.log("");
}

// src/lib/ai.ts
var import_sdk = __toESM(require("@anthropic-ai/sdk"));
var client = null;
function initAI(apiKey) {
  client = new import_sdk.default({ apiKey });
}
async function sendMessage(history2, userMessage, config2, onToken, onComplete, onError) {
  if (!client) {
    onError(new Error("No API key found. Run corex to set it up."));
    return;
  }
  const messages = [
    ...history2.map((m) => ({
      role: m.role,
      content: m.content
    })),
    { role: "user", content: userMessage }
  ];
  try {
    const stream = client.messages.stream({
      model: config2.model,
      max_tokens: config2.maxTokens,
      temperature: config2.temperature,
      system: config2.systemPrompt,
      messages
    });
    let fullText = "";
    stream.on("text", (text) => {
      fullText += text;
      onToken(text);
    });
    const finalMessage = await stream.finalMessage();
    const usage = {
      inputTokens: finalMessage.usage?.input_tokens || 0,
      outputTokens: finalMessage.usage?.output_tokens || 0,
      totalTokens: (finalMessage.usage?.input_tokens || 0) + (finalMessage.usage?.output_tokens || 0)
    };
    onComplete(fullText, usage);
  } catch (err) {
    const statusCode = err?.status || err?.statusCode;
    let message = "An unexpected error occurred.";
    if (statusCode === 401) {
      message = "Invalid API key. Use /key to update it.";
    } else if (statusCode === 429) {
      message = "Rate limit reached. Please wait a moment and try again.";
    } else if (statusCode === 404 || err?.message && err.message.includes("model")) {
      message = `Selected model unavailable. Try switching with /model.`;
    } else if (err?.code === "ENOTFOUND" || err?.code === "ECONNREFUSED" || err?.code === "ETIMEDOUT" || err?.message?.includes("fetch failed") || err?.message?.includes("network")) {
      message = "Connection failed. Check your internet connection.";
    } else if (err?.message) {
      message = err.message;
    }
    onError(new Error(message));
  }
}

// src/app.tsx
var import_react6 = __toESM(require("react"));
var import_ink6 = require("ink");

// src/themes/themes.ts
var themes = {
  dark: {
    userText: "#00D9FF",
    aiText: "#FFFFFF",
    border: "#333333",
    accent: "#00FF88",
    statusBar: "#666666",
    headerGradient: ["#00D9FF", "#007AFF"]
  },
  neon: {
    userText: "#FF00FF",
    aiText: "#00FFFF",
    border: "#FF00FF",
    accent: "#FFFF00",
    statusBar: "#FF00FF",
    headerGradient: ["#FF00FF", "#00FFFF"]
  },
  retro: {
    userText: "#FFB000",
    aiText: "#FF8C00",
    border: "#FF8C00",
    accent: "#FFB000",
    statusBar: "#FF8C00",
    headerGradient: ["#FFB000", "#FF4500"]
  },
  light: {
    userText: "#0066CC",
    aiText: "#222222",
    border: "#CCCCCC",
    accent: "#009900",
    statusBar: "#888888",
    headerGradient: ["#0066CC", "#0099FF"]
  }
};
function getTheme(name) {
  return themes[name] || themes.dark;
}
function getThemeNames() {
  return Object.keys(themes);
}

// src/lib/history.ts
var fs2 = __toESM(require("fs"));
var path2 = __toESM(require("path"));
var os = __toESM(require("os"));
var history = [];
function addMessage(role, content) {
  history.push({ role, content });
}
function getHistory() {
  return [...history];
}
function clearHistory() {
  history = [];
}
function saveSession() {
  const sessionsDir = path2.join(os.homedir(), ".corex", "sessions");
  if (!fs2.existsSync(sessionsDir)) {
    fs2.mkdirSync(sessionsDir, { recursive: true });
  }
  const now = /* @__PURE__ */ new Date();
  const pad = (n) => n.toString().padStart(2, "0");
  const filename = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}.txt`;
  const filepath = path2.join(sessionsDir, filename);
  let content = "=== COREX Chat Session ===\n";
  content += `Date: ${now.toLocaleString()}
`;
  content += `Messages: ${history.length}
`;
  content += "=".repeat(40) + "\n\n";
  for (const msg of history) {
    const label = msg.role === "user" ? "You" : "COREX";
    content += `[${label}]
${msg.content}

`;
  }
  fs2.writeFileSync(filepath, content, "utf-8");
  return filepath;
}

// src/components/Header.tsx
var import_react = __toESM(require("react"));
var import_ink = require("ink");
var fs3 = __toESM(require("fs"));
var path3 = __toESM(require("path"));
var import_gradient_string = __toESM(require("gradient-string"));
var Header = ({ theme }) => {
  const [logoLines, setLogoLines] = (0, import_react.useState)([]);
  (0, import_react.useEffect)(() => {
    try {
      const possiblePaths = [
        path3.join(__dirname, "..", "assets", "logo.txt"),
        path3.join(__dirname, "..", "..", "assets", "logo.txt"),
        path3.join(process.cwd(), "assets", "logo.txt")
      ];
      let logoText = "";
      for (const p of possiblePaths) {
        if (fs3.existsSync(p)) {
          logoText = fs3.readFileSync(p, "utf-8");
          break;
        }
      }
      if (!logoText) {
        logoText = `
  \u2588\u2588\u2588\u2588\u2588\u2588\u2557 \u2588\u2588\u2588\u2588\u2588\u2588\u2557 \u2588\u2588\u2588\u2588\u2588\u2588\u2557 \u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2557\u2588\u2588\u2557  \u2588\u2588\u2557
 \u2588\u2588\u2554\u2550\u2550\u2550\u2550\u255D\u2588\u2588\u2554\u2550\u2550\u2550\u2588\u2588\u2557\u2588\u2588\u2554\u2550\u2550\u2588\u2588\u2557\u2588\u2588\u2554\u2550\u2550\u2550\u2550\u255D\u255A\u2588\u2588\u2557\u2588\u2588\u2554\u255D
 \u2588\u2588\u2551     \u2588\u2588\u2551   \u2588\u2588\u2551\u2588\u2588\u2588\u2588\u2588\u2588\u2554\u255D\u2588\u2588\u2588\u2588\u2588\u2557   \u255A\u2588\u2588\u2588\u2554\u255D
 \u2588\u2588\u2551     \u2588\u2588\u2551   \u2588\u2588\u2551\u2588\u2588\u2554\u2550\u2550\u2588\u2588\u2557\u2588\u2588\u2554\u2550\u2550\u255D   \u2588\u2588\u2554\u2588\u2588\u2557
 \u255A\u2588\u2588\u2588\u2588\u2588\u2588\u2557\u255A\u2588\u2588\u2588\u2588\u2588\u2588\u2554\u255D\u2588\u2588\u2551  \u2588\u2588\u2551\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2557\u2588\u2588\u2554\u255D \u2588\u2588\u2557
  \u255A\u2550\u2550\u2550\u2550\u2550\u255D \u255A\u2550\u2550\u2550\u2550\u2550\u255D \u255A\u2550\u255D  \u255A\u2550\u255D\u255A\u2550\u2550\u2550\u2550\u2550\u2550\u255D\u255A\u2550\u255D  \u255A\u2550\u255D`;
      }
      const grad = (0, import_gradient_string.default)(theme.headerGradient);
      const lines = logoText.split("\n").map((line) => grad(line));
      setLogoLines(lines);
    } catch {
      setLogoLines(["  COREX"]);
    }
  }, [theme]);
  return /* @__PURE__ */ import_react.default.createElement(import_ink.Box, { flexDirection: "column", marginBottom: 1 }, logoLines.map((line, i) => /* @__PURE__ */ import_react.default.createElement(import_ink.Text, { key: i }, line)));
};
var Header_default = Header;

// src/components/ChatHistory.tsx
var import_react3 = __toESM(require("react"));
var import_ink3 = require("ink");

// src/lib/markdown.ts
var import_marked = require("marked");
var import_marked_terminal = __toESM(require("marked-terminal"));
import_marked.marked.setOptions({
  renderer: new import_marked_terminal.default()
});
function renderMarkdown(text) {
  try {
    const rendered = import_marked.marked.parse(text);
    if (typeof rendered === "string") {
      return rendered.replace(/\n$/, "");
    }
    return text;
  } catch {
    return text;
  }
}

// src/components/ThinkingDots.tsx
var import_react2 = __toESM(require("react"));
var import_ink2 = require("ink");
var import_ink_spinner = __toESM(require("ink-spinner"));
var ThinkingDots = ({ theme }) => {
  return /* @__PURE__ */ import_react2.default.createElement(import_ink2.Box, { marginLeft: 2 }, /* @__PURE__ */ import_react2.default.createElement(import_ink2.Text, { color: theme.accent }, /* @__PURE__ */ import_react2.default.createElement(import_ink_spinner.default, { type: "dots" })), /* @__PURE__ */ import_react2.default.createElement(import_ink2.Text, { color: theme.statusBar }, " thinking..."));
};
var ThinkingDots_default = ThinkingDots;

// src/components/ChatHistory.tsx
var ChatHistory = ({
  messages,
  theme,
  isThinking,
  streamingText,
  userName
}) => {
  return /* @__PURE__ */ import_react3.default.createElement(import_ink3.Box, { flexDirection: "column", flexGrow: 1 }, messages.map((msg, i) => /* @__PURE__ */ import_react3.default.createElement(import_ink3.Box, { key: i, flexDirection: "column", marginBottom: 1 }, /* @__PURE__ */ import_react3.default.createElement(import_ink3.Text, { bold: true, color: msg.role === "user" ? theme.userText : theme.accent }, msg.role === "user" ? `${userName}` : "COREX"), /* @__PURE__ */ import_react3.default.createElement(import_ink3.Box, { marginLeft: 2 }, /* @__PURE__ */ import_react3.default.createElement(import_ink3.Text, { color: msg.role === "user" ? theme.userText : theme.aiText }, msg.role === "assistant" ? renderMarkdown(msg.content) : msg.content)))), streamingText && /* @__PURE__ */ import_react3.default.createElement(import_ink3.Box, { flexDirection: "column", marginBottom: 1 }, /* @__PURE__ */ import_react3.default.createElement(import_ink3.Text, { bold: true, color: theme.accent }, "COREX"), /* @__PURE__ */ import_react3.default.createElement(import_ink3.Box, { marginLeft: 2 }, /* @__PURE__ */ import_react3.default.createElement(import_ink3.Text, { color: theme.aiText }, renderMarkdown(streamingText)))), isThinking && !streamingText && /* @__PURE__ */ import_react3.default.createElement(ThinkingDots_default, { theme }));
};
var ChatHistory_default = ChatHistory;

// src/components/InputBar.tsx
var import_react4 = __toESM(require("react"));
var import_ink4 = require("ink");
var import_ink_text_input = __toESM(require("ink-text-input"));
var InputBar = ({
  value,
  onChange,
  onSubmit,
  theme,
  isDisabled
}) => {
  return /* @__PURE__ */ import_react4.default.createElement(import_ink4.Box, { flexDirection: "column" }, /* @__PURE__ */ import_react4.default.createElement(import_ink4.Box, null, /* @__PURE__ */ import_react4.default.createElement(import_ink4.Text, { color: theme.border }, "\u2500".repeat(process.stdout.columns || 80))), /* @__PURE__ */ import_react4.default.createElement(import_ink4.Box, null, /* @__PURE__ */ import_react4.default.createElement(import_ink4.Box, { flexGrow: 1 }, /* @__PURE__ */ import_react4.default.createElement(import_ink4.Text, { color: theme.accent, bold: true }, "\u276F "), /* @__PURE__ */ import_react4.default.createElement(
    import_ink_text_input.default,
    {
      value,
      onChange,
      onSubmit,
      placeholder: isDisabled ? "Waiting for response..." : "Type a message..."
    }
  )), /* @__PURE__ */ import_react4.default.createElement(import_ink4.Box, { marginLeft: 1 }, /* @__PURE__ */ import_react4.default.createElement(import_ink4.Text, { color: theme.statusBar, dimColor: true }, "[Enter to send]"))));
};
var InputBar_default = InputBar;

// src/components/StatusBar.tsx
var import_react5 = __toESM(require("react"));
var import_ink5 = require("ink");
var StatusBar = ({
  model,
  totalTokens,
  themeName,
  theme
}) => {
  return /* @__PURE__ */ import_react5.default.createElement(import_ink5.Box, null, /* @__PURE__ */ import_react5.default.createElement(import_ink5.Text, { color: theme.statusBar }, model, " \u2502 tokens: ", totalTokens, " \u2502 theme: ", themeName));
};
var StatusBar_default = StatusBar;

// src/app.tsx
var MODELS2 = [
  { id: "claude-3-5-sonnet-20241022", label: "claude-3-5-sonnet   Recommended" },
  { id: "claude-3-opus-20240229", label: "claude-3-opus       Most Powerful" },
  { id: "claude-3-haiku-20240307", label: "claude-3-haiku      Fastest" }
];
var HELP_TEXT = `
\u256D\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u256E
\u2502  COREX Commands                      \u2502
\u251C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2524
\u2502  /clear   Clear conversation         \u2502
\u2502  /model   Switch AI model            \u2502
\u2502  /theme   Change color theme         \u2502
\u2502  /save    Save chat to file          \u2502
\u2502  /help    Show this help             \u2502
\u2502  /key     Update API key             \u2502
\u2502  /exit    Quit COREX                 \u2502
\u251C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2524
\u2502  Ctrl+C   Exit                       \u2502
\u2502  Ctrl+L   Clear screen               \u2502
\u2502  \u2191 / \u2193    Navigate input history     \u2502
\u2570\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u256F`;
var App = ({ config: initialConfig }) => {
  const { exit } = (0, import_ink6.useApp)();
  const [config2, setConfig] = (0, import_react6.useState)(initialConfig);
  const [messages, setMessages] = (0, import_react6.useState)([]);
  const [inputValue, setInputValue] = (0, import_react6.useState)("");
  const [isThinking, setIsThinking] = (0, import_react6.useState)(false);
  const [streamingText, setStreamingText] = (0, import_react6.useState)("");
  const [totalTokens, setTotalTokens] = (0, import_react6.useState)(0);
  const [inputHistory, setInputHistory] = (0, import_react6.useState)([]);
  const [historyIndex, setHistoryIndex] = (0, import_react6.useState)(-1);
  const [welcomeShown, setWelcomeShown] = (0, import_react6.useState)(false);
  const [systemMessages, setSystemMessages] = (0, import_react6.useState)([]);
  const theme = getTheme(config2.theme);
  (0, import_react6.useEffect)(() => {
    if (!welcomeShown) {
      setWelcomeShown(true);
      const welcomeMsg = "Hello. I am COREX. Ask me anything.";
      let i = 0;
      const chars = [];
      const interval = setInterval(() => {
        if (i < welcomeMsg.length) {
          chars.push(welcomeMsg[i]);
          setMessages([{ role: "assistant", content: chars.join("") }]);
          i++;
        } else {
          clearInterval(interval);
          addMessage("assistant", welcomeMsg);
        }
      }, 30);
      return () => clearInterval(interval);
    }
  }, []);
  (0, import_ink6.useInput)((input, key) => {
    if (key.ctrl && input === "l") {
      setMessages([]);
      return;
    }
    if (key.upArrow && inputHistory.length > 0) {
      const newIndex = historyIndex < inputHistory.length - 1 ? historyIndex + 1 : historyIndex;
      setHistoryIndex(newIndex);
      setInputValue(inputHistory[inputHistory.length - 1 - newIndex]);
      return;
    }
    if (key.downArrow) {
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setInputValue(inputHistory[inputHistory.length - 1 - newIndex]);
      } else {
        setHistoryIndex(-1);
        setInputValue("");
      }
      return;
    }
  });
  const addSystemMessage = (0, import_react6.useCallback)((text) => {
    setSystemMessages((prev) => [...prev, text]);
  }, []);
  const handleSubmit = (0, import_react6.useCallback)(
    async (value) => {
      const trimmed = value.trim();
      if (!trimmed || isThinking) return;
      setInputValue("");
      setHistoryIndex(-1);
      setInputHistory((prev) => {
        const next = [...prev, trimmed];
        return next.slice(-50);
      });
      if (trimmed.startsWith("/")) {
        const cmd = trimmed.toLowerCase();
        if (cmd === "/exit") {
          setMessages((prev) => [
            ...prev,
            { role: "assistant", content: "\u{1F44B} Goodbye! See you next time." }
          ]);
          setTimeout(() => {
            exit();
            process.exit(0);
          }, 500);
          return;
        }
        if (cmd === "/clear") {
          clearHistory();
          setMessages([]);
          setTotalTokens(0);
          setSystemMessages([]);
          addSystemMessage("Conversation cleared.");
          return;
        }
        if (cmd === "/help") {
          setMessages((prev) => [
            ...prev,
            { role: "assistant", content: HELP_TEXT }
          ]);
          return;
        }
        if (cmd === "/save") {
          try {
            const filepath = saveSession();
            addSystemMessage(`Session saved to ${filepath}`);
          } catch (err) {
            addSystemMessage("Error: Failed to save session.");
          }
          return;
        }
        if (cmd === "/model") {
          const modelList = MODELS2.map(
            (m, i) => `  ${i + 1}) ${m.label}${m.id === config2.model ? "  \u2713" : ""}`
          ).join("\n");
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content: `Switch model:
${modelList}

Type: /model 1, /model 2, or /model 3`
            }
          ]);
          return;
        }
        if (cmd.startsWith("/model ")) {
          const choice = parseInt(cmd.split(" ")[1], 10);
          if (choice >= 1 && choice <= MODELS2.length) {
            const newModel = MODELS2[choice - 1].id;
            const newConfig = { ...config2, model: newModel };
            setConfig(newConfig);
            saveConfig({ model: newModel });
            addSystemMessage(`Model switched to ${newModel}`);
          } else {
            addSystemMessage("Invalid choice. Use /model 1, 2, or 3.");
          }
          return;
        }
        if (cmd === "/theme") {
          const themeNames = getThemeNames();
          const themeList = themeNames.map((t) => `  ${t}${t === config2.theme ? "  \u2713" : ""}`).join("\n");
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content: `Available themes:
${themeList}

Type: /theme dark, /theme neon, /theme retro, or /theme light`
            }
          ]);
          return;
        }
        if (cmd.startsWith("/theme ")) {
          const choice = cmd.split(" ")[1];
          const validThemes = getThemeNames();
          if (validThemes.includes(choice)) {
            const newConfig = { ...config2, theme: choice };
            setConfig(newConfig);
            saveConfig({ theme: choice });
            addSystemMessage(`Theme switched to ${choice}`);
          } else {
            addSystemMessage(`Invalid theme. Options: ${validThemes.join(", ")}`);
          }
          return;
        }
        if (cmd === "/key") {
          const maskedKey = config2.apiKey ? config2.apiKey.slice(0, 10) + "..." + config2.apiKey.slice(-4) : "Not set";
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content: `Current API key: ${maskedKey}

To change your key, edit ~/.config/corex/config.json or delete it and restart COREX to re-run the setup wizard.`
            }
          ]);
          return;
        }
        addSystemMessage(`Unknown command: ${trimmed}. Type /help for available commands.`);
        return;
      }
      const userMsg = { role: "user", content: trimmed };
      setMessages((prev) => [...prev, userMsg]);
      addMessage("user", trimmed);
      setIsThinking(true);
      setStreamingText("");
      const history2 = getHistory().slice(0, -1);
      await sendMessage(
        history2,
        trimmed,
        config2,
        // onToken
        (token) => {
          setIsThinking(false);
          setStreamingText((prev) => prev + token);
        },
        // onComplete
        (fullText, usage) => {
          setIsThinking(false);
          setStreamingText("");
          const assistantMsg = { role: "assistant", content: fullText };
          setMessages((prev) => [...prev, assistantMsg]);
          addMessage("assistant", fullText);
          setTotalTokens((prev) => prev + usage.totalTokens);
        },
        // onError
        (error) => {
          setIsThinking(false);
          setStreamingText("");
          setMessages((prev) => [
            ...prev,
            { role: "assistant", content: `\u26A0 ${error.message}` }
          ]);
        }
      );
    },
    [config2, isThinking, inputHistory, exit]
  );
  return /* @__PURE__ */ import_react6.default.createElement(import_ink6.Box, { flexDirection: "column", height: process.stdout.rows || 24 }, /* @__PURE__ */ import_react6.default.createElement(Header_default, { theme }), /* @__PURE__ */ import_react6.default.createElement(
    ChatHistory_default,
    {
      messages,
      theme,
      isThinking,
      streamingText,
      userName: config2.userName
    }
  ), systemMessages.length > 0 && /* @__PURE__ */ import_react6.default.createElement(import_ink6.Box, { flexDirection: "column", marginBottom: 0 }, systemMessages.slice(-3).map((msg, i) => /* @__PURE__ */ import_react6.default.createElement(import_ink6.Text, { key: i, color: theme.accent, dimColor: true }, "\u2139 ", msg))), /* @__PURE__ */ import_react6.default.createElement(
    InputBar_default,
    {
      value: inputValue,
      onChange: setInputValue,
      onSubmit: handleSubmit,
      theme,
      isDisabled: isThinking
    }
  ), /* @__PURE__ */ import_react6.default.createElement(
    StatusBar_default,
    {
      model: config2.model,
      totalTokens,
      themeName: config2.theme,
      theme
    }
  ));
};
var app_default = App;

// src/index.ts
import_dotenv.default.config();
var nodeVersion = parseInt(process.version.slice(1).split(".")[0], 10);
if (nodeVersion < 18) {
  console.error("COREX requires Node.js 18 or higher.");
  process.exit(1);
}
async function main() {
  try {
    if (isFirstRun()) {
      await runFirstRunWizard();
    }
    const config2 = loadConfig();
    if (process.env.ANTHROPIC_API_KEY && !config2.apiKey) {
      config2.apiKey = process.env.ANTHROPIC_API_KEY;
    }
    initAI(config2.apiKey);
    process.stdout.write("\x1B[2J\x1B[0f");
    const { waitUntilExit } = (0, import_ink7.render)(import_react7.default.createElement(app_default, { config: config2 }));
    await waitUntilExit();
  } catch (err) {
    console.error("Failed to start COREX:", err.message);
    process.exit(1);
  }
}
main();
