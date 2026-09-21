import Groq from "groq-sdk";

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY
});


// ==========================================
// POST
// ==========================================

export async function POST(request) {

    try {

        const body = await request.json();

        const type = body.type;


        // ==========================================
        // AI 시청자 채팅 생성
        // ==========================================

        if (type === "viewer") {

            const recentConversations =
                Array.isArray(body.recentConversations)
                    ? body.recentConversations
                    : [];


            const viewerProfile =
                body.viewerProfile || {
                    type: "일반 시청자",
                    style: "자연스럽고 편하게 채팅하는 사람"
                };


            // ==========================================
            // 최근 대화 정리
            // ==========================================

            const recentText =
                recentConversations
                    .slice(-5)
                    .map((item, index) => {

                        return `
[대화 ${index + 1}]

시청자:
${item.chat}

방송인:
${item.answer}
`;

                    })
                    .join("\n");


            const latestConversation =
                recentConversations.length > 0
                    ? recentConversations[
                        recentConversations.length - 1
                    ]
                    : null;


            const latestChat =
                latestConversation?.chat || "없음";


            const latestAnswer =
                latestConversation?.answer || "없음";


            // ==========================================
            // 1단계
            // 대화 흐름 판단
            // ==========================================

            const analysisCompletion =
                await groq.chat.completions.create({

                    model: "openai/gpt-oss-20b",

                    messages: [

                        {

                            role: "user",

                            content: `

너는 인터넷 방송 채팅의 대화 흐름을 판단하는 AI다.

아직 새로운 채팅을 만들지 마라.

먼저 방송인이 방금 한 답변을 보고
"다음 시청자가 어떤 방향으로 반응하는 것이
자연스러운지"만 판단해야 한다.

--------------------------------
최근 대화
--------------------------------

${recentText || "아직 이전 대화가 없다."}

--------------------------------
가장 최근 시청자
--------------------------------

${latestChat}

--------------------------------
가장 최근 방송인 답변
--------------------------------

${latestAnswer}

--------------------------------
현재 시청자
--------------------------------

유형:
${viewerProfile.type}

성향:
${viewerProfile.style}

--------------------------------
판단 방법
--------------------------------

가장 중요한 것은
"가장 최근 방송인의 답변"이다.

방송인이 이전 주제를 계속 이야기했다면
그 주제를 이어가는 것이 자연스러운지 판단한다.

방송인이 새로운 주제를 꺼냈다면
새로운 주제로 이동한 것으로 판단한다.

특히 단순히 같은 단어가 들어있다는 이유만으로
이전 주제와 연결하지 마라.

예:

이전 주제:
게임

방송인:
밥 뭐 먹었어?

이 경우 "밥"을 게임과 연결하지 않는다.

방송인이 명확하게 새로운 이야기를 시작한 것이다.

--------------------------------
가능한 판단 유형
--------------------------------

"continue"

이전 주제를 계속 이어가는 것이 자연스럽다.

"topic_change"

방송인이 새로운 주제로 넘어갔다.

"mismatch"

방송인의 답변이 시청자의 질문과
상당히 동떨어져 있다.

"reaction"

특별한 주제 연결보다
짧은 리액션을 하는 것이 자연스럽다.

"new_topic"

이전 대화와 크게 관계없는
새로운 이야기를 시작해도 자연스럽다.

--------------------------------
추가 판단
--------------------------------

다음 채팅이 어떤 방향으로 가야 하는지도
짧게 설명한다.

예:

{
    "type": "topic_change",
    "reason": "방송인이 게임 이야기에서 밥 이야기로 주제를 바꿈",
    "direction": "밥 이야기에 자연스럽게 반응하거나 질문"
}

또는:

{
    "type": "continue",
    "reason": "방송인이 게임에 대한 질문에 답함",
    "direction": "게임 이야기를 이어감"
}

--------------------------------
출력
--------------------------------

반드시 JSON만 출력한다.

{
    "type": "continue",
    "reason": "판단 이유",
    "direction": "다음 채팅 방향"
}

JSON 이외의 설명은 출력하지 않는다.

`

                        }

                    ],

                    temperature: 0.2,

                    reasoning_effort: "low",

                    max_completion_tokens: 500,

                    response_format: {
                        type: "json_object"
                    }

                });


            const analysisResult =
                analysisCompletion
                    .choices[0]
                    ?.message
                    ?.content || "";


            let conversationDecision;


            try {

                conversationDecision =
                    JSON.parse(
                        analysisResult
                    );

            } catch {

                conversationDecision = {

                    type: "continue",

                    reason:
                        "대화 흐름을 자연스럽게 이어간다.",

                    direction:
                        "가장 최근 대화를 참고해 자연스럽게 반응한다."

                };

            }


            // ==========================================
            // 2단계
            // 실제 시청자 채팅 생성
            // ==========================================

            const generationCompletion =
                await groq.chat.completions.create({

                    model: "openai/gpt-oss-20b",

                    messages: [

                        {

                            role: "user",

                            content: `

너는 실제 한국 인터넷 방송을 보고 있는
시청자다.

방송 채팅창에 들어갈 메시지를
딱 하나 작성해야 한다.

--------------------------------
시청자 프로필
--------------------------------

유형:
${viewerProfile.type}

성향:
${viewerProfile.style}

--------------------------------
최근 대화
--------------------------------

${recentText || "아직 이전 대화가 없다."}

--------------------------------
가장 최근 시청자
--------------------------------

${latestChat}

--------------------------------
가장 최근 방송인 답변
--------------------------------

${latestAnswer}

--------------------------------
대화 흐름 판단
--------------------------------

유형:
${conversationDecision.type}

판단:
${conversationDecision.reason}

다음 방향:
${conversationDecision.direction}

이 판단 결과를 반드시 참고해서
다음 채팅을 만들어라.

--------------------------------
매우 중요한 규칙
--------------------------------

가장 최근 방송인의 답변을
가장 중요하게 생각한다.

방송인이 새로운 주제를 꺼냈다면
이전 주제를 억지로 계속하지 않는다.

예:

이전:
게임 이야기

방송인:
밥 뭐먹었어?

이 경우 다음 채팅은
게임 이야기를 억지로 이어가면 안 된다.

가능한 방향:

"ㅋㅋ 갑자기 밥 뭐임"

"난 아직 안 먹었는데 너는?"

"오늘은 뭐 먹었는데"

처럼 밥이라는 새로운 주제를
자연스럽게 따라갈 수 있다.

--------------------------------
동문서답 처리
--------------------------------

방송인이 시청자의 질문과
전혀 다른 이야기를 했다면

시청자가 그것을 눈치채고
반응할 수도 있다.

예:

시청자:
오늘 몇 시까지 방송함?

방송인:
나 아까 라면 먹었는데

가능:

"ㅋㅋㅋㅋ 갑자기 라면"

"아니 몇 시까지 하냐고 ㅋㅋ"

하지만 항상 동문서답을 지적하지 않는다.

자연스럽게 다른 이야기를 받아줄 수도 있다.

--------------------------------
대화 연결
--------------------------------

방송인의 답변이 이전 주제를 이어간다면
그 주제를 자연스럽게 계속한다.

단순히 방송인의 말을
그대로 반복하지 않는다.

나쁜 예:

방송인:
오늘 처음 해봐

시청자:
오늘 처음 하는구나

좋은 예:

"처음인데 생각보다 잘하네 ㅋㅋ"

--------------------------------
새로운 주제
--------------------------------

실제 시청자는 갑자기 다른 이야기를
꺼낼 수도 있다.

하지만 아무 이유 없이
매번 새로운 주제를 던지지 않는다.

--------------------------------
현실적인 채팅
--------------------------------

- 실제 한국 인터넷 방송 채팅처럼 작성
- 메시지는 딱 하나
- 짧은 채팅도 가능
- 조금 긴 채팅도 가능
- 질문만 계속하지 않기
- "ㅋㅋ", "ㅎㅎ", "ㄹㅇ" 등을 가끔 사용
- 오타는 가끔만 사용
- 같은 표현 반복 금지
- 방송인을 과도하게 칭찬하지 않기
- AI처럼 설명하지 않기
- 소설처럼 길게 쓰지 않기
- 방송인의 말을 그대로 복사하지 않기
- 모든 채팅을 억지로 재미있게 만들지 않기
- 모든 채팅이 이전 대화와 연결될 필요는 없음
- 실제 사람처럼 약간의 불규칙성 허용

--------------------------------
금지
--------------------------------

- 여러 개의 채팅 출력
- 이름 출력
- 번호 출력
- 설명 출력
- JSON 출력
- 괄호로 행동 설명
- AI라는 사실 언급
- 방송인을 과도하게 칭찬

--------------------------------
출력
--------------------------------

채팅 메시지만 출력한다.

따옴표 없이 출력한다.

`

                        }

                    ],

                    temperature: 0.9,

                    reasoning_effort: "low",

                    max_completion_tokens: 300

                });


            const result =
                generationCompletion
                    .choices[0]
                    ?.message
                    ?.content
                    ?.trim() || "";


            if (!result) {

                return Response.json(

                    {
                        error:
                            "AI가 빈 채팅을 반환했습니다."
                    },

                    {
                        status: 502
                    }

                );

            }


            return Response.json({
                result
            });

        }


        // ==========================================
        // 여러 채팅 구간 분석
        // ==========================================

        if (type === "batchFeedback") {

            const conversations =
                Array.isArray(body.conversations)
                    ? body.conversations
                    : [];


            const previousAnalysis =
                body.previousAnalysis || null;


            const startRound =
                body.startRound || 1;


            const endRound =
                body.endRound || startRound;


            if (
                conversations.length === 0
            ) {

                return Response.json(

                    {
                        error:
                            "분석할 대화가 없습니다."
                    },

                    {
                        status: 400
                    }

                );

            }


            // ==========================================
            // 현재 분석 구간
            // ==========================================

            const conversationText =
                conversations
                    .map(
                        (item, index) => {

                            const round =
                                startRound +
                                index;


                            return `
[${round}번째 대화]

시청자:
${item.chat}

방송인:
${item.answer}
`;

                        }
                    )
                    .join("\n");


            // ==========================================
            // 이전 분석
            // ==========================================

            let previousText =
                "이전 분석 결과가 없습니다. 첫 번째 분석입니다.";


            if (previousAnalysis) {

                previousText = `

이전 분석 결과:

${JSON.stringify(
    previousAnalysis,
    null,
    2
)}

이전 분석 결과를
이번 분석의 비교 기준으로 사용한다.

이번 점수는 이전 점수를 그대로 복사하지 않는다.

현재 분석 구간에서 실제로
어떤 변화가 있었는지를 판단한다.

이전 분석에서 부족했던 부분이
이번에 개선되었는지 확인한다.

이전 분석에서 잘했던 부분이
이번에도 유지되는지 확인한다.

`;

            }


            // ==========================================
            // AI 분석
            // ==========================================

            const completion =
                await groq.chat.completions.create({

                    model: "openai/gpt-oss-20b",

                    messages: [

                        {

                            role: "user",

                            content: `

너는 인터넷 방송인을 훈련시키는
전문 방송 코치다.

방송인이 AI 시청자와 대화한 내용을 보고
방송 진행 능력을 분석해라.

이번 분석은 전체 대화가 아니라
현재 분석 구간만 평가한다.

--------------------------------

현재 분석 구간:

${startRound}번째 ~ ${endRound}번째

--------------------------------

${conversationText}

--------------------------------

${previousText}

--------------------------------

평가 항목:

1. communication

시청자에게 자연스럽게 대답하고
의사소통을 잘했는지 평가한다.

2. natural

답변이 실제 인터넷 방송인이 말하는 것처럼
자연스러웠는지 평가한다.

3. fun

답변이 재미있거나 방송 분위기를 살렸는지 평가한다.

4. conversation

대화를 자연스럽게 이어가고
시청자가 계속 이야기할 수 있도록 만들었는지 평가한다.

각 점수는 반드시
0~100 사이의 정수로 작성한다.

--------------------------------
중요
--------------------------------

이번 분석은 현재 분석 구간만 평가한다.

예:

이전:
1~5

현재:
6~15

이라면

6~15만 평가한다.

1~5를 다시 평가하지 않는다.

이전 분석은
발전 여부를 비교하기 위한 기준으로만 사용한다.

--------------------------------

strengths:
이번 구간에서 잘한 점

improvements:
이번 구간에서 개선할 점

betterAnswer:
다음 방송 연습에서 사용할 수 있는
더 좋은 답변 방식이나 예시

comparison:
이전 분석과 비교했을 때
발전한 부분과 부족한 부분

첫 분석이면:

"첫 분석이라 비교할 이전 결과가 없습니다."

--------------------------------

반드시 JSON만 출력한다.

형식:

{
    "communication": 0,
    "natural": 0,
    "fun": 0,
    "conversation": 0,
    "strengths": "잘한 점",
    "improvements": "개선할 점",
    "betterAnswer": "더 좋은 답변 방향",
    "comparison": "이전 분석과 비교"
}

JSON 이외의 설명은 출력하지 않는다.

`

                        }

                    ],

                    temperature: 0.4,

                    reasoning_effort: "low",

                    max_completion_tokens: 1400,

                    response_format: {
                        type: "json_object"
                    }

                });


            const result =
                completion
                    .choices[0]
                    ?.message
                    ?.content || "";


            if (!result) {

                return Response.json(

                    {
                        error:
                            "AI가 분석 결과를 반환하지 않았습니다."
                    },

                    {
                        status: 502
                    }

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
                error:
                    "알 수 없는 요청입니다."
            },

            {
                status: 400
            }

        );


    } catch (error) {

        console.error(
            "Groq API Error:",
            error
        );


        return Response.json(

            {
                error:
                    "Groq API 요청에 실패했습니다.",

                detail:
                    error.message
            },

            {
                status: 500
            }

        );

    }

}