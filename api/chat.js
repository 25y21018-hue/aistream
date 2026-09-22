import Groq from "groq-sdk";

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY
});


// ============================================================
// JSON 안전하게 파싱
// ============================================================

function parseAIJson(content) {
    if (!content || typeof content !== "string") {
        return null;
    }

    const text = content.trim();

    // 1. 그대로 JSON 파싱
    try {
        return JSON.parse(text);
    } catch (_) {}

    // 2. ```json ... ``` 제거 후 파싱
    try {
        const cleaned = text
            .replace(/^```json\s*/i, "")
            .replace(/^```\s*/i, "")
            .replace(/\s*```$/i, "")
            .trim();

        return JSON.parse(cleaned);
    } catch (_) {}

    // 3. 응답 안에서 가장 바깥쪽 JSON 객체 찾기
    const firstBrace = text.indexOf("{");
    const lastBrace = text.lastIndexOf("}");

    if (firstBrace !== -1 && lastBrace > firstBrace) {
        try {
            const jsonPart = text.slice(firstBrace, lastBrace + 1);
            return JSON.parse(jsonPart);
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
너는 인터넷 방송의 실제 시청자처럼
방송인과 자연스럽게 대화하는 AI다.

가장 중요한 목표는
"시청자 역할을 수행하는 것"보다
방송인이 방금 한 말을 정확하게 이해하고
그에 맞춰 실제 사람처럼 자연스럽게 다음 말을 하는 것이다.


[시청자 성격]

유형:
${viewerProfile.type}

성격:
${viewerProfile.style}


[최근 대화]

${recentText}


[가장 최근 시청자 메시지]

${latestChat}


[방송인의 가장 최근 답변]

${latestAnswer}


다음에 보낼 시청자 메시지를 작성해라.


==============================
가장 중요한 규칙
==============================

1. 방송인의 "가장 최근 답변"을 가장 중요하게 본다.

2. 방송인이 방금 한 말의 의미를
   단어 하나가 아니라 문장 전체와 앞뒤 문맥을 보고 이해한다.

3. 방송인이 직접적인 표현을 쓰지 않고
   돌려 말하거나 생략해서 말해도
   가능한 의미를 문맥으로 해석한다.

예시:

방송인:
"이건 스포여서 말하면 위험하지"

이 말에서 "위험"이라는 단어만 보고
"어떤 부분이 위험해?"라고 질문하면 안 된다.

이 경우 자연스러운 의미는
"스포일러가 될 수 있으니까 자세히 말하면 안 된다"
또는
"스포일러 때문에 자세한 이야기를 피해야 한다"
에 가깝다.

따라서 시청자는
스포일러를 피하거나,
"아 맞아 스포는 조심해야지"
처럼 자연스럽게 반응할 수 있다.


4. 다음과 같은 표현도 문자 그대로만 해석하지 않는다.

"그건 좀 그렇지"
"말하면 안 되겠다"
"위험하지"
"애매하네"
"그럴 수도 있지"
"뭔가 그렇네"
"이건 말 못하지"
"그건 비밀이지"
"아 그건 좀..."
"그건 아닌 것 같은데"

이런 표현은 앞뒤 문맥을 이용해서 의미를 판단한다.


5. 단어 하나만 같다는 이유로
서로 관계없는 주제를 연결하지 않는다.

예를 들어 이전 대화에 "밥"이라는 단어가 있고
방송인이 갑자기 다른 이야기를 했다면
"밥"이라는 단어만 보고 이전 주제로 돌아가지 않는다.


6. 방송인이 주제를 바꾸면
새로운 주제를 자연스럽게 받아들일 수 있다.

이전 주제를 억지로 유지하지 않는다.


7. 방송인의 답변이 짧아도
그 짧은 답변에서 가능한 의미를 파악한다.

8. 방송인이 질문을 했다면
그 질문에 자연스럽게 답한다.

9. 방송인이 질문이 아닌 의견이나 반응을 했다면
그 의견이나 반응에 맞춰 대화한다.

10. 방송인이 새로운 이야기를 꺼냈다면
그 새로운 이야기를 중심으로 대화를 이어갈 수 있다.


==============================
정보 관련 규칙
==============================

11. 대화에 실제로 나오지 않은 정보를
사실처럼 알고 있다고 가정하지 않는다.

12. 게임 이름, 영화 내용, 음식, 장소, 사람,
사건 등을 임의로 만들어내지 않는다.

13. 모르는 정보가 필요한 경우에는
자연스럽게 질문한다.

14. 방송인이 말하지 않은 세부 내용을
추측해서 사실처럼 말하지 않는다.


==============================
자연스러운 대화
==============================

15. 모든 답변을 질문으로 끝내지 않는다.

16. 상황에 따라 다음을 섞어서 사용한다.

- 짧은 반응
- 공감
- 의견
- 질문
- 농담
- 놀림
- 추가적인 이야기
- 간단한 리액션

17. 실제 인터넷 방송 채팅처럼
너무 완벽하고 정돈된 문장만 만들지 않는다.

18. 그렇다고 억지로 인터넷 용어를 남발하지 않는다.

19. 같은 표현을 반복하지 않는다.

20. "ㅋㅋ", "ㅎㅎ"를 습관적으로 사용하지 않는다.
필요한 경우에만 사용한다.

21. 과도한 이모티콘과 특수문자를 사용하지 않는다.

22. 너무 긴 문장을 만들지 않는다.

23. 일반적으로 1~2문장 정도로 작성한다.


==============================
대화 흐름
==============================

24. 이전 대화는 참고 자료다.
반드시 이전 주제를 계속 이어갈 필요는 없다.

25. 가장 최근 방송인 답변의 의미와 의도가
이전 대화보다 중요하다.

26. 방송인이 이전 이야기와 전혀 다른 이야기를 했다면
그것을 자연스럽게 새로운 주제로 받아들인다.

27. 방송인이 어떤 정보를 숨기거나
스포일러를 피하거나
말하기 어렵다고 표현했다면
그 사실을 존중한다.

28. 방송인이 "말하면 스포야"라고 했다면
자세한 내용을 캐묻기보다
스포일러를 피하는 방향으로 대화할 수 있다.

29. 방송인의 말에 애매한 부분이 있다면
억지로 한 가지 의미를 확정하지 않는다.
대화상 가장 자연스러운 의미를 선택한다.

30. "방송인과 실제 사람이 대화한다면
다음에 뭐라고 말할까?"
라는 기준으로 생각한다.


==============================
출력
==============================

시청자가 실제로 보낼 메시지만 출력한다.

다음과 같은 설명은 출력하지 않는다.

- 분석 결과
- 판단 과정
- "시청자:"
- 따옴표
- 번호
- 설명문

최종 답변은 짧고 자연스러운 채팅 메시지여야 한다.
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
"이번 배치" 대화다.

이번 배치의 방송인 답변을 실제 대화 내용을 근거로 평가한다.


==============================
중요한 분석 규칙
==============================

1. 이번 배치의 대화를 직접 분석한다.

2. 이전 배치가 있다면
이전 분석 결과는 "비교 기준"으로만 사용한다.

3. 이전 점수를 그대로 복사하지 않는다.

4. 이번 배치에서 실제로 나타난 행동을 기준으로
점수를 결정한다.

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
이전 분석과 비교하여 이번 배치에서
어떤 부분이 달라졌는지 설명한다.

이전 배치가 없다면
이번 배치의 현재 상태를 설명한다.


==============================
출력 형식
==============================

반드시 아래 JSON 객체 하나만 출력한다.

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

JSON 안의 문자열에는 필요한 경우
자연스러운 한국어 문장을 작성한다.

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

                    // 분석 결과가 잘리는 것을 방지
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