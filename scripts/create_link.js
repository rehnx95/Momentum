import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { fetchLeetCodeCatalog } from "./leetcode-api.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE_FILE = path.join(ROOT, "source", "dsa.txt");
const SOURCE_MARKDOWN_FILE = path.join(ROOT, "source", "dsa.md");
const MARKDOWN_FILE = path.join(ROOT, "dsa.md");
const LINK_MAP_FILE = path.join(ROOT, "src", "features", "sheets", "leetcodeProblemLinks.json");
const DIFFICULTY_MAP_FILE = path.join(ROOT, "src", "features", "sheets", "dsaProblemDifficulties.json");
const SHEET_FILE = path.join(ROOT, "src", "features", "sheets", "data", "dsa.json");

function parsePreviousMarkdown(markdown) {
  const rows = new Map();
  for (const line of markdown.split(/\r?\n/)) {
    const match = line.match(/^\s*-\s+(\d+)\.\s+(.*)$/);
    if (!match) continue;

    const difficulty = match[2].match(/\[(Easy|Medium|Hard)\]/)?.[1] ?? null;
    const note = match[2].match(/\s+↪\s+(.+)$/)?.[1] ?? null;
    rows.set(Number(match[1]), { difficulty, note });
  }
  return rows;
}

function parseSourceRow(line) {
  const match = line.match(/^\s*(\d+)\.\s+(.+?)(?:\s+\(LC\s*(\d+)\))?\s*$/);
  if (!match) return null;
  return {
    number: Number(match[1]),
    title: match[2].trim(),
    leetCodeId: match[3] ? Number(match[3]) : null,
  };
}

async function main() {
  const source = fs.readFileSync(SOURCE_FILE, "utf8");
  const previous = fs.existsSync(MARKDOWN_FILE)
    ? parsePreviousMarkdown(fs.readFileSync(MARKDOWN_FILE, "utf8"))
    : new Map();
  const sourceMetadata = fs.existsSync(SOURCE_MARKDOWN_FILE)
    ? parsePreviousMarkdown(fs.readFileSync(SOURCE_MARKDOWN_FILE, "utf8"))
    : new Map();
  const sheet = JSON.parse(fs.readFileSync(SHEET_FILE, "utf8"));
  const sheetProblems = sheet.steps.flatMap((step) =>
    step.subsections.flatMap((subsection) => subsection.problems),
  );
  const catalog = await fetchLeetCodeCatalog();
  const links = {};
  const difficulties = {};
  const output = [
    "# Striver's A2Z DSA Sheet — LeetCode Edition",
    "",
    "Legend: `[Easy]` `[Medium]` `[Hard]` show LeetCode difficulty for linked problems; unlinked difficulty is retained from this sheet. 🔒 = LeetCode Premium; ↪ = a related replacement.",
    "",
  ];
  let linkedCount = 0;
  let unlinkedCount = 0;
  let problemIndex = 0;

  for (const line of source.split(/\r?\n/)) {
    if (!line.trim()) {
      output.push("");
      continue;
    }

    if (/^Step\s+\d+\s+[—–-]\s+/.test(line.trim())) {
      output.push(`## ${line.trim()}`);
      continue;
    }

    if (/^\d+\.\d+\s+[—–-]\s+/.test(line.trim())) {
      output.push(`### ${line.trim()}`);
      continue;
    }

    const row = parseSourceRow(line);
    if (!row) {
      if (!output.length || output[output.length - 1] !== line.trim()) output.push(line.trim());
      continue;
    }
    const problem = sheetProblems[problemIndex];
    if (!problem) {
      throw new Error(`The generated DSA JSON is missing source problem ${row.number}.`);
    }
    problemIndex += 1;

    const prior = previous.get(row.number);
    const reference = sourceMetadata.get(row.number);
    const noteText = reference?.note ?? prior?.note;
    const note = noteText ? ` ↪ ${noteText}` : "";
    if (row.leetCodeId !== null) {
      const question = catalog.byId.get(row.leetCodeId);
      if (!question) {
        throw new Error(`Problem ${row.number} references unknown LeetCode ID ${row.leetCodeId}.`);
      }
      const url = `https://leetcode.com/problems/${question.titleSlug}/`;
      links[row.leetCodeId] = { url, difficulty: question.difficulty };
      difficulties[problem.id] = question.difficulty;
      difficulties[row.number] = question.difficulty;
      const premium = question.isPaidOnly ? " 🔒" : "";
      output.push(
        `- ${row.number}. [${row.title}](${url}) [${question.difficulty}]${premium}${note}`,
      );
      linkedCount += 1;
    } else {
      const difficulty = reference?.difficulty ?? prior?.difficulty;
      if (!difficulty) {
        throw new Error(`Problem ${row.number} has no difficulty in source/dsa.md.`);
      }
      difficulties[problem.id] = difficulty;
      difficulties[row.number] = difficulty;
      output.push(`- ${row.number}. ${row.title} [${difficulty}]${note}`);
      unlinkedCount += 1;
    }
  }

  if (problemIndex !== sheetProblems.length) {
    throw new Error("The generated DSA JSON does not match the number of source problems.");
  }

  fs.writeFileSync(MARKDOWN_FILE, `${output.join("\n").trimEnd()}\n`, "utf8");
  fs.writeFileSync(LINK_MAP_FILE, `${JSON.stringify(links, null, 2)}\n`, "utf8");
  fs.writeFileSync(DIFFICULTY_MAP_FILE, `${JSON.stringify(difficulties, null, 2)}\n`, "utf8");
  console.log(
    `Wrote ${path.relative(ROOT, MARKDOWN_FILE)} with ${linkedCount} LeetCode links and ${unlinkedCount} unlinked items.`,
  );
  console.log(`Updated ${Object.keys(links).length} unique links in ${path.relative(ROOT, LINK_MAP_FILE)}.`);
  console.log(`Updated ${problemIndex} problem difficulties in ${path.relative(ROOT, DIFFICULTY_MAP_FILE)}.`);
}

main().catch((error) => {
  console.error(`Could not create LeetCode links: ${error.message}`);
  process.exitCode = 1;
});
