import Groq from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

export async function POST(request) {
  try {
    const { type, chat, answer } = await request.json();

    // ==========================================
    // AI 시청자 채팅 생성
    // ==========================================
    if (type === "viewer") {
      const completion = await groq.chat.completions.create({
        model: "openai/gpt-oss-20b",

        messages: [
          {
            role: "user",
            content: `
너는 인터넷 방송을 보고 있는 가상의 한국인 시청자다.

방송 채팅창에 실제로 올라올 법한 메시지를 딱 1개 만들어라.

[중요]
- 반드시 한국어
- 5~30자 정도의 짧은 채팅
- 실제 인터넷 방송 채팅처럼 자연스럽게
- 매번 다른 내용
- 항상 질문만 하지 말 것
- 질문, 감탄, 장난, 리액션, 게임 이야기, 일상 이야기 등을 섞을 것
- ㅋㅋ, ㄹㅇ, 뭐임, 아, 근데 등의 인터넷 채팅 표현을 가끔 사용할 것
- 너무 과하게 사용하지 말 것
- 문어체나 AI 같은 표현 금지
- 설명 금지
- 따옴표 금지
- 채팅 메시지만 출력

시청자 유형:
- 평범한 시청자
- 장난치는 시청자
- 게임에 관심 있는 시청자
- 처음 들어온 시청자
- 방송을 오래 본 시청자
- 대화를 걸고 싶은 시청자

이 중 하나의 느낌을 랜덤하게 사용해라.

예시:
오늘 뭐함?
ㅋㅋ 방금 뭐였냐
아 이건 좀 웃기네
형 이 게임 처음임?
오늘 방송 늦었네
저거 어떻게 한 거임?
와 방금 개잘했는데
나 오늘 처음 왔는데 재밌네
`
          }
        ],

        temperature: 0.8,
        reasoning_effort: "low",
        max_completion_tokens: 300
      });

      const result =
        completion.choices[0]?.message?.content?.trim() || "";

      if (!result) {
        return Response.json(
          {
            error: "AI가 빈 채팅을 반환했습니다."
          },
          { status: 502 }
        );
      }

      return Response.json({
        result
      });
    }

    // ==========================================
    // 방송인 답변 분석
    // ==========================================
    if (type === "feedback") {
      if (!chat || !answer) {
        return Response.json(
          {
            error: "채팅과 답변이 필요합니다."
          },
          { status: 400 }
        );
      }

      const completion = await groq.chat.completions.create({
        model: "openai/gpt-oss-20b",

        messages: [
          {
            role: "user",
            content: `
너는 인터넷 방송인을 훈련시키는 전문 방송 코치다.

시청자의 채팅과 방송인의 답변을 보고 방송 진행 능력을 평가해라.

평가 항목:

1. communication
시청자와 얼마나 잘 소통했는가

2. natural
답변이 얼마나 자연스러운가

3. fun
얼마나 재미있고 방송에 적합한가

4. conversation
대화를 계속 이어갈 수 있는 답변인가

각 점수는 반드시 0~100 사이의 정수로 작성한다.

그리고 다음도 작성한다.

- 잘한 점
- 개선할 점
- 실제 방송에서 사용할 수 있는 더 좋은 답변 예시

반드시 아래 JSON 형식으로만 출력한다.

{
  "communication": 0,
  "natural": 0,
  "fun": 0,
  "conversation": 0,
  "feedback": "짧은 피드백",
  "betterAnswer": "더 좋은 답변 예시"
}

시청자 채팅:
${chat}

방송인의 답변:
${answer}
`
          }
        ],

        temperature: 0.4,
        reasoning_effort: "low",
        max_completion_tokens: 1000,

        response_format: {
          type: "json_object"
        }
      });

      const result =
        completion.choices[0]?.message?.content || "";

      if (!result) {
        return Response.json(
          {
            error: "AI가 분석 결과를 반환하지 않았습니다."
          },
          { status: 502 }
        );
      }

      return Response.json({
        result
      });
    }

    // ==========================================
    // 잘못된 요청
    // ==========================================
    return Response.json(
      {
        error: "알 수 없는 요청입니다."
      },
      { status: 400 }
    );

  } catch (error) {
    console.error("Groq API Error:", error);

    return Response.json(
      {
        error: "Groq API 요청에 실패했습니다.",
        detail: error.message
      },
      { status: 500 }
    );
  }
}