import OpenAI from "openai";
import dotenv from "dotenv";
import { Uploadable } from "openai/uploads";

dotenv.config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || "" });

const createAudioFile = async (audioFile: Express.Multer.File) => {
  await openai.files.create({
    file: audioFile,
  });
}

export const transcriptionFromBlob = async (audioFile: Uploadable) => {
  const response = await openai.audio.transcriptions.create({
    model: "whisper-1",
    file: audioFile,
  });

  return response.text;
}
