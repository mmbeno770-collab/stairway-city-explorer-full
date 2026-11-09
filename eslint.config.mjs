const browserGlobals = [
  "window",
  "document",
  "console",
  "performance",
  "setTimeout",
  "setInterval",
  "clearInterval",
  "devicePixelRatio",
  "MutationObserver",
  "HTMLElement"
];

const globals = Object.fromEntries(browserGlobals.map((name) => [name, "readonly"]));

export default [
  {
    files: ["main.js", "game/**/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals
    },
    rules: {
      "no-undef": "error",
      "no-unreachable": "error",
      "no-dupe-keys": "error",
      "no-dupe-args": "error",
      "valid-typeof": "error"
    }
  }
];
