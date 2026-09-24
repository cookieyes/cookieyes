import { notFound } from "next/navigation";
import { isSkill, readSkill, SKILLS } from "@/lib/agent-skills";

export async function GET(_request: Request, { params }: { params: Promise<{ skill: string }> }) {
  const { skill } = await params;
  if (!isSkill(skill)) notFound();

  const { content } = await readSkill(skill);
  return new Response(content, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=3600",
    },
  });
}

export function generateStaticParams() {
  return SKILLS.map((skill) => ({ skill }));
}
