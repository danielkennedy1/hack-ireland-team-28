import OpenAI from "openai";
import dotenv from "dotenv";
import { Uploadable } from "openai/uploads";

dotenv.config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || "" });

export const transcriptionFromBlob = async (audioFile: Uploadable, language: string) => {
  const response = await openai.audio.transcriptions.create({
    model: "whisper-1",
    file: audioFile,
    language: language,
  });

  return response.text;
}
