import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { fetchLeetCodeCatalog } from "./leetcode-api.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE_FILE = path.join(ROOT, "source", "dsa.txt");
const MARKDOWN_FILE = path.join(ROOT, "dsa.md");
const SHEET_FILE = path.join(ROOT, "src", "features", "sheets", "data", "dsa.json");
const REPORT_FILE = path.join(ROOT, "link_review.txt");

function parseSource(source) {
  const rows = new Map();
  for (const line of source.split(/\r?\n/)) {
    const match = line.match(/^\s*(\d+)\.\s+(.+?)(?:\s+\(LC\s*(\d+)\))?\s*$/);
    if (!match) continue;
    rows.set(Number(match[1]), {
      title: match[2].trim(),
      leetCodeId: match[3] ? Number(match[3]) : null,
    });
  }
  return rows;
}

function parseMarkdown(markdown) {
  const rows = new Map();
  for (const line of markdown.split(/\r?\n/)) {
    const match = line.match(/^\s*-\s+(\d+)\.\s+(.*)$/);
    if (!match) continue;
    const body = match[2];
    const link = body.match(/\[([^\]]+)\]\((https:\/\/leetcode\.com\/problems\/([^/]+)\/?)\)/);
    rows.set(Number(match[1]), {
      title: link?.[1] ?? body.replace(/\s+\[(Easy|Medium|Hard)\].*$/, "").trim(),
      url: link?.[2] ?? null,
      slug: link?.[3] ?? null,
      difficulty: body.match(/\[(Easy|Medium|Hard)\]/)?.[1] ?? null,
      premium: body.includes("🔒"),
    });
  }
  return rows;
}

function addIssue(issues, rowNumber, message) {
  issues.push(`Problem ${rowNumber}: ${message}`);
}

async function main() {
  const sourceRows = parseSource(fs.readFileSync(SOURCE_FILE, "utf8"));
  const markdownRows = parseMarkdown(fs.readFileSync(MARKDOWN_FILE, "utf8"));
  const sheet = JSON.parse(fs.readFileSync(SHEET_FILE, "utf8"));
  const sheetProblems = sheet.steps.flatMap((step) =>
    step.subsections.flatMap((subsection) => subsection.problems),
  );
  const catalog = await fetchLeetCodeCatalog();
  const issues = [];
  const report = [
    "LeetCode link verification",
    `Catalog questions checked: ${catalog.total}`,
    `Sheet rows: ${markdownRows.size}`,
    "",
    "Item | Status | LC ID | Official title | Listed difficulty | Official difficulty | Premium | URL",
    "-----|--------|-------|----------------|-------------------|--------------------|---------|----",
  ];
  let checkedLinks = 0;

  if (sourceRows.size !== markdownRows.size) {
    issues.push(`Source has ${sourceRows.size} problem rows; Markdown has ${markdownRows.size}.`);
  }
  if (sheetProblems.length !== markdownRows.size) {
    issues.push(`Built-in DSA data has ${sheetProblems.length} problems; Markdown has ${markdownRows.size}.`);
  }

  for (const [number, markdownRow] of markdownRows) {
    const sourceRow = sourceRows.get(number);
    const sheetProblem = sheetProblems[number - 1];
    if (!sourceRow) {
      addIssue(issues, number, "missing from source/dsa.txt");
      continue;
    }

    const problems = [];
    if (sourceRow.title !== markdownRow.title) {
      problems.push("source title differs from Markdown title");
    }
    if (sheetProblem?.difficulty !== markdownRow.difficulty) {
      problems.push(`app difficulty is ${sheetProblem?.difficulty ?? "missing"}`);
    }

    if (!markdownRow.url) {
      if (sheetProblem?.link) {
        problems.push("built-in data has an unexpected LeetCode link");
      }
      if (sourceRow.leetCodeId !== null) {
        problems.push(`source has LC ${sourceRow.leetCodeId}, but Markdown has no link`);
      }
      if (problems.length) {
        for (const issue of problems) addIssue(issues, number, issue);
      }
      report.push(
        `${number} | ${problems.length ? "REVIEW" : "no link"} | — | — | ${markdownRow.difficulty ?? "missing"} | — | — | —`,
      );
      continue;
    }

    checkedLinks += 1;
    const question = catalog.bySlug.get(markdownRow.slug);
    if (!question) {
      problems.push(`LeetCode slug "${markdownRow.slug}" was not found`);
    } else {
      const id = Number(question.questionFrontendId);
      if (sourceRow.leetCodeId !== id) {
        problems.push(`source ID is ${sourceRow.leetCodeId ?? "missing"}, but URL is LC ${id}`);
      }
      if (markdownRow.difficulty !== question.difficulty) {
        problems.push(`difficulty is ${markdownRow.difficulty ?? "missing"}, expected ${question.difficulty}`);
      }
      if (markdownRow.premium !== question.isPaidOnly) {
        problems.push(`Premium marker is ${markdownRow.premium ? "present" : "missing"}`);
      }

      const expectedUrl = `https://leetcode.com/problems/${question.titleSlug}/`;
      if (markdownRow.url !== expectedUrl) {
        problems.push(`URL should be ${expectedUrl}`);
      }

      if (sheetProblem?.link?.type !== "leetcode" || sheetProblem?.link?.url !== expectedUrl) {
        problems.push(`built-in data has the wrong link for LC ${id}`);
      }
    }

    if (problems.length) {
      for (const issue of problems) addIssue(issues, number, issue);
    }

    report.push(
      `${number} | ${problems.length ? "REVIEW" : "OK"} | ${question?.questionFrontendId ?? "?"} | ${question?.title ?? markdownRow.slug} | ${markdownRow.difficulty ?? "missing"} | ${question?.difficulty ?? "unknown"} | ${question?.isPaidOnly ? "yes" : "no"} | ${markdownRow.url}`,
    );
  }

  report.push("", `Links checked: ${checkedLinks}`, `Issues: ${issues.length}`);
  if (issues.length) report.push("", "Issues:", ...issues.map((issue) => `- ${issue}`));
  fs.writeFileSync(REPORT_FILE, `${report.join("\n")}\n`, "utf8");

  console.log(`Checked ${checkedLinks} links; found ${issues.length} issue(s).`);
  console.log(`Report written to ${path.relative(ROOT, REPORT_FILE)}.`);
  if (issues.length) process.exitCode = 1;
}

main().catch((error) => {
  console.error(`Could not verify LeetCode links: ${error.message}`);
  process.exitCode = 1;
});
