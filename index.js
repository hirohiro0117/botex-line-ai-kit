const express = require("express");
const axios = require("axios");
const line = require("@line/bot-sdk");

const app = express();
app.use(express.json());

// 環境変数（RenderのEnvironmentに設定したものを使います）
const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
};
const client = new line.Client(config);

app.post("/webhook", async (req, res) => {
  const events = req.body.events;
  if (!events || events.length === 0) return res.sendStatus(200);

  const event = events[0];
  const replyToken = event.replyToken;
  const userMessage = event.message?.text;
  const userId = event.source?.userId || "unknown-user"; // ←重要！

  if (userMessage) {
    try {
      const response = await axios.post(
        "https://api.dify.ai/v1/chat-messages",
        {
          inputs: {},
          query: userMessage,
          response_mode: "blocking",
          user: userId, // ←Difyに「誰が話してるか」を伝える
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.DIFY_API_KEY}`,
            "Content-Type": "application/json",
          },
          params: {
            agent_id: process.env.DIFY_AGENT_ID,
          },
        }
      );

      const difyReply = response.data.answer;

      await client.replyMessage(replyToken, {
        type: "text",
        text: difyReply || "すみません、うまく返答できませんでした。",
      });
    } catch (error) {
      console.error("Difyエラー: ", error.message || error);
      await client.replyMessage(replyToken, {
        type: "text",
        text: "エラーが発生しました。しばらくしてから再試行してください。",
      });
    }
  }

  res.sendStatus(200);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});