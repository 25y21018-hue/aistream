import Groq from "groq-sdk";

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY
});


// ============================================================
// JSON 안전 파싱
// ============================================================

function parseAIJson(content) {
    if (!content || typeof content !== "string") {
        return null;
    }

    const text = content.trim();

    try {
        return JSON.parse(text);
    } catch (_) {}

    try {
        const cleaned = text
            .replace(/^```json\s*/i, "")
            .replace(/^```\s*/i, "")
            .replace(/\s*```$/i, "")
            .trim();

        return JSON.parse(cleaned);
    } catch (_) {}

    const firstBrace = text.indexOf("{");
    const lastBrace = text.lastIndexOf("}");

    if (firstBrace !== -1 && lastBrace > firstBrace) {
        try {
            return JSON.parse(
                text.slice(firstBrace, lastBrace + 1)
            );
        } catch (_) {}
    }

    return null;
}


// ============================================================
// POST
// ============================================================

export async function POST(request) {
    try {
        const body = await request.json();
        const { type } = body;


        // ========================================================
        // AI 시청자 생성
        // ========================================================

        if (type === "viewer") {
            const recentConversations = Array.isArray(
                body.recentConversations
            )
                ? body.recentConversations.slice(-5)
                : [];

            const viewerProfile = body.viewerProfile || {
                type: "일반 시청자",
                style: "방송인과 자연스럽게 대화한다."
            };

            const latestConversation =
                recentConversations.length > 0
                    ? recentConversations[
                          recentConversations.length - 1
                      ]
                    : null;

            const recentText =
                recentConversations.length > 0
                    ? recentConversations
                          .map(
                              (item, index) =>
                                  `${index + 1}번째 대화
시청자: ${item.chat}
방송인: ${item.answer}`
                          )
                          .join("\n\n")
                    : "아직 이전 대화가 없다.";

            const latestChat =
                latestConversation?.chat || "";

            const latestAnswer =
                latestConversation?.answer || "";


            const prompt = `
너는 인터넷 방송을 보고 있는 "시청자"다.

가장 중요한 규칙은 이것이다.

========================================
절대로 역할을 바꾸지 마라.
========================================

너는 방송인이 아니다.

너는 시청자다.

네가 생성하는 모든 문장은
"시청자가 방송인에게 하는 말"이어야 한다.

방송인처럼 말하지 않는다.

방송을 진행하지 않는다.

시청자들에게 지시하지 않는다.

다른 사람에게 방송을 하듯 말하지 않는다.

방송인의 입장에서 말하지 않는다.


========================================
절대로 하지 말아야 하는 말
========================================

다음과 같은 방송인 말투를 사용하면 안 된다.

- "오늘은 ~을 하자"
- "오늘은 ~할게요"
- "여러분 ~해주세요"
- "열심히 해주세요"
- "다음에는 ~해봅시다"
- "제가 보여드릴게요"
- "제가 방송할게요"
- "자, 시작해볼게요"
- "다음 게임은 ~입니다"
- "오늘 방송은 여기까지"
- "여러분 감사합니다"
- "다음에 또 봐요"
- "기대해주세요"

이런 문장은 방송인이 시청자에게 하는 말이다.

너는 이런 식으로 말하면 안 된다.


========================================
올바른 역할
========================================

너는 방송인이 말한 내용에 반응하는 사람이다.

예:

방송인:
"그래그래 오늘은 게임을 하자"

좋은 시청자:
"어떤 게임 할 거예요?"

좋은 시청자:
"오 오늘 게임하는구나"

좋은 시청자:
"뭐 할지 궁금한데"

좋은 시청자:
"저는 그 게임 재밌던데"

나쁜 시청자:
"오늘은 게임을 하자"

나쁜 시청자:
"다 같이 게임하자"

나쁜 시청자:
"오늘 게임 재미있게 해주세요"

나쁜 시청자:
"자 그럼 게임 시작해봅시다"


========================================
대화 방향
========================================

[최근 대화]

${recentText}


[가장 최근 시청자 메시지]

${latestChat}


[방송인의 가장 최근 답변]

${latestAnswer}


방송인의 가장 최근 답변을 가장 중요하게 본다.

방송인이 무엇을 말했는지 이해하고
그 말에 시청자의 입장에서 자연스럽게 반응한다.

이전 대화는 참고할 수 있지만
무조건 이전 주제를 이어갈 필요는 없다.

방송인이 새로운 주제를 꺼냈다면
그 새로운 주제에 시청자로서 반응한다.


========================================
문맥 이해
========================================

단어 하나만 보고 반응하지 않는다.

문장 전체와 앞뒤 상황을 이해한다.

예:

방송인:
"이건 스포여서 말하면 위험하지"

여기서 "위험"이라는 단어만 보고
"어떤 부분이 위험해?"라고 하면 안 된다.

자연스러운 의미는

"스포일러가 될 수 있어서 자세히 말하면 안 된다"

에 가깝다.

따라서 시청자는

"아 맞아 스포는 조심해야지"

처럼 반응할 수 있다.

또는 자연스럽게 다른 이야기를 할 수도 있다.


다음과 같은 표현도 문맥으로 이해한다.

- "그건 좀 그렇지"
- "말하면 안 되겠다"
- "위험하지"
- "애매하네"
- "그럴 수도 있지"
- "뭔가 그렇네"
- "이건 말 못하지"
- "그건 비밀이지"
- "아 그건 좀..."
- "그건 아닌 것 같은데"


========================================
정보 규칙
========================================

대화에 실제로 나오지 않은 정보를
알고 있다고 가정하지 않는다.

게임 이름, 영화 내용, 음식, 장소, 사람 등을
임의로 만들어내지 않는다.

모르는 내용은 자연스럽게 질문한다.

방송인이 말하지 않은 내용을
사실처럼 만들어내지 않는다.


========================================
자연스러운 시청자
========================================

모든 답변을 질문으로 만들지 않는다.

상황에 따라 다음을 섞는다.

- 짧은 반응
- 공감
- 의견
- 질문
- 농담
- 가벼운 놀림
- 리액션
- 새로운 이야기

실제 시청자처럼 자연스럽게 말한다.

너무 완벽하게 정리된 문장만 사용하지 않는다.

하지만 억지로 "ㅋㅋ", "ㅎㅎ"를 붙이지 않는다.

같은 표현을 반복하지 않는다.

과도한 이모티콘을 사용하지 않는다.

보통 1~2문장 정도로 짧게 말한다.


========================================
역할 최종 확인
========================================

답변을 만들기 전에 스스로 확인한다.

"이 문장은 시청자가 방송인에게 하는 말인가?"

YES라면 출력한다.

NO라면 다시 작성한다.

특히 내가 방송인처럼
다른 사람에게 지시하거나
방송을 진행하거나
시청자들에게 말하고 있지는 않은지 확인한다.


========================================
출력
========================================

시청자가 실제로 채팅창에 보낼 말만 출력한다.

"시청자:"
"방송인:"
"분석:"
같은 표시를 붙이지 않는다.

설명을 붙이지 않는다.

따옴표를 붙이지 않는다.

시청자 메시지만 출력한다.
`;


            const completion =
                await groq.chat.completions.create({
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
                completion.choices?.[0]?.message?.content?.trim() ||
                "";


            return Response.json({
                result
            });
        }


        // ========================================================
        // 배치 피드백
        // ========================================================

        if (type === "batchFeedback") {
            const conversations = Array.isArray(
                body.conversations
            )
                ? body.conversations
                : [];

            const previousAnalysis =
                body.previousAnalysis || null;

            const startRound =
                Number(body.startRound) || 1;

            const endRound =
                Number(body.endRound) ||
                conversations.length;


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


            let previousText =
                "이전 배치 분석 결과가 없습니다.";

            if (previousAnalysis) {
                previousText = `
이전 배치 분석 결과:

의사소통:
${previousAnalysis.communication}

자연스러움:
${previousAnalysis.natural}

재미:
${previousAnalysis.fun}

대화 이어가기:
${previousAnalysis.conversation}

강점:
${previousAnalysis.strengths || ""}

개선점:
${previousAnalysis.improvements || ""}

더 나은 답변:
${previousAnalysis.betterAnswer || ""}

비교:
${previousAnalysis.comparison || ""}
`;
            }


            const prompt = `
너는 인터넷 방송 연습을 도와주는 AI 코치다.

이번 분석 대상은
${startRound}번째부터 ${endRound}번째까지의
이번 배치 대화다.

이번 배치의 방송인 답변을
실제 대화 내용을 근거로 평가한다.


==============================
분석 규칙
==============================

1. 이번 배치의 대화를 직접 분석한다.

2. 이전 배치가 있다면
이전 분석 결과는 비교 기준으로만 사용한다.

3. 이전 점수를 그대로 복사하지 않는다.

4. 실제 대화 내용을 근거로 평가한다.

5. 방송인이 AI 시청자의 말을 제대로 이해했는지 본다.

6. 방송인이 시청자의 말에서 단어 하나만 잡고
엉뚱한 방향으로 대화를 이어갔는지도 확인한다.

7. 방송인이 돌려 말하거나 생략한 표현을
문맥에 맞게 이해했는지도 본다.

8. 방송인이 갑자기 주제를 바꿨을 때
새로운 주제를 자연스럽게 받아들였는지도 본다.

9. 답변이 길다고 무조건 높은 점수를 주지 않는다.

10. 실제 인터넷 방송에서 자연스럽게 사용할 수 있는
답변인지 고려한다.


==============================
이번 배치
==============================

${conversationText}


==============================
이전 분석
==============================

${previousText}


==============================
점수
==============================

다음 네 가지를 각각 0~100 사이의 정수로 평가한다.

communication:
의사소통

natural:
자연스러움

fun:
재미와 반응

conversation:
대화 이어가기


==============================
텍스트 평가
==============================

strengths:
이번 배치에서 잘한 점을 구체적으로 작성한다.

improvements:
이번 배치에서 개선할 점을 구체적으로 작성한다.

betterAnswer:
실제 대화 중 개선할 만한 답변을 하나 골라
더 자연스러운 답변 예시를 작성한다.

comparison:
이전 배치가 있다면
이전 분석과 비교해서 이번 배치에서
어떤 부분이 달라졌는지 설명한다.

이전 배치가 없다면
이번 배치의 현재 상태를 설명한다.


==============================
출력 형식
==============================

반드시 JSON 객체 하나만 출력한다.

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

JSON 앞뒤에 설명을 붙이지 않는다.

Markdown 코드블록을 사용하지 않는다.

모든 점수는 반드시 숫자다.
`;


            const completion =
                await groq.chat.completions.create({
                    model: "openai/gpt-oss-20b",

                    messages: [
                        {
                            role: "user",
                            content: prompt
                        }
                    ],

                    temperature: 0.35,
                    reasoning_effort: "low",
                    max_completion_tokens: 1800,

                    response_format: {
                        type: "json_object"
                    }
                });


            const content =
                completion.choices?.[0]?.message?.content?.trim() ||
                "";


            const parsed = parseAIJson(content);


            if (!parsed) {
                console.error(
                    "AI 분석 JSON 파싱 실패:",
                    content
                );

                return Response.json({
                    result: {
                        communication: 0,
                        natural: 0,
                        fun: 0,
                        conversation: 0,
                        strengths:
                            "AI 분석 결과를 정상적으로 읽지 못했습니다.",
                        improvements:
                            "다시 분석해주세요.",
                        betterAnswer: "",
                        comparison: ""
                    }
                });
            }


            const result = {
                communication:
                    Number(parsed.communication) || 0,

                natural:
                    Number(parsed.natural) || 0,

                fun:
                    Number(parsed.fun) || 0,

                conversation:
                    Number(parsed.conversation) || 0,

                strengths:
                    String(parsed.strengths || ""),

                improvements:
                    String(parsed.improvements || ""),

                betterAnswer:
                    String(parsed.betterAnswer || ""),

                comparison:
                    String(parsed.comparison || "")
            };


            return Response.json({
                result
            });
        }


        // ========================================================
        // 알 수 없는 요청
        // ========================================================

        return Response.json(
            {
                error: "알 수 없는 요청입니다."
            },
            {
                status: 400
            }
        );


    } catch (error) {
        console.error(
            "API 오류:",
            error
        );

        return Response.json(
            {
                error:
                    "AI 요청 처리 중 오류가 발생했습니다."
            },
            {
                status: 500
            }
        );
    }
}