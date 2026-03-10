import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_GEMINI_API_KEY });

export async function POST(req: Request) {
    try {
        const { message, language, records, medicines = [] } = await req.json();

        if (!message || !language || !records) {
            return NextResponse.json({ error: "Missing required chat parameters" }, { status: 400 });
        }

        // STRICT IN-CONTEXT LEARNING (RAG) SYSTEM PROMPT — now includes medicines for personalised analysis
        const medicinesSection = medicines.length > 0
            ? `\n    CURRENT MEDICINES THE PATIENT IS TAKING:\n    ${JSON.stringify(medicines, null, 2)}\n    Use this medicine list to provide PERSONALIZED responses. Flag any relevant interactions, side-effects, or connections you can identify between the medicine and the records above.`
            : '\n    No medicines have been entered by the patient.';

        const systemInstruction = `You are MedAssist, a helpful but strictly constrained medical AI explainer. 
    
    CRITICAL RULES:
    1. The patient's ENTIRE available medical history is provided below in JSON format.
    2. You MUST answer the user's questions based ONLY on this exact text and the medicines provided. DO NOT use outside medical knowledge. DO NOT diagnose. DO NOT prescribe. DO NOT guess.
    3. If the user asks a question and the answer is NOT explicitly present in the provided records, you MUST reply with this exact phrase (translated into the target language): "That information is not in your current records."
    4. Explain everything in simple, 5th-grade terms. Use a warm, clinical tone.
    5. You MUST output your final response STRICTLY in this language: ${language}.
    
    PATIENT RECORDS CONTEXT:
    ${JSON.stringify(records, null, 2)}
    ${medicinesSection}
    `;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [
                { role: 'user', parts: [{ text: systemInstruction }] },
                { role: 'user', parts: [{ text: message }] }
            ],
            config: {
                temperature: 0.1, // Maximum determinism to prevent medical hallucinations
            }
        });

        const replyText = response.text || "I was unable to process that request.";

        return NextResponse.json({ reply: replyText });

    } catch (error: any) {
        console.error("Chat API Error:", error);
        return NextResponse.json({ error: "Error connecting to AI Explainer" }, { status: 500 });
    }
}
