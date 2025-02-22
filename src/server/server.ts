import express from "express";
import { Request, Response, NextFunction } from "express";
import bodyParser from "body-parser";
import fs from "fs";
import dotenv from "dotenv";
import OpenAI from "openai";
import { CONFIG } from "./config";
import cors from "cors";

// Import geometry functions
import {
  buildThreeJsSystemMessage,
  runThreeJsCode,
  extractDimensionsMm,
  extractCodeFromResponse,
  buildDimsText,
} from "./geometry";

dotenv.config();

// Configure OpenAI
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
if (!OPENAI_API_KEY) {
  console.error("OpenAI API key not found. Set OPENAI_API_KEY in .env or environment.");
  process.exit(1);
}
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

// Import THREE.js components on server side
import * as THREE from "three";
// If you installed three-stdlib:
import { STLExporter } from "three-stdlib";

const app = express();
app.use(cors());
app.use(bodyParser.json());

app.get("/", (req: Request, res: Response) => {
  res.send("Hello from Express + Three.js + OpenAI!");
});

app.post("/generate-model", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const prompt = req.body?.prompt;
    if (!prompt) {
      res.status(400).json({ error: "Missing 'prompt' in request body." });
      return;
    }

    // Extract dimensions and build bounding box text
    const dims = extractDimensionsMm(prompt);
    const dimsText = buildDimsText(dims);

    // Build system and user messages for GPT
    const systemMessage = buildThreeJsSystemMessage(dimsText);
    const userMessage = prompt;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemMessage },
        { 
          role: "assistant", 
          content: "Here's an example of valid code:\nconst geometry = new CylinderGeometry(1, 1, 4, 32);\nconst material = new MeshPhysicalMaterial({color: 0xcccccc});\nconst mesh = new Mesh(geometry, material);" 
        },
        { role: "user", content: userMessage },
      ],
      max_tokens: 2000,
      temperature: 0.7,
    });

    const response = completion.choices[0]?.message?.content?.trim() || "";
    if (!response) {
      res.status(500).json({ error: "GPT returned empty response." });
      return;
    }

    // Extract code portion from GPT response
    const codeSnippet = extractCodeFromResponse(response);
    console.log("Executing code snippet:", codeSnippet);

    let threeObject: THREE.Object3D;
    try {
      threeObject = runThreeJsCode(codeSnippet);
    } catch (err) {
      console.error("Snippet eval error:", err);
      res.status(500).json({ error: "Failed to eval snippet", code: codeSnippet });
      return;
    }

    const exporter = new STLExporter();
    const stlString = exporter.parse(threeObject);

    fs.writeFileSync("model.stl", stlString, "utf8");

    res.json({
      message: "Three.js code generated & STL exported!",
      gpt_snippet: codeSnippet,
      file_saved: "model.stl",
      prompt_used: prompt,
    });
  } catch (err: any) {
    next(err);
  }
});

app.listen(CONFIG.SERVER_PORT, () => {
  console.log(`Server running on ${CONFIG.SERVER_URL}`);
});

