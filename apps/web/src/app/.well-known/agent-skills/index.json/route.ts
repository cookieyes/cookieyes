import { readSkill, SKILLS } from "@/lib/agent-skills";
import { SITE_URL } from "@/lib/site";

export const dynamic = "force-static";

export async function GET() {
  const skills = await Promise.all(
    SKILLS.map(async (name) => {
      const skill = await readSkill(name);
      return {
        name,
        type: "skill-md",
        description: skill.description,
        url: `${SITE_URL}/.well-known/agent-skills/${name}/SKILL.md`,
        digest: skill.digest,
      };
    }),
  );
  const index = { $schema: "https://schemas.agentskills.io/discovery/0.2.0/schema.json", skills };
  return new Response(JSON.stringify(index, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
