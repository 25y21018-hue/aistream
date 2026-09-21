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

            // 최근 대화
            const recentConversations =
                Array.isArray(body.recentConversations)
                    ? body.recentConversations
                    : [];


            // 현재 시청자 프로필
            const viewerProfile =
                body.viewerProfile || {
                    type: "일반 시청자",
                    style: "자연스럽고 편하게 채팅하는 사람"
                };


            // 최근 최대 5개 대화만 사용
            const recentText =
                recentConversations
                    .slice(-5)
                    .map((item, index) => {

                        return `
[최근 대화 ${index + 1}]

시청자:
${item.chat}

방송인:
${item.answer}
`;

                    })
                    .join("\n");


            const completion =
                await groq.chat.completions.create({

                    model: "openai/gpt-oss-20b",

                    messages: [

                        {
                            role: "user",

                            content: `

너는 실제 한국 인터넷 방송을 보고 있는 시청자다.

방송인이 실제로 방송을 하고 있고,
너는 채팅창에 메시지를 하나 작성해야 한다.

--------------------------------
현재 시청자 프로필
--------------------------------

유형:
${viewerProfile.type}

성향:
${viewerProfile.style}

이 시청자의 성향을 너무 과장하지 말고
자연스럽게 유지해라.

--------------------------------
최근 대화
--------------------------------

${recentText || "아직 이전 대화가 없다."}

--------------------------------
목표
--------------------------------

위 상황을 참고해서 실제 한국 인터넷 방송 채팅창에서
사람이 쓸 법한 메시지를 딱 1개 만들어라.

중요:

- 실제 사람이 채팅하는 것처럼 작성한다.
- 항상 이전 대화와 관련된 말을 할 필요는 없다.
- 이전 방송인의 답변을 보고 자연스럽게 반응할 수도 있다.
- 갑자기 다른 주제로 넘어갈 수도 있다.
- 그냥 짧게 반응만 할 수도 있다.
- 질문을 할 수도 있다.
- 농담을 할 수도 있다.
- 방송 내용에 대한 감탄이나 리액션을 할 수도 있다.
- 가끔은 별 의미 없는 짧은 채팅도 가능하다.
- 모든 메시지가 재미있을 필요는 없다.
- 모든 메시지가 질문일 필요도 없다.
- 실제 채팅창처럼 메시지 길이를 다양하게 한다.
- 짧은 메시지와 조금 긴 메시지를 섞는다.
- 가끔 오타나 인터넷식 표현을 자연스럽게 사용할 수 있다.
- 하지만 오타를 매번 사용하지는 않는다.
- "ㅋㅋ", "ㅎㅎ", "ㄹㅇ", "아", "근데" 같은 표현을 상황에 맞게 사용할 수 있다.
- 같은 표현을 반복하지 않는다.
- 지나치게 설명하는 문장을 만들지 않는다.
- AI가 작성한 것처럼 정리된 문장을 만들지 않는다.
- 소설처럼 길게 쓰지 않는다.
- 방송인에게 과도하게 호의적일 필요가 없다.
- 시청자마다 말투와 반응 방식이 다를 수 있다는 점을 반영한다.

--------------------------------
금지
--------------------------------

- 방송인을 과도하게 칭찬하기
- 매번 질문하기
- 매번 이전 대화에 반응하기
- 똑같은 패턴 반복하기
- "안녕하세요 저는 ~입니다" 같은 자기소개
- AI처럼 상황을 설명하는 문장
- 괄호로 행동을 설명하는 문장
- 여러 개의 채팅을 동시에 출력하기
- 채팅 앞에 이름이나 번호 붙이기

--------------------------------
출력
--------------------------------

채팅 메시지만 출력한다.

설명하지 않는다.
따옴표를 붙이지 않는다.
JSON을 사용하지 않는다.

`,

                        }

                    ],

                    temperature: 0.9,

                    reasoning_effort: "low",

                    max_completion_tokens: 300

                });


            const result =
                completion
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
            // 현재 분석 구간 텍스트
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
            // 이전 분석 결과
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

이전 분석 결과를 이번 분석의 비교 기준으로 사용해라.

중요:
이번 분석의 점수는 단순히 이전 점수를 복사하지 않는다.

이번에 새로 진행된 대화에서 실제로
어떤 변화가 있었는지를 판단해야 한다.

이전 분석에서 부족했던 부분이
이번 구간에서 개선되었는지 확인한다.

이전 분석에서 잘했던 부분이
이번 구간에서도 유지되고 있는지도 확인한다.

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
이번 분석 구간만 평가해야 한다.

--------------------------------

이번 분석 구간:

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

중요:

이번 분석은 현재 분석 구간만 평가한다.

예를 들어:

이전:
1~5 분석

현재:
6~15 분석

이라면

6~15번째 대화만 평가한다.

1~5번째 대화를 다시 평가하지 않는다.

다만 이전 분석 결과는
이번 구간에서 발전했는지 비교하기 위한
기준으로만 사용한다.

--------------------------------

다음 내용을 작성한다.

strengths:
이번 구간에서 잘한 점

improvements:
이번 구간에서 개선할 점

betterAnswer:
다음 방송 연습에서 사용할 수 있는
더 좋은 답변 방식이나 예시

comparison:
이전 분석과 비교했을 때
이번 구간에서 발전한 부분과
아직 부족한 부분

첫 분석이라 이전 분석 결과가 없다면
comparison에는

"첫 분석이라 비교할 이전 결과가 없습니다."

라고 작성한다.

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
        // 존재하지 않는 요청
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