import express, { Request, Response } from "express";
import bodyParser from "body-parser";
import fs from "fs";
import dotenv from "dotenv";
import OpenAI from "openai";
import { CONFIG } from "./config";

dotenv.config();

// 1) Configure OpenAI (v4 style)
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
if (!OPENAI_API_KEY) {
  console.error("OpenAI API key not found. Set OPENAI_API_KEY in .env or environment.");
  process.exit(1);
}
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

// 2) Create Express app
const app = express();
app.use(bodyParser.json());

// ----------------- Helpers -----------------

/**
 * Extract numeric dimensions from prompt (e.g., "60mm", "10mm").
 * Returns an array of floats, e.g. [60.0, 10.0].
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

/**
 * Build bounding box instructions based on extracted dims.
 *  - No dims => 10x10x10
 *  - 1 dim => x=dim, y=10, z=10
 *  - 2 dims => x, y, z=10
 *  - >=3 => first three as x,y,z
 */
function buildBoundingBoxInstructions(dims: number[]): string {
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

  // Ensure none are zero or negative
  x = Math.max(x, 1);
  y = Math.max(y, 1);
  z = Math.max(z, 1);

  return `Dimensions to span at least from (0,0,0) to (${x},${y},${z}) in mm. Ensure the STL coordinates use these as approximate bounding box.\n`;
}

// ----------------- Routes -----------------

// Basic GET route for a quick check
app.get("/", (req: Request, res: Response) => {
  res.send("Hello from Express + OpenAI v4!");
});

/**
 * POST /generate-model
 * Body: { prompt: string }
 */
app.post("/generate-model", async (req: Request, res: Response) => {

  const prompt = req.body?.prompt as string;
  if (!prompt) {
    res.status(400).json({ error: "Missing 'prompt' in request body." });
  }

  // 1) Extract numeric dims
  const dims = extractDimensionsMm(prompt);

  // 2) Construct bounding box instructions
  const boundingBoxText = buildBoundingBoxInstructions(dims);

  // 3) Build system + user messages
  const systemMessage = `
You are a 3D modeling assistant that outputs valid ASCII STL for the user's request.
1) Always produce valid ASCII STL with at least 2 triangles (non-zero volume).
2) ${boundingBoxText}
3) Output only ASCII STL, no commentary, no code.
4) If the shape is complex (like a wrench), produce an approximate shape within the bounding box.
`.trim();

  const messages = [
    { role: "system" as const, content: systemMessage },
    { role: "user" as const, content: prompt },
  ];

  try {
    // 4) Use the new v4 method: openai.chat.completions.create
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages,
      max_tokens: 2000,
      temperature: 0.7,
    });

    const stlText = response.choices[0]?.message?.content?.trim() || "";
    if (!stlText) {
      res.status(500).json({ error: "OpenAI returned empty STL text." });
    }

    // 5) Save the STL
    const filePath = "model.stl";
    fs.writeFileSync(filePath, stlText, "utf8");

    res.json({
      message: "AI-generated STL saved (with inferred bounding box).",
      file_saved: filePath,
      prompt_used: prompt,
    });
  } catch (err: any) {
    console.error("OpenAI error:", err);
    res.status(500).json({ error: err.message });
  }

});

// ----------------- Server Init -----------------

app.listen(CONFIG.SERVER_PORT, () => {
  console.log(`Server running on ${CONFIG.SERVER_URL}`);
});

