const FALLBACK_MODELS = [
  'llama-3.3-70b-versatile',
  'llama-3.1-8b-instant',
  'gemma2-9b-it',
  'mixtral-8x7b-32768',
];

async function callGroq(model, message, apiKey) {
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: 'system',
          content: `Bạn là trợ lý AI chuyên gia về AI và AI Agent, hỗ trợ học viên lớp Agent SEE của Trăng Đen.
Trả lời bằng tiếng Việt, ngắn gọn, dễ hiểu cho người không có nền tảng kỹ thuật.
Tập trung vào các chủ đề: AI, AI Agent, LLM, prompt engineering, automation, n8n, Make, Zapier, Dify.
Nếu câu hỏi ngoài chủ đề, lịch sự hướng người dùng quay lại chủ đề AI và AI Agent.`
        },
        { role: 'user', content: message }
      ],
      temperature: 0.7,
      max_tokens: 1024,
    })
  });

  const data = await response.json();
  if (!response.ok) {
    const errMsg = data.error?.message || '';
    const isQuotaError = response.status === 429 || errMsg.includes('quota') || errMsg.includes('rate');
    return { success: false, quotaError: isQuotaError, message: errMsg };
  }
  const reply = data.choices?.[0]?.message?.content || 'Không có phản hồi';
  return { success: true, reply, model };
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { message, password, model } = req.body;
  if (!password || password !== process.env.CHAT_PASSWORD) return res.status(401).json({ error: 'Mật khẩu không đúng' });
  if (!message || message.trim() === '') return res.status(400).json({ error: 'Tin nhắn không được để trống' });

  const apiKey = process.env.GROQ_API_KEY;
  const preferred = model || 'llama-3.3-70b-versatile';
  const tryList = [preferred, ...FALLBACK_MODELS.filter(m => m !== preferred)];

  for (const m of tryList) {
    const result = await callGroq(m, message, apiKey);
    if (result.success) return res.status(200).json({ reply: result.reply, model: m });
    if (!result.quotaError) return res.status(500).json({ error: 'Lỗi server: ' + result.message });
  }
  return res.status(429).json({ error: 'Tất cả model đều đang bận, vui lòng thử lại sau.' });
};
