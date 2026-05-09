import apolloFixture from "@/fixtures/apollo.json" with { type: "json" };
import type { ApolloEnrichment } from "@/lib/types";
import { beat } from "@/agents/runner";

const TABLE = apolloFixture as Record<string, ApolloEnrichment>;

/**
 * Mocked Apollo enrichment. Real Apollo would resolve domain → org details.
 * We resolve by company name first, falling back to a synthesized record.
 */
export async function enrichCompany(company: string): Promise<ApolloEnrichment> {
  await beat(420);
  const hit = TABLE[company];
  if (hit) return hit;
  return synthesize(company);
}

function synthesize(company: string): ApolloEnrichment {
  const slug = company.toLowerCase().replace(/[^a-z0-9]+/g, "");
  return {
    domain: `${slug}.example`,
    industry: "Trade & Distribution",
    employees: 25 + Math.floor(Math.random() * 100),
    fundingStage: "bootstrapped",
    hqCountry: "SG",
    socials: {},
    techStack: ["QuickBooks"],
  };
}
