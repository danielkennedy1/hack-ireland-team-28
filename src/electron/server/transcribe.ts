import { configDotenv } from "dotenv";
import OpenAI from "openai";
import { Uploadable } from "openai/uploads";

configDotenv();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const transcriptionFromBlob = async (audioFile: Uploadable, language: string) => {
  const response = await openai.audio.transcriptions.create({
    model: "whisper-1",
    file: audioFile,
    language: language,
  });

  return response.text;
}
