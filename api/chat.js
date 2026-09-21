import Groq from "groq-sdk";

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY
});


// ==========================================
// POST
// ==========================================

export async function POST(request) {

    try {

        const body =
            await request.json();

        const type =
            body.type;


        // ==========================================
        // AI 시청자 채팅 생성
        // ==========================================

        if (type === "viewer") {

            const completion =
                await groq.chat.completions.create({

                    model: "openai/gpt-oss-20b",

                    messages: [

                        {
                            role: "user",

                            content: `
너는 인터넷 방송을 보고 있는
가상의 한국인 시청자다.

실제 인터넷 방송 채팅창에 올라올 법한
시청자 메시지를 딱 1개 만들어라.

조건:

- 반드시 한국어
- 약 5~30자 정도
- 실제 인터넷 방송 채팅처럼 자연스럽게
- 매번 다른 내용
- 질문만 반복하지 말 것
- 질문, 감탄, 장난, 리액션, 일상 이야기 등을 다양하게 사용
- ㅋㅋ, ㄹㅇ, 뭐임, 아, 근데 같은 표현은 가끔만 사용
- 너무 과한 인터넷 용어 사용 금지
- 문어체 금지
- AI처럼 설명하는 말투 금지
- 따옴표 사용 금지
- 채팅 메시지만 출력

시청자는 매번 다른 유형이라고 생각해라.

예:
- 처음 방송에 들어온 사람
- 오래 본 사람
- 장난치는 사람
- 질문하고 싶은 사람
- 방송 내용에 반응하는 사람
- 게임에 관심 있는 사람
- 그냥 지나가다가 채팅하는 사람

같은 질문을 반복하지 말고
실제 방송에서 자연스럽게 나올 만한
다양한 채팅을 만들어라.
`
                        }

                    ],

                    temperature: 0.85,

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
            // 현재 분석 구간을 텍스트로 변환
            // ==========================================

            const conversationText =
                conversations
                    .map(
                        (item, index) => {

                            const round =
                                startRound +
                                index;


                            return `
[${round}번째 티키타카]

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

이전 분석 결과를 이번 분석의 기준으로 사용해라.

중요:
이번 분석의 점수는 단순히
이전 점수를 복사해서는 안 된다.

이번에 새로 진행한 채팅에서
실제로 어떤 변화가 있었는지 판단해야 한다.

이전 분석에서 부족했던 부분이
이번 대화에서 개선되었는지 확인해라.

반대로 이전에 잘했던 부분이
이번 대화에서 약해졌는지도 확인해라.
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

방송인과 AI 시청자가 주고받은
이번 분석 구간의 대화를 평가해라.

이번에 분석해야 하는 구간:

${startRound}번째 ~ ${endRound}번째

--------------------------------

${conversationText}

--------------------------------

${previousText}

--------------------------------

평가 항목:

1. communication
시청자와 얼마나 자연스럽게 소통했는가

2. natural
답변이 얼마나 자연스럽고
방송인다운가

3. fun
답변이 얼마나 재미있고
방송 분위기를 살리는가

4. conversation
대화를 얼마나 자연스럽게
이어가는가

각 점수는 반드시
0~100 사이의 정수로 작성해라.

--------------------------------

특히 중요한 부분:

이번 분석은 전체 대화를 다시 평가하는 것이 아니다.

이번에 새로 진행한 구간만 평가한다.

예를 들어:

이전:
1~5 분석

이번:
6~15 분석

이라면

6~15번째 대화를 평가하고,
1~5 분석 결과는
"이번 사람이 얼마나 발전했는지"
판단하는 기준으로만 사용한다.

--------------------------------

다음 내용을 작성해라.

strengths:
이번 구간에서 잘한 점

improvements:
이번 구간에서 개선해야 할 점

betterAnswer:
다음 방송 연습에서 사용할 수 있는
더 좋은 답변 방향

comparison:
이전 분석 결과와 비교해서
이번 구간에서 발전한 부분과
아직 부족한 부분을 설명

첫 분석이라 이전 결과가 없다면
"첫 분석이라 비교할 이전 결과가 없습니다."
라고 작성

--------------------------------

반드시 JSON만 출력해라.

형식:

{
    "communication": 0,
    "natural": 0,
    "fun": 0,
    "conversation": 0,
    "strengths": "잘한 점",
    "improvements": "개선할 점",
    "betterAnswer": "다음 연습에서 사용할 답변 방향",
    "comparison": "이전 분석과 비교"
}

JSON 이외의 설명은 절대 출력하지 마라.
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
        // 알 수 없는 요청
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