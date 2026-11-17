const API_URL = "https://leetcode.com/graphql/";
const PAGE_SIZE = 100;
const REQUEST_DELAY_MS = 500;

const QUESTION_LIST_QUERY = `
  query problemsetQuestionList(
    $categorySlug: String
    $limit: Int
    $skip: Int
    $filters: QuestionListFilterInput
  ) {
    questionList(
      categorySlug: $categorySlug
      limit: $limit
      skip: $skip
      filters: $filters
    ) {
      totalNum
      data {
        questionFrontendId
        title
        titleSlug
        difficulty
        isPaidOnly
      }
    }
  }
`;

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export async function fetchLeetCodeCatalog() {
  const byId = new Map();
  const bySlug = new Map();
  let total = null;

  for (let skip = 0; total === null || skip < total; ) {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "https://leetcode.com",
        Referer: "https://leetcode.com/problemset/",
        "User-Agent": "Momentum link verifier",
      },
      body: JSON.stringify({
        query: QUESTION_LIST_QUERY,
        variables: {
          categorySlug: "",
          filters: {},
          limit: PAGE_SIZE,
          skip,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`LeetCode returned HTTP ${response.status} while loading its problem list.`);
    }

    const payload = await response.json();
    if (payload.errors?.length) {
      throw new Error(`LeetCode GraphQL error: ${payload.errors.map((error) => error.message).join("; ")}`);
    }

    const page = payload.data?.questionList;
    if (!page || !Array.isArray(page.data)) {
      throw new Error("LeetCode returned an invalid problem-list response.");
    }

    total = page.totalNum;
    for (const question of page.data) {
      const id = Number(question.questionFrontendId);
      if (!Number.isInteger(id) || !question.titleSlug) continue;
      byId.set(id, question);
      bySlug.set(question.titleSlug, question);
    }

    if (!page.data.length && skip < total) {
      throw new Error(`LeetCode returned no questions at offset ${skip} of ${total}.`);
    }

    skip += page.data.length;
    if (skip < total) await delay(REQUEST_DELAY_MS);
  }

  return { byId, bySlug, total };
}
