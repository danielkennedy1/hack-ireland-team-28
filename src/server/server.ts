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
You are an expert 3D modeling assistant that creates sophisticated Three.js models.

RESPONSE FORMAT:
- Return ONLY valid JavaScript code
- No explanation text
- No markdown code blocks
- Code must define final result as 'mesh' or 'group' variable

AVAILABLE COMPONENTS (no imports needed):
- CylinderGeometry, BoxGeometry, SphereGeometry
- Mesh, Group
- MeshPhysicalMaterial, MeshStandardMaterial
- Vector3
- Math operations (Math.PI, etc)

Example valid response:
const baseGeometry = new CylinderGeometry(10, 10, 20, 32);
const material = new MeshPhysicalMaterial({ color: 0xcccccc });
const mesh = new Mesh(baseGeometry, material);

Your response should be similar - just the code, no explanation.
Bounding box should fit within: ${dimsText}
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
  // Include all necessary THREE components in the sandbox
  const sandbox = { 
    THREE,
    mesh: undefined, 
    group: undefined,
    // Add commonly used THREE classes directly
    Vector3: THREE.Vector3,
    Box3: THREE.Box3,
    BoxGeometry: THREE.BoxGeometry,
    CylinderGeometry: THREE.CylinderGeometry,
    SphereGeometry: THREE.SphereGeometry,
    Mesh: THREE.Mesh,
    Group: THREE.Group,
    MeshStandardMaterial: THREE.MeshStandardMaterial,
    MeshPhysicalMaterial: THREE.MeshPhysicalMaterial,
    Color: THREE.Color
  };

  // Update the system message to indicate no requires/imports needed
  const wrapperFn = new Function(
    "sandbox",
    `
    with (sandbox) {
      try {
        ${code}
        return mesh || group;
      } catch (error) {
        console.error('Error in Three.js code execution:', error);
        throw error;
      }
    }
    `
  );

  const result = wrapperFn(sandbox) as THREE.Object3D;
  if (!result) {
    throw new Error("GPT snippet did not define 'mesh' or 'group'.");
  }
  return result;
}// ------------------- Helpers for bounding box logic -------------------

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
function extractCodeFromResponse(response: string): string {
  // Look for code between JavaScript code blocks
  const codeMatch = response.match(/```(?:javascript|js)?\s*([\s\S]*?)\s*```/);
  if (codeMatch && codeMatch[1]) {
    return codeMatch[1].trim();
  }
  
  // If no code blocks found, try to extract just the code portion
  // by removing natural language text
  const lines = response.split('\n');
  const codeLines = lines.filter(line => 
    !line.startsWith('To ') && 
    !line.startsWith('This ') && 
    !line.includes('```') &&
    line.trim().length > 0
  );
  
  return codeLines.join('\n');
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

    // Extract just the code portion
    const codeSnippet = extractCodeFromResponse(response);
    console.log("Executing code snippet:", codeSnippet); // Debug log

    let threeObject: THREE.Object3D;
    try {
      threeObject = runThreeJsCode(codeSnippet);
    } catch (err) {
      console.error("Snippet eval error:", err);
      res.status(500).json({ 
        error: "Failed to eval snippet", 
        code: codeSnippet 
      });
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
