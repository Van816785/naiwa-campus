"use strict";
const fs = require("node:fs");
const names = ["TCB_SECRET_ID", "TCB_SECRET_KEY", "TCB_ENV_ID"];
const values = names.map(name => {
  const original = process.env[name] || "";
  const value = original.trim();
  if (!value) throw new Error("Missing repository Actions secret: " + name);
  if (/\s/.test(value)) throw new Error(name + " contains internal whitespace; copy only the credential value into GitHub Secrets.");
  return { name, original, value };
});
if (!process.env.GITHUB_ENV) throw new Error("GITHUB_ENV is required.");
for (const { name, original, value } of values) {
  // Register the normalized value with the runner before later commands use it.
  process.stdout.write("::add-mask::" + value.replace(/%/g, "%25") + "\n");
  fs.appendFileSync(process.env.GITHUB_ENV, name + "=" + value + "\n", "utf8");
  if (value !== original) console.log("Removed surrounding whitespace from " + name);
}
console.log("CloudBase configuration prepared.");
