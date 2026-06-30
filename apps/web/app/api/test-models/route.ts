import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY!,
    });

    const models = [];

    const pager = await ai.models.list();

    for await (const model of pager) {
      models.push({
        name: model.name,
        supportedActions: model.supportedActions,
      });
    }

    return NextResponse.json(models);
  } catch (error) {
    console.error(error);
    return NextResponse.json(error, { status: 500 });
  }
}