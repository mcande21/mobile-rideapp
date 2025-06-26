module.exports = {
  root: true,
  env: {
    es6: true,
    node: true,
  },
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended", // Uses the recommended rules from the @typescript-eslint/eslint-plugin
    "google",
  ],
  parser: "@typescript-eslint/parser", // Specifies the ESLint parser for TypeScript
  parserOptions: {
    project: ["tsconfig.json"], // Allows for more advanced rules
    sourceType: "module",
    ecmaVersion: 2020,
  },
  plugins: [
    "@typescript-eslint", // Specifies the ESLint plugin for TypeScript
  ],
  ignorePatterns: [
    "/lib/**/*", // Don't lint the compiled JavaScript output
  ],
  rules: {
    "quotes": ["error", "double"],
    "require-jsdoc": "off", // Often disabled for TypeScript projects
  },
};