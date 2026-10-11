import * as SecureStore from "expo-secure-store";

export type GeneratedFile = { path: string; content: string };
export type GenerationResult = {
  files: GeneratedFile[];
  sql: string | null;
  summary: string;
};

const SYSTEM_PROMPT = `You are a code generator. Given a description of an app or website, respond with ONLY valid JSON (no markdown fences, no prose) in this exact shape:
{
  "summary": "one-line description of what you built",
  "files": [{"path": "relative/path.ext", "content": "full file content"}],
  "sql": "CREATE TABLE ... (or null if no database needed)"
}
Keep the file set minimal but complete and runnable. For a website, prefer a single self-contained index.html. For an app, prefer a small set of clear files.`;

function extractJson(text: string): string {
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  return fenceMatch ? fenceMatch[1].trim() : text.trim();
}

async function generateWithClaude(prompt: string): Promise<GenerationResult> {
  const apiKey = await SecureStore.getItemAsync("CLAUDE_API_KEY");
  if (!apiKey) throw new Error("CLAUDE_API_KEY missing. Set it in Settings first.");

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 8000,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) throw new Error(`Claude generation failed (${res.status}): ${await res.text()}`);
  const data = await res.json();
  const text = data.content?.[0]?.text ?? "";
  return JSON.parse(extractJson(text));
}

async function generateWithGemini(prompt: string): Promise<GenerationResult> {
  const apiKey = await SecureStore.getItemAsync("GEMINI_API_KEY");
  if (!apiKey) throw new Error("GEMINI_API_KEY missing. Set it in Settings first.");

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{ parts: [{ text: prompt }] }],
      }),
    }
  );

  if (!res.ok) throw new Error(`Gemini generation failed (${res.status}): ${await res.text()}`);
  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  return JSON.parse(extractJson(text));
}

export async function generateCode(
  description: string,
  kind: "app" | "website",
  provider: "claude" | "gemini"
): Promise<GenerationResult> {
  const prompt = `Build this ${kind === "app" ? "mobile app" : "website"}: ${description}`;
  const result = provider === "claude" ? await generateWithClaude(prompt) : await generateWithGemini(prompt);

  if (!result.files || !Array.isArray(result.files)) {
    throw new Error("النموذج رجّع رد مش بالصيغة المتوقعة. جرب تاني أو بصياغة مختلفة.");
  }
  return result;
        }
