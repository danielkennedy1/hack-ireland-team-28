import express from "express";
import { Request, Response, NextFunction } from "express";
import bodyParser from "body-parser";
import fs from "fs";
import dotenv from "dotenv";
import OpenAI from "openai";
import { CONFIG } from "./config";
import cors from "cors";
import path from "path";

import { buildRetrievalContext } from "./retrieval";
import {
  buildThreeJsSystemMessage,
  runThreeJsCode,
  extractDimensionsMm,
  extractCodeFromResponse,
  buildDimsText,
} from "./geometry";

dotenv.config();

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
if (!OPENAI_API_KEY) {
  console.error("OpenAI API key not found. Set OPENAI_API_KEY in .env");
  process.exit(1);
}
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

// Importing THREE in the main process
import * as THREE from "three";

const app = express();
app.use(cors({
  origin: 'http://localhost:3000',
  methods: ['GET', 'POST'],
  credentials: true,
}));
app.use(bodyParser.json());

// Directory for generated STL files
let outputDirectory = '/Users/adambyrne/code/hack-ireland-team-28/.webpack/renderer/assets';
export const setOutputDirectory = (dir: string) => {
  outputDirectory = dir;
  if (!fs.existsSync(outputDirectory)) {
    fs.mkdirSync(outputDirectory, { recursive: true });
  }
};

export const start = () => {
  console.log(path.join(__dirname, 'assets'));
  app.listen(CONFIG.SERVER_PORT, () => {
    console.log(`Server running on ${CONFIG.SERVER_URL}`);
  });
};

app.get("/", (req: Request, res: Response) => {
  res.send("Hello from Express + Three.js + OpenAI!");
});

// Serve static assets
app.use('/assets', express.static(outputDirectory));

/**
 * Convert a BufferGeometry to a basic ASCII STL string.
 *  - Ensures geometry is non-indexed
 *  - Ensures normals are computed
 *  - Outputs standard ASCII STL lines that PrusaSlicer will accept
 */
function geometryToAsciiSTLString(geometry: THREE.BufferGeometry, solidName = "threeObject"): string {
  // 1) Triangulate => non-indexed
  const nonIndexed = geometry.toNonIndexed();
  // 2) Compute normals
  nonIndexed.computeVertexNormals();

  // Grab attributes
  const posAttrib = nonIndexed.getAttribute("position");
  const normAttrib = nonIndexed.getAttribute("normal");
  const vertexCount = posAttrib.count;

  // Must be multiples of 3 for triangles
  if (vertexCount % 3 !== 0) {
    throw new Error(`Geometry has ${vertexCount} vertices, which is not a multiple of 3.`);
  }

  // Build ASCII STL text
  let stl = `solid ${solidName}\n`;

  for (let i = 0; i < vertexCount; i += 3) {
    // Tri normal => from normal attribute of the first vertex of the tri
    const nx = normAttrib.getX(i);
    const ny = normAttrib.getY(i);
    const nz = normAttrib.getZ(i);

    stl += `  facet normal ${nx} ${ny} ${nz}\n`;
    stl += `    outer loop\n`;

    for (let j = 0; j < 3; j++) {
      const vx = posAttrib.getX(i + j);
      const vy = posAttrib.getY(i + j);
      const vz = posAttrib.getZ(i + j);

      stl += `      vertex ${vx} ${vy} ${vz}\n`;
    }

    stl += `    endloop\n`;
    stl += `  endfacet\n`;
  }

  stl += `endsolid ${solidName}\n`;
  return stl;
}

app.post("/generate-model", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const prompt = req.body?.prompt;
    if (!prompt) {
       res.status(400).json({ error: "Missing 'prompt' in request body." });
    }

    // Build bounding-box instructions
    const dims = extractDimensionsMm(prompt);
    const dimsText = buildDimsText(dims);

    // Retrieve relevant examples and build final system message
    const retrievalContext = await buildRetrievalContext(prompt);
    const systemMessage = `${buildThreeJsSystemMessage(dimsText)}\n\n${retrievalContext}`;
    const userMessage = prompt;

    // Call GPT to get code snippet
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemMessage },
        {
          role: "assistant",
          content: "Here's an example of valid code:\nconst geometry = new CylinderGeometry(1, 1, 4, 32);\nconst material = new MeshPhysicalMaterial({ color: 0xcccccc });\nconst mesh = new Mesh(geometry, material);",
        },
        { role: "user", content: userMessage },
      ],
      max_tokens: 10000,
      temperature: 0.8,
    });

    const responseMessage = completion.choices[0]?.message?.content?.trim() || "";
    if (!responseMessage) {
       res.status(500).json({ error: "GPT returned empty response." });
    }

    const codeSnippet = extractCodeFromResponse(responseMessage);
    console.log("Executing code snippet:", codeSnippet);

    // Evaluate code snippet in the VM
    let threeObject: THREE.Object3D;
    try {
      threeObject = runThreeJsCode(codeSnippet);
      // If it's a Mesh, unify geometry in the main context
      if (threeObject instanceof THREE.Mesh) {
        // We'll unify references by .clone()
        // We'll rely on geometryToAsciiSTLString to handle indexing, normals, etc.
      }
    } catch (err) {
      console.error("Snippet eval error:", err);
       res.status(500).json({ error: "Failed to eval snippet", code: codeSnippet });
    }
    
    // Build the ASCII STL text
    let stlText = "";
    if (threeObject instanceof THREE.Mesh && threeObject.geometry instanceof THREE.BufferGeometry) {
      // Use the helper function
      stlText = geometryToAsciiSTLString(threeObject.geometry, "threeModel");
    } else {
      // If not a Mesh, produce empty "solid" placeholder to avoid errors
      console.warn("Result is not a THREE.Mesh with BufferGeometry. Creating empty STL...");
      stlText = "solid threeModel\nendsolid threeModel\n";
    }

    // Write STL file
    const timestamp = Date.now();
    const filename = `model-${timestamp}.stl`;
    const outputPath = path.join(outputDirectory, filename);
    fs.writeFileSync(outputPath, stlText, "utf8");

    res.json({
      message: "Three.js code generated & STL exported!",
      gpt_snippet: codeSnippet,
      file_saved: filename,
      prompt_used: prompt,
    });

  } catch (err: any) {
    next(err);
  }
});

// Error-handling
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error("Express error handler:", err);
  res.status(500).json({ error: err.message });
});

export default app;
