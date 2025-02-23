import express from 'express';
import { Request, Response, NextFunction } from 'express';
import bodyParser from 'body-parser';
import multer from 'multer';
import fs from 'fs';
import dotenv from 'dotenv';
import OpenAI from 'openai';
import { CONFIG } from './config';
import cors from 'cors';
import path from 'path';
import { app as electron_app } from 'electron';

import { buildRetrievalContext } from './retrieval';

// Import geometry functions
import {
    buildThreeJsSystemMessage,
    runThreeJsCode,
    extractDimensionsMm,
    extractCodeFromResponse,
    buildDimsText,
} from './geometry';

dotenv.config();

// Configure OpenAI
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
if (!OPENAI_API_KEY) {
    console.error('OpenAI API key not found. Set OPENAI_API_KEY in .env or environment.');
    process.exit(1);
}
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

// Import THREE.js components on server side
import * as THREE from 'three';
import { transcriptionFromBlob } from './transcribe';
import { isUploadable, Uploadable } from 'openai/uploads';
import { STLExporter } from 'three/addons/exporters/STLExporter';

const app = express();
const upload = multer();
app.use(
    cors({
        origin: 'http://localhost:3000',
        methods: ['GET', 'POST'],
        credentials: true,
    })
);

app.use(bodyParser.json());

let outputDirectory = path.join(electron_app.getAppPath(), '/assets');

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

app.get('/', (req: Request, res: Response) => {
    res.send('Hello from Express + Three.js + OpenAI!');
});

app.use('/assets', express.static(outputDirectory));

app.post(
    '/generate-model',
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const prompt = req.body?.prompt;
            if (!prompt) {
                res.status(400).json({ error: "Missing 'prompt' in request body." });
                return;
            }

            // Extract dimensions and build bounding box text
            const dims = extractDimensionsMm(prompt);
            const dimsText = buildDimsText(dims);

            // Retrieve relevant Three.js examples for the prompt
            const retrievalContext = await buildRetrievalContext(prompt);

            // Build the system message including original instructions and the retrieval context
            const systemMessage = `${buildThreeJsSystemMessage(dimsText)}\n\n${retrievalContext}`;

            // Use the user prompt as input
            const userMessage = prompt;

            const completion = await openai.chat.completions.create({
                model: 'o1-preview',
                messages: [{ role: 'user', content: systemMessage + '\n\n' + userMessage }],
                max_completion_tokens: 32000,
            });

            const response = completion.choices[0]?.message?.content?.trim() || '';
            if (!response) {
                res.status(500).json({ error: 'GPT returned empty response.' });
                return;
            }

            const codeSnippet = extractCodeFromResponse(response);
            console.log('Executing code snippet:', codeSnippet);

            let threeObject: THREE.Object3D;
            try {
                threeObject = runThreeJsCode(codeSnippet);
            } catch (err) {
                console.error('Snippet eval error:', err);
                res.status(500).json({ error: 'Failed to eval snippet', code: codeSnippet });
                return;
            }

            const exporter = new STLExporter();
            const stlString = exporter.parse(threeObject, {});

            const timestamp = Date.now();
            const filename = `model-${timestamp}.stl`;
            const outputPath = path.join(outputDirectory, filename);
            console.log('stlString:', stlString);
            fs.writeFileSync(outputPath, stlString, 'utf8');

            res.json({
                message: 'Three.js code generated & STL exported!',
                code_snippet: codeSnippet,
                file_saved: filename,
                prompt_used: prompt,
            });
            console.log('Three.js code generated & STL exported! file saved:', filename);
        } catch (err: any) {
            next(err);
        }
    }
);

