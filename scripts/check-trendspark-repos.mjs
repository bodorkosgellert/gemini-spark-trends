import { execSync } from "node:child_process";

function gh(path) {
  return execSync(`gh api "${path}"`, { encoding: "utf8" });
}

const old = JSON.parse(gh("repos/bodorkosgellert/trendspark/commits?per_page=5"));
console.log("=== bodorkosgellert/trendspark (original) ===");
for (const c of old) {
  console.log(c.commit.author.date, c.commit.message.split("\n")[0]);
}

const cur = JSON.parse(gh("repos/bodorkosgellert/trendspark-22c0c6/commits?per_page=8"));
console.log("\n=== bodorkosgellert/trendspark-22c0c6 (active Bilt) ===");
for (const c of cur) {
  console.log(c.commit.author.date, c.sha.slice(0, 7), c.commit.message.split("\n")[0]);
}

const file = JSON.parse(
  gh("repos/bodorkosgellert/trendspark-22c0c6/contents/docs/HANDOVER.md?ref=main"),
);
const md = Buffer.from(file.content.replace(/\n/g, ""), "base64").toString("utf8");
console.log("\n=== HANDOVER.md (first 70 lines) ===");
console.log(md.split(/\r?\n/).slice(0, 70).join("\n"));
