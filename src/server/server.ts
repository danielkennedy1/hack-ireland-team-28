import express from "express";
import { Request, Response, NextFunction } from "express";
import bodyParser from "body-parser";
import fs from "fs";
import dotenv from "dotenv";
import OpenAI from "openai";
import { CONFIG } from "./config";
import cors from 'cors';

dotenv.config();

// 1) Configure OpenAI
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
if (!OPENAI_API_KEY) {
  console.error("OpenAI API key not found. Set OPENAI_API_KEY in .env or environment.");
  process.exit(1);
}
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

// 2) Import or require THREE server-side
import * as THREE from "three";
// If you installed three-stdlib:
import { STLExporter } from "three-stdlib"; 
// or: import { STLExporter } from "three/examples/jsm/exporters/STLExporter.js";

const app = express();
app.use(cors());
app.use(bodyParser.json());

// ------------------- GPT Prompt Logic -------------------

function buildThreeJsSystemMessage(dimsText: string): string {
  return `
You are a 3D modeling assistant that outputs JavaScript code for Three.js.
1) Output ONLY JavaScript code (no comments, no code fences).
2) The code must create a single mesh or group using vanilla Three.js geometry/material.
3) The code must define a variable named 'mesh' or 'group' at the end. That variable is what we'll export.
4) The bounding box should be from (0,0,0) to some appropriate size, e.g.  ${dimsText}
5) The user might request something like a "wrench" or "cube" or "sphere." 
   You can approximate it with boxes, cylinders, etc.
`.trim();
}

/**
 * A super-shitty approach to running GPT's Three.js snippet:
 *  - We create a function that shares the 'THREE' scope.
 *  - The snippet is appended and we expect it to define a global variable like 'mesh' or 'group'.
 *  - Then we return that variable so we can export it as STL.
 *
 * Real production code would use Node's 'vm' module or a safer approach.
 */
function runThreeJsCode(code: string): THREE.Object3D {
  const sandbox = { THREE, mesh: undefined, group: undefined };
  // Create a function that injects code. We attach to sandbox as 'this'.
  const wrapperFn = new Function(
    "sandbox",
    `
    with (sandbox) {
      ${code}
      // The code must define either mesh or group
      return mesh || group;
    }
  `
  );
  const result = wrapperFn(sandbox) as THREE.Object3D;
  // If neither mesh nor group was set, throw an error
  if (!result) {
    throw new Error("GPT snippet did not define 'mesh' or 'group'.");
  }
  return result;
}

// ------------------- Helpers for bounding box logic -------------------

/**
 * Extract numeric dims from prompt (e.g. "60mm")
 */
function extractDimensionsMm(prompt: string): number[] {
  const regex = /(\d+(?:\.\d+)?)\s*mm/gi;
  const matches = prompt.toLowerCase().matchAll(regex);
  const dims: number[] = [];
  for (const match of matches) {
    if (match[1]) {
      dims.push(parseFloat(match[1]));
    }
  }
  return dims;
}

function buildDimsText(dims: number[]): string {
  let x = 10, y = 10, z = 10;
  if (dims.length === 1) {
    x = dims[0];
  } else if (dims.length === 2) {
    x = dims[0];
    y = dims[1];
  } else if (dims.length >= 3) {
    x = dims[0];
    y = dims[1];
    z = dims[2];
  }
  x = Math.max(x, 1);
  y = Math.max(y, 1);
  z = Math.max(z, 1);

  return `Dimensions ~ [0,0,0] to [${x},${y},${z}] in mm (approx).`;
}

// ------------------- Routes -------------------

app.get("/", (req: Request, res: Response) => {
  res.send("Hello from Express + Three.js + OpenAI!");
});

/**
 * POST /generate-model
 * Body: { prompt: string }
 *
 * 1) Ask GPT for a snippet of Three.js code that defines 'mesh' or 'group'.
 * 2) Evaluate the snippet to get a real THREE.Object3D in Node.
 * 3) Export it as STL and save to model.stl
 */
app.post("/generate-model", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const prompt = req.body?.prompt;
    if (!prompt) {
      res.status(400).json({ error: "Missing 'prompt' in request body." });
      return;
    }

    // Get bounding-box instructions
    const dims = extractDimensionsMm(prompt);
    const dimsText = buildDimsText(dims);

    // Build system + user messages
    const systemMessage = buildThreeJsSystemMessage(dimsText);
    const userMessage = prompt;

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: systemMessage },
        { role: "user", content: userMessage },
      ],
      max_tokens: 1500,
      temperature: 0.7,
    });

    const codeSnippet = completion.choices[0]?.message?.content?.trim() || "";
    if (!codeSnippet) {
      res.status(500).json({ error: "GPT returned empty snippet." });
      return;
    }

    let threeObject: THREE.Object3D;
    try {
      threeObject = runThreeJsCode(codeSnippet);
    } catch (err) {
      console.error("Snippet eval error:", err);
      res.status(500).json({ error: "Failed to eval snippet: " + err });
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

// ------------------- Server Init -------------------

app.listen(CONFIG.SERVER_PORT, () => {
  console.log(`Server running on ${CONFIG.SERVER_URL}`);
});
