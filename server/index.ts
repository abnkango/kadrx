import express from "express";
import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function normalizeHistory(value) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item) => item && (item.role === "user" || item.role === "assistant") && typeof item.content === "string" && item.content.trim())
    .slice(-8)
    .map((item) => ({ role: item.role, content: item.content.trim().slice(0, 2000) }));
}

async function startServer() {
  const app = express();
  const server = createServer(app);

  app.use(express.json());

  app.post("/api/assistant/chat", async (req, res) => {
    const message = typeof req.body?.message === "string" ? req.body.message.trim() : "";
    if (!message || message.length > 2000) {
      res.status(400).json({ error: "invalid_message" });
      return;
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      res.status(503).json({ error: "assistant_unavailable", message: "المساعد غير مهيأ بعد." });
      return;
    }

    const language = req.body?.language === "en" ? "en" : "ar";
    const history = normalizeHistory(req.body?.history);
    const systemPrompt = language === "en"
      ? "You are Solar, the official AI assistant for KadrX, a recruitment platform in Syria. Reply in clear English unless the user asks for Arabic. Help users understand job searching, hiring, profiles, and how to use KadrX. Be concise, friendly, and honest. Do not invent platform data, promise a job, or claim to complete actions you cannot perform."
      : "أنت سولار (Solar)، المساعد الذكي الرسمي لمنصة كادرX للتوظيف في سوريا. أجب بالعربية الواضحة ما لم يطلب المستخدم الإنجليزية. ساعد المستخدم في البحث عن عمل، التوظيف، الملفات الشخصية، وفهم استخدام منصة كادرX. كن مختصرًا وودودًا وصادقًا. لا تخترع بيانات عن المنصة، ولا تضمن الحصول على وظيفة، ولا تدّعِ تنفيذ إجراء لا تستطيع تنفيذه.";

    try {
      const upstream = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: "Bearer " + apiKey, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "openai/gpt-oss-20b",
          temperature: 0.4,
          max_tokens: 600,
          messages: [{ role: "system", content: systemPrompt }, ...history, { role: "user", content: message }],
        }),
      });

      if (!upstream.ok) {
        res.status(502).json({ error: "assistant_provider_error", message: "تعذر الوصول إلى المساعد حاليًا. حاول مرة أخرى بعد قليل." });
        return;
      }

      const data = await upstream.json();
      const reply = data.choices?.[0]?.message?.content;
      if (typeof reply !== "string" || !reply.trim()) {
        res.status(502).json({ error: "assistant_empty_response", message: "لم تصل إجابة من المساعد. حاول مرة أخرى." });
        return;
      }

      res.json({ assistant: "Solar", reply: reply.trim() });
    } catch (_error) {
      res.status(502).json({ error: "assistant_request_failed", message: "حدث خطأ أثناء الاتصال بالمساعد. حاول مرة أخرى." });
    }
  });

  // Serve static files from dist/public in production
  const staticPath =
    process.env.NODE_ENV === "production"
      ? path.resolve(__dirname, "public")
      : path.resolve(__dirname, "..", "dist", "public");

  app.use(express.static(staticPath));

  // Handle client-side routing - serve index.html for all routes
  app.get("*", (_req, res) => {
    res.sendFile(path.join(staticPath, "index.html"));
  });

  const port = process.env.PORT || 3000;

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);