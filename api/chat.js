module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { message, password, model } = req.body;

  if (!password || password !== process.env.CHAT_PASSWORD) {
    return res.status(401).json({ error: 'Mật khẩu không đúng' });
  }

  if (!message || message.trim() === '') {
    return res.status(400).json({ error: 'Tin nhắn không được để trống' });
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model || 'gemini-1.5-flash'}:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: {
            parts: [{
              text: `Bạn là trợ lý AI chuyên gia về AI và AI Agent, hỗ trợ học viên lớp Agent SEE của Trăng Đen.
Trả lời bằng tiếng Việt, ngắn gọn, dễ hiểu cho người không có nền tảng kỹ thuật.
Tập trung vào các chủ đề: AI, AI Agent, LLM, prompt engineering, automation, n8n, Make, Zapier, Dify.
Nếu câu hỏi ngoài chủ đề, lịch sự hướng người dùng quay lại chủ đề AI và AI Agent.`
            }]
          },
          contents: [{ parts: [{ text: message }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 1024 }
        })
      }
    );

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error?.message || 'Gemini API error');
    }

    const data = await response.json();
    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Không có phản hồi';
    return res.status(200).json({ reply });

  } catch (error) {
    return res.status(500).json({ error: 'Lỗi server: ' + error.message });
  }
};
