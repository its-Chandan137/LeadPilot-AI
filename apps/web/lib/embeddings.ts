import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY!,
});

export async function generateEmbedding(text: string): Promise<number[]> {
  const response = await ai.models.embedContent({
    model: "gemini-embedding-2",
    contents: text,
  });

  const embedding = response.embeddings![0].values!;

  return embedding;
}

export async function generateEmbeddings(
  texts: string[]
): Promise<number[][]> {
  return Promise.all(texts.map(generateEmbedding));
}