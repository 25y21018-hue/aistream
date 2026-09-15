import Groq from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

export default {
  async fetch(request) {
    if (request.method !== "POST") {
      return new Response(
        JSON.stringify({
          error: "POST 요청만 가능합니다."
        }),
        {
          status: 405,
          headers: {
            "Content-Type": "application/json"
          }
        }
      );
    }

    try {
      const body = await request.json();
      const { type, chat, answer } = body;

      // ==============================
      // AI 시청자 채팅
      // ==============================
      if (type === "viewer") {
        const completion = await groq.chat.completions.create({
          model: "openai/gpt-oss-20b",

          messages: [
            {
              role: "system",
              content: `
너는 인터넷 방송을 보고 있는 가상의 한국인 시청자다.

방송 채팅창에 실제로 올라올 법한 짧은 메시지를 하나 만들어라.

조건:
- 반드시 한국어
- 실제 인터넷 방송 채팅처럼 자연스럽게
- 너무 길지 않게
- 한 문장 정도
- 질문, 리액션, 장난, 게임 이야기, 일상 이야기 등을 다양하게 사용
- 매번 다른 내용
- 방송인이 답변하기 좋은 내용
- 설명하지 말고 채팅 메시지만 출력
`
            }
          ],

          temperature: 1.2,
          max_completion_tokens: 100
        });

        const result =
          completion.choices[0]?.message?.content?.trim() || "";

        return new Response(
          JSON.stringify({ result }),
          {
            status: 200,
            headers: {
              "Content-Type": "application/json"
            }
          }
        );
      }

      // ==============================
      // AI 방송 답변 분석
      // ==============================
      if (type === "feedback") {
        if (!chat || !answer) {
          return new Response(
            JSON.stringify({
              error: "채팅과 답변이 필요합니다."
            }),
            {
              status: 400,
              headers: {
                "Content-Type": "application/json"
              }
            }
          );
        }

        const completion = await groq.chat.completions.create({
          model: "openai/gpt-oss-20b",

          messages: [
            {
              role: "system",
              content: `
너는 인터넷 방송인을 훈련시키는 전문 방송 코치다.

시청자의 채팅과 방송인의 답변을 보고 방송 진행 능력을 평가한다.

평가 기준:

communication:
시청자와 얼마나 잘 소통했는가

natural:
답변이 얼마나 자연스러운가

fun:
얼마나 재미있고 방송에 적합한가

conversation:
대화를 계속 이어갈 수 있는 답변인가

각 점수는 0~100 사이의 정수다.

그리고 짧은 피드백과 더 좋은 답변 예시를 작성한다.

반드시 JSON만 출력한다.

형식:

{
  "communication": 0,
  "natural": 0,
  "fun": 0,
  "conversation": 0,
  "feedback": "피드백",
  "betterAnswer": "더 좋은 답변 예시"
}
`
            },

            {
              role: "user",
              content: `
시청자 채팅:
${chat}

방송인의 답변:
${answer}
`
            }
          ],

          temperature: 0.4,
          max_completion_tokens: 500,

          response_format: {
            type: "json_object"
          }
        });

        const result =
          completion.choices[0]?.message?.content || "{}";

        return new Response(
          JSON.stringify({ result }),
          {
            status: 200,
            headers: {
              "Content-Type": "application/json"
            }
          }
        );
      }

      return new Response(
        JSON.stringify({
          error: "알 수 없는 요청입니다."
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json"
          }
        }
      );

    } catch (error) {
      console.error("Groq API Error:", error);

      return new Response(
        JSON.stringify({
          error: "Groq API 요청에 실패했습니다.",
          detail: error.message
        }),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json"
          }
        }
      );
    }
  }
};