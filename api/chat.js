const FALLBACK_MODELS = [
  'gemini-2.0-flash',
  'gemini-2.5-flash-preview-04-17',
  'gemini-2.0-flash-lite',
  'gemini-1.5-flash',
];

async function callGemini(model, message, apiKey) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: `Bạn là trợ lý AI chuyên gia về AI và AI Agent, hỗ trợ học viên lớp Agent SEE của Trăng Đen.
Trả lời bằng tiếng Việt, ngắn gọn, dễ hiểu cho người không có nền tảng kỹ thuật.
Tập trung vào các chủ đề: AI, AI Agent, LLM, prompt engineering, automation, n8n, Make, Zapier, Dify.
Nếu câu hỏi ngoài chủ đề, lịch sự hướng người dùng quay lại chủ đề AI và AI Agent.` }]
        },
        contents: [{ parts: [{ text: message }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 1024 }
      })
    }
  );
  const data = await response.json();
  if (!response.ok) {
    const errMsg = data.error?.message || '';
    const isQuotaError = errMsg.includes('quota') || errMsg.includes('RESOURCE_EXHAUSTED') || response.status === 429;
    const isNotFound = errMsg.includes('not found') || response.status === 404;
    return { success: false, quotaError: isQuotaError, notFound: isNotFound, message: errMsg };
  }
  const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Không có phản hồi';
  return { success: true, reply, model };
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { message, password, model } = req.body;
  if (!password || password !== process.env.CHAT_PASSWORD) return res.status(401).json({ error: 'Mật khẩu không đúng' });
  if (!message || message.trim() === '') return res.status(400).json({ error: 'Tin nhắn không được để trống' });

  const apiKey = process.env.GEMINI_API_KEY;
  const preferred = model || 'gemini-2.0-flash';
  const tryList = [preferred, ...FALLBACK_MODELS.filter(m => m !== preferred)];

  for (const m of tryList) {
    const result = await callGemini(m, message, apiKey);
    if (result.success) return res.status(200).json({ reply: result.reply, model: m });
    if (!result.quotaError && !result.notFound) return res.status(500).json({ error: 'Lỗi server: ' + result.message });
  }
  return res.status(429).json({ error: 'Tất cả model đều đang bận, vui lòng thử lại sau vài phút.' });
};