const getFixPrompt = (prompt: string, code: string, dimsText: string) => {
    return `

    You are an expert 3D modeling assistant that creates sophisticated and realistic Three.js models.
    Leverage, your context, training data, embeddings to generate relevant examples.

    RESPONSE FORMAT:
    - Return ONLY valid JavaScript code
    - No explanation text
    - No markdown code blocks
    - Code must define the final result as either 'mesh' or 'group' variable (especially for complex forms or multiple objects)

    AVAILABLE COMPONENTS (no imports needed):
    - Basic geometries: CylinderGeometry, BoxGeometry, SphereGeometry, ExtrudeGeometry, TorusGeometry, LatheGeometry
      - Decide based on the prompt dimensions and requested shape
    - Materials: MeshPhysicalMaterial, MeshStandardMaterial, MeshPhongMaterial, MeshLambertMaterial, 
                MeshBasicMaterial, MeshToonMaterial, MeshNormalMaterial, ShaderMaterial
    - Colors: Color
    - Groups: Mesh, Group
    - Core classes: Vector3, Matrix4, Quaternion, Shape, Curve, BufferGeometry
    - Core classes: Vector3, Shape, Curve, BufferGeometry
    - Additional curve classes: LineCurve, QuadraticBezierCurve, CubicBezierCurve, EllipseCurve
      - Use these with operations to create custom shapes
    - WebGL utilities: WebGLRenderer (and access to its raw WebGL context via getContext())
    - Math (including Math.sin, Math.cos, etc)
    - CSG (for boolean operations, i.e putting a hole in a shape, or removing part of a shape)
    - Math operations (Math.PI, etc)

    Bounding box (max size) should fit within: ${dimsText}

    The following code snippet was generated based on the prompt "${prompt}" and the provided code snippet:
        \`\`\`${code}\`\`\
    Based on the image provided, please fix the code snippet to generate a 3D model that fits the prompt. MAKE MINIMAL CHANGES (such as positions and rotation) to the code snippet to fix the model.
    `.trim();
}

app.post(
    '/fix-model',
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const prompt = req.body?.prompt;
            const code = req.body?.code;
            const img = req.body?.img;
            if (!prompt) {
                res.status(400).json({ error: "Missing 'prompt' in request body." });
                return;
            }
            if (!code) {
                res.status(400).json({ error: "Missing 'code' in request body." });
                return;
            }
            if (!img) {
                res.status(400).json({ error: "Missing 'img' in request body." });
                return;
            }


            const dims = extractDimensionsMm(prompt);
            const dimsText = buildDimsText(dims);

            const completion = await openai.chat.completions.create({
                model: 'o1-preview',
                messages: [{
                    role: 'user', content: [
                        {
                            type: 'text',
                            text: getFixPrompt(prompt, code, dimsText)

                        },
                        {
                            type: 'image_url',
                            image_url: img
                        }
                    ]
                }],
                max_completion_tokens: 32000,
            });

            const response = completion.choices[0]?.message?.content?.trim() || '';
            if (!response) {
                res.status(500).json({ error: 'GPT returned empty response.' });
                return;
            }

            const codeSnippet = extractCodeFromResponse(response);
            console.log('Executing code snippet:', codeSnippet);

            let threeObject: THREE.Object3D;
            try {
                threeObject = runThreeJsCode(codeSnippet);
            } catch (err) {
                console.error('Snippet eval error:', err);
                res.status(500).json({ error: 'Failed to eval snippet', code: codeSnippet });
                return;
            }

            const exporter = new STLExporter();
            const stlString = exporter.parse(threeObject, {});

            const timestamp = Date.now();
            const filename = `model-${timestamp}.stl`;
            const outputPath = path.join(outputDirectory, filename);
            console.log('stlString:', stlString);
            fs.writeFileSync(outputPath, stlString, 'utf8');

            res.json({
                message: 'Three.js code generated & STL exported!',
                code_snippet: codeSnippet,
                file_saved: filename,
                prompt_used: prompt,
            });
            console.log('Three.js code generated & STL exported! file saved:', filename);
        } catch (err: any) {
            next(err);
        }
    }
);

app.post(
    '/transcribe',
    upload.single('audio'),
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const audioFile = req.file;
            if (!audioFile) {
                res.status(400).json({ error: 'Missing request body.' });
                return;
            }
            console.debug('Received audio file:', audioFile);
            fs.writeFileSync(path.join(outputDirectory, '/speech.wav'), audioFile.buffer);
            const audio = fs.createReadStream(path.join(outputDirectory, '/speech.wav'));
            const transcript = await transcriptionFromBlob(audio as Uploadable, 'en');
            res.json({ message: 'Success', transcript: transcript });
        } catch (err: any) {
            next(err);
        }
    }
);

// Error-handling middleware
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    console.error('Express error handler:', err);
    res.status(500).json({ error: err.message });
});
