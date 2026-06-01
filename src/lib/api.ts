import { useAuthStore } from "../store/authStore";

export interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

const SYSTEM_PROMPTS: Record<string, string> = {
  define: "You are a data analysis coach helping the user define their problem. Ask clarifying questions, help them narrow their scope, and ensure they have clear success criteria. Be encouraging and beginner-friendly.",
  collect: "You are helping the user connect and understand their data sources. Explain what different data types mean, help troubleshoot connection issues, and suggest what data they might need.",
  clean: "You are a data quality expert. Help the user identify and fix data issues like nulls, duplicates, type mismatches, and outliers. Explain why clean data matters.",
  analyze: "You are a data analyst assistant. Help write SQL queries, explain Python pandas code, interpret results, and suggest analytical approaches. Adapt your language to the user's skill level.",
  visualize: "You are a data visualization expert. Recommend the right chart type for the data, explain design choices, and help the user tell a clear story with their data.",
  report: "You are helping the user communicate their findings. Help summarize key insights, write clear narratives, and tailor the message to their audience.",
  general: "You are DataFlow Assistant, an AI helper built into a data analytics suite. Help users at any skill level with data analysis, SQL, Python, visualization, and interpretation.",
};

export async function sendMessage(
  messages: Message[],
  context: string = "general",
  onChunk?: (chunk: string) => void
): Promise<string> {
  const apiKey = useAuthStore.getState().openaiApiKey;

  if (!apiKey) {
    throw new Error("No OpenAI API key set. Please add your key in Settings.");
  }

  const systemMessage: Message = {
    role: "system",
    content: SYSTEM_PROMPTS[context] || SYSTEM_PROMPTS.general,
  };

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o",
      messages: [systemMessage, ...messages],
      stream: !!onChunk,
      max_tokens: 1500,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error?.message || "OpenAI API error");
  }

  if (onChunk && response.body) {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullText = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split("\n").filter((l) => l.startsWith("data: "));

      for (const line of lines) {
        const data = line.slice(6);
        if (data === "[DONE]") continue;
        try {
          const parsed = JSON.parse(data);
          const text = parsed.choices[0]?.delta?.content || "";
          fullText += text;
          onChunk(text);
        } catch {
          // skip malformed chunks
        }
      }
    }
    return fullText;
  }

  const data = await response.json();
  return data.choices[0]?.message?.content || "";
}

export async function generateInsights(data: string, question: string): Promise<string> {
  return sendMessage(
    [
      {
        role: "user",
        content: `Given this data summary:\n\n${data}\n\nProvide 3-5 key insights that answer: "${question}". Be concise and specific.`,
      },
    ],
    "report"
  );
}
