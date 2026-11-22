import dsaProblemDifficulties from "../../sheets/dsaProblemDifficulties.json";
import leetcodeProblemLinks from "../../sheets/leetcodeProblemLinks.json";

export function getProblemDifficulty(problem) {
  const problemNumber = problem.id.match(/-p(\d+)$/)?.[1];
  const leetcodeDifficulty = problem.lc ? leetcodeProblemLinks[problem.lc]?.difficulty : undefined;
  return (
    dsaProblemDifficulties[problem.id] ??
    leetcodeDifficulty ??
    dsaProblemDifficulties[problemNumber]
  );
}
