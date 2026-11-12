// @ts-check
const fs = require("fs");
const path = require("path");

/**
 * Writes a concise PASS/FAIL markdown summary for Smart Links QA.
 */
class SmartLinksSummaryReporter {
  constructor() {
    this.rows = [];
  }

  onTestEnd(test, result) {
    const title = test.title;
    const project = test.parent?.project()?.name || "";
    this.rows.push({
      title,
      project,
      status: result.status,
      duration: result.duration,
      error: result.errors?.[0]?.message?.split("\n")[0] || ""
    });
  }

  async onEnd(result) {
    const outDir = path.join(process.cwd(), "test-results");
    fs.mkdirSync(outDir, { recursive: true });
    const lines = [
      "# RoamXP Smart Links QA Summary",
      "",
      `Overall: **${result.status}**`,
      "",
      "| Test | Project | Result | Duration | Notes |",
      "|------|---------|--------|----------|-------|"
    ];
    for (const row of this.rows) {
      lines.push(
        `| ${row.title.replace(/\|/g, "/")} | ${row.project} | ${row.status.toUpperCase()} | ${row.duration}ms | ${row.error.replace(/\|/g, "/").slice(0, 120)} |`
      );
    }
    lines.push("");
    lines.push(
      "_Browser simulation does not prove native App Store / Play opening on physical devices._"
    );
    const md = lines.join("\n");
    fs.writeFileSync(path.join(outDir, "smart-links-summary.md"), md);
    // Also echo a short console table
    console.log("\n===== SMART LINKS QA SUMMARY =====");
    console.log(`Overall: ${result.status}`);
    for (const row of this.rows) {
      console.log(
        `${row.status === "passed" ? "PASS" : "FAIL"} | ${row.project} | ${row.title}`
      );
    }
    console.log(`Report: ${path.join(outDir, "smart-links-summary.md")}`);
    console.log("==================================\n");
  }
}

module.exports = SmartLinksSummaryReporter;
