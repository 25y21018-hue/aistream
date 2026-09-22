import Groq from "groq-sdk";

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY
});

export async function POST(request) {
    try {
        const body = await request.json();
        const { type } = body;

        // =========================
        // AI 시청자 생성
        // =========================
        if (type === "viewer") {
            const recentConversations = Array.isArray(body.recentConversations)
                ? body.recentConversations.slice(-5)
                : [];

            const viewerProfile = body.viewerProfile || {
                type: "일반 시청자",
                style: "자연스럽게 대화한다."
            };

            const latestConversation =
                recentConversations.length > 0
                    ? recentConversations[recentConversations.length - 1]
                    : null;

            const recentText =
                recentConversations.length > 0
                    ? recentConversations
                          .map(
                              (item, index) =>
                                  `${index + 1}. 시청자: ${item.chat}\n방송인: ${item.answer}`
                          )
                          .join("\n\n")
                    : "아직 이전 대화가 없다.";

            const latestChat = latestConversation?.chat || "";
            const latestAnswer = latestConversation?.answer || "";

            const prompt = `
너는 인터넷 방송의 실제 시청자처럼 방송인과 자연스럽게 대화하는 AI다.

중요한 목표는 "시청자 역할을 잘 연기하는 것"보다
방송인과 실제로 대화하는 것처럼 자연스럽게 반응하는 것이다.

[시청자 성격]
유형: ${viewerProfile.type}
성격: ${viewerProfile.style}

[최근 대화]
${recentText}

[가장 최근 시청자 메시지]
${latestChat}

[방송인의 가장 최근 답변]
${latestAnswer}

다음 시청자 메시지를 작성해라.

반드시 지켜야 할 규칙:

1. 방송인의 가장 최근 답변을 가장 중요하게 본다.

2. 방송인의 답변에 자연스럽게 이어갈 수 있다면 이어간다.
   하지만 억지로 이어갈 필요는 없다.

3. 방송인이 갑자기 다른 이야기를 했다면
   그 새로운 이야기를 자연스럽게 받아들인다.
   이전 주제로 억지로 되돌리지 않는다.

4. 단어 하나가 같다는 이유만으로 관련 없는 주제를 연결하지 않는다.
   예를 들어 방송인이 "밥 먹었어?"라고 물었다면
   단순히 "밥"이라는 단어가 이전 대화에 있었다는 이유로
   이전 주제와 억지로 연결하지 않는다.

5. 대화에 실제로 나오지 않은 정보는 알고 있다고 가정하지 않는다.
   게임 이름, 음식, 장소, 사람, 사건 등을 임의로 만들어내지 않는다.

6. 모르는 내용이 필요하다면 자연스럽게 질문한다.

7. 매번 질문만 하지 않는다.
   상황에 따라 짧은 반응, 의견, 농담, 공감, 질문 등을 섞는다.

8. 너무 완벽하게 논리적인 답변을 만들지 않는다.
   실제 채팅처럼 약간 가볍고 자연스럽게 말한다.

9. 같은 표현을 반복하지 않는다.

10. "ㅋㅋ", "ㅎㅎ" 같은 표현을 습관적으로 붙이지 않는다.
    필요하지 않으면 사용하지 않는다.

11. 시청자 한 명이 계속 이야기하는 것처럼 자연스럽게 유지한다.

12. 이전 대화 내용을 참고하되, 오래된 내용보다 최근 대화를 우선한다.

13. 방송인이 질문했으면 그 질문에 답하거나 자연스럽게 반응할 수 있다.

14. 방송인이 질문과 관계없는 새로운 말을 했다면
    그것을 새로운 대화 주제로 받아들일 수 있다.

15. 너무 긴 문장을 만들지 않는다.
    실제 방송 채팅처럼 짧고 자연스럽게 작성한다.

16. 이모티콘이나 과도한 특수문자를 남발하지 않는다.

17. 시청자 메시지만 출력한다.
    설명, 분석, 따옴표, "시청자:" 같은 표시를 붙이지 않는다.

18. 보통 1~2문장 정도로 작성한다.

가장 중요한 것은
"이전 대화와 무조건 연결하는 것"이 아니라
"방송인의 방금 답변을 보고 실제 사람이 자연스럽게 다음 말을 하는 것"이다.
`;

            const completion = await groq.chat.completions.create({
                model: "openai/gpt-oss-20b",
                messages: [
                    {
                        role: "system",
                        content: prompt
                    }
                ],
                temperature: 0.85,
                reasoning_effort: "low",
                max_completion_tokens: 300
            });

            const result =
                completion.choices?.[0]?.message?.content?.trim() || "";

            return Response.json({
                result
            });
        }

        // =========================
        // 배치 피드백
        // =========================
        if (type === "batchFeedback") {
            const conversations = Array.isArray(body.conversations)
                ? body.conversations
                : [];

            const previousAnalysis = body.previousAnalysis || null;
            const startRound = body.startRound || 1;
            const endRound = body.endRound || conversations.length;

            const conversationText =
                conversations.length > 0
                    ? conversations
                          .map(
                              (item, index) =>
                                  `${startRound + index}번째 대화
시청자: ${item.chat}
방송인: ${item.answer}`
                          )
                          .join("\n\n")
                    : "대화가 없습니다.";

            const previousText = previousAnalysis
                ? `
이전 배치 분석 결과:
의사소통: ${previousAnalysis.communication}
자연스러움: ${previousAnalysis.natural}
재미: ${previousAnalysis.fun}
대화 이어가기: ${previousAnalysis.conversation}

강점:
${previousAnalysis.strengths || ""}

개선점:
${previousAnalysis.improvements || ""}
`
                : "이전 배치 분석 결과가 없습니다.";

            const prompt = `
너는 방송 연습을 도와주는 AI 코치다.

이번 분석 대상은 ${startRound}번째부터 ${endRound}번째까지의
"이번 배치" 대화뿐이다.

이전 배치가 있다면 이전 분석 결과를 참고해서
이번 배치에서 어떻게 달라졌는지를 비교한다.

중요:
- 이전 대화를 다시 전부 분석하지 않는다.
- 이번 배치의 대화만 점수와 평가의 직접적인 근거로 사용한다.
- 이전 점수를 그대로 복사하지 않는다.
- 실제 대화 내용을 근거로 평가한다.
- 방송인의 답변이 자연스럽게 대화를 이어갔는지 본다.
- 억지로 주제를 연결하거나 AI 시청자의 말을 오해한 경우도 평가한다.
- 단순히 길게 답했다고 높은 평가를 주지 않는다.
- 실제 방송에서 사용할 법한 대화인지 고려한다.

[이번 배치 대화]
${conversationText}

[이전 분석]
${previousText}

다음 JSON 형식으로만 출력한다.

{
  "communication": 0,
  "natural": 0,
  "fun": 0,
  "conversation": 0,
  "strengths": "",
  "improvements": "",
  "betterAnswer": "",
  "comparison": ""
}

점수 기준:
- communication: 의사소통
- natural: 자연스러움
- fun: 재미와 반응
- conversation: 대화 이어가기

각 점수는 0~100 사이의 정수다.

strengths:
이번 배치에서 잘한 점을 구체적으로 작성한다.

improvements:
이번 배치에서 개선할 점을 구체적으로 작성한다.

betterAnswer:
실제 대화 중 개선할 만한 답변 하나를 골라
더 자연스러운 예시를 작성한다.

comparison:
이전 배치가 있다면 이전 분석과 비교해서
이번 배치에서 좋아진 점이나 달라진 점을 설명한다.
이전 배치가 없다면 이번 배치의 현재 상태를 설명한다.

너무 길게 작성하지 않는다.
`;

            const completion = await groq.chat.completions.create({
                model: "openai/gpt-oss-20b",
                messages: [
                    {
                        role: "user",
                        content: prompt
                    }
                ],
                temperature: 0.4,
                reasoning_effort: "low",
                max_completion_tokens: 1400,
                response_format: {
                    type: "json_object"
                }
            });

            const content =
                completion.choices?.[0]?.message?.content?.trim() || "{}";

            let result;

            try {
                result = JSON.parse(content);
            } catch (error) {
                result = {
                    communication: 0,
                    natural: 0,
                    fun: 0,
                    conversation: 0,
                    strengths: "분석 결과를 불러오지 못했습니다.",
                    improvements: "다시 시도해주세요.",
                    betterAnswer: "",
                    comparison: ""
                };
            }

            return Response.json({
                result
            });
        }

        return Response.json(
            {
                error: "알 수 없는 요청입니다."
            },
            {
                status: 400
            }
        );
    } catch (error) {
        console.error(error);

        return Response.json(
            {
                error: "AI 요청 처리 중 오류가 발생했습니다."
            },
            {
                status: 500
            }
        );
    }
}