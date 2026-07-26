import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";
import {
  parseListPage,
  parseRelativeDate,
  buildSearchUrl,
} from "@/lib/scraper/adapters/profesia";

/**
 * Chráni parser Profesia pred MOJIMI (AI) regresiami — keby som pri
 * budúcej úprave pokazil selektory, tichý dôsledok je "0 ponúk" (R4).
 * Tento test to zmení na hlasnú červenú CI.
 */
const fixtureHtml = readFileSync(
  resolve(__dirname, "fixtures/profesia-list.html"),
  "utf8"
);

describe("parseListPage", () => {
  const postings = parseListPage(fixtureHtml);

  it("vyparsuje 2 ponuky (a preskočí riadok bez ponuky)", () => {
    expect(postings).toHaveLength(2);
  });

  it("prečíta názov, firmu a lokalitu prvej ponuky", () => {
    expect(postings[0].title).toBe("Frontend Developer (React / TypeScript)");
    expect(postings[0].company).toBe("Firma A, s. r. o.");
    expect(postings[0].location).toContain("Bratislava");
  });

  it("prečíta plat, keď je uvedený, a null keď nie je", () => {
    expect(postings[0].salary).toContain("3 000 EUR");
    expect(postings[1].salary).toBeNull();
  });

  it("odstráni tracking parametre (search_id) z URL", () => {
    expect(postings[0].url).not.toContain("search_id");
    expect(postings[0].url).toContain("/praca/firma-a/O5277302");
  });

  it("označí zdroj ako profesia", () => {
    expect(postings.every((p) => p.source === "profesia")).toBe(true);
  });
});

describe("parseRelativeDate — slovenské relatívne dátumy", () => {
  const isoDaysAgo = (n: number) =>
    new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  it("'dnes' → dnešný dátum", () => {
    expect(parseRelativeDate("dnes")).toBe(isoDaysAgo(0));
  });

  it("'včera' → včerajší dátum", () => {
    expect(parseRelativeDate("včera")).toBe(isoDaysAgo(1));
  });

  it("'pred 3 dňami' → pred 3 dňami", () => {
    expect(parseRelativeDate("pred 3 dňami")).toBe(isoDaysAgo(3));
  });

  it("'Pred mesiacom' → ~30 dní dozadu", () => {
    expect(parseRelativeDate("Pred mesiacom")).toBe(isoDaysAgo(30));
  });

  it("neznámy text → null (nie pád)", () => {
    expect(parseRelativeDate("kedysi dávno")).toBeNull();
    expect(parseRelativeDate(null)).toBeNull();
  });
});

describe("buildSearchUrl", () => {
  it("keyword ide ako parameter, lokalita ako path slug", () => {
    const url = buildSearchUrl({ keyword: "react", location: "Bratislava" }, 1);
    expect(url).toContain("/praca/bratislava/");
    expect(url).toContain("search_anywhere=react");
  });

  it("bez lokality použije všeobecný /praca/ path", () => {
    const url = buildSearchUrl({ keyword: "účtovník" }, 1);
    expect(url).toContain("/praca/?");
  });

  it("stránkovanie sa pridá až od strany 2", () => {
    expect(buildSearchUrl({ keyword: "x" }, 1)).not.toContain("page_num");
    expect(buildSearchUrl({ keyword: "x" }, 2)).toContain("page_num=2");
  });
});
