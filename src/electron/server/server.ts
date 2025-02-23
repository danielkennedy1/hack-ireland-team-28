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
import { ChatCompletionCreateParams } from 'openai/resources';
import { buildErrorCorrectionSystemPrompt, buildPromptCorrectionSystemPrompt } from './correction';

import session from "express-session";
declare module 'express-session' {
  export interface SessionData {
    previousCodeSnippet?: string;
  }
}

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

// Hardcoded as session not intended to be secure
app.use(session({ secret: "4b85a753-f50b-4165-9963-0ed2ba11fcfa" }));

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
      const body = req.body?.prompt;
      if (!body.prompt) {
        res.status(400).json({ error: "Missing 'prompt' in request body." });
        return;
      }

      const isCorrection = body.isCorrection;
      const prompt = body.prompt;

      // Extract dimensions and build bounding box text
      const dims = extractDimensionsMm(prompt);
      const dimsText = buildDimsText(dims);

      // Retrieve relevant Three.js examples for the prompt
      const retrievalContext = await buildRetrievalContext(prompt);

      // Build the system message including original instructions and the retrieval context
      const systemMessage = `${buildThreeJsSystemMessage(dimsText)}\n\n${retrievalContext}`;

      // Use the user prompt as input
      let userMessage = "";
      if (req.session?.previousCodeSnippet !== undefined) {

      }
      if (isCorrection === true && req.session.previousCodeSnippet !== undefined) {
        userMessage = buildPromptCorrectionSystemPrompt(prompt, req.session.previousCodeSnippet);
      } else {
        userMessage = prompt + " Make it consistent and include details.";
      }

      let completionParams: ChatCompletionCreateParams = {
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: systemMessage + '\n\n' + userMessage }],
        max_completion_tokens: 16000,
      }

      const completion = await openai.chat.completions.create(completionParams);

      const response = completion.choices[0]?.message?.content?.trim() || '';
      if (!response) {
        res.status(500).json({ error: 'GPT returned empty response.' });
        return;
      }

      const codeSnippet = extractCodeFromResponse(response);
      req.session.previousCodeSnippet = codeSnippet;

      console.log('Executing code snippet:', codeSnippet);

      let threeObject: THREE.Object3D;
      try {
        threeObject = runThreeJsCode(codeSnippet);
      } catch (err) {
        console.warn('Snippet eval error:', err);

        // Attempt to recover once from error
        const systemMessage = buildErrorCorrectionSystemPrompt(codeSnippet, err);
        completionParams.model = "gpt-4o-mini";
        completionParams.messages = [{ role: 'user', content: systemMessage }];
        completionParams.max_completion_tokens = 16000;
        const correction = await openai.chat.completions.create(completionParams);

        const response = correction.choices[0]?.message?.content?.trim() || '';
        const newCodeSnippet = extractCodeFromResponse(response);
        req.session.previousCodeSnippet = newCodeSnippet;
        console.log("Correction:", newCodeSnippet);

        try {
          threeObject = runThreeJsCode(newCodeSnippet);
        } catch (err) {
          console.error('Snippet eval error:', err);
          res.status(500).json({ error: 'Failed to eval snippet', code: codeSnippet + newCodeSnippet });
          return;
        }
      }

      const exporter = new STLExporter();
      const stlString = exporter.parse(threeObject, {});

      const timestamp = Date.now();
      const filename = `model-${timestamp}.stl`;
      const outputPath = path.join(outputDirectory, filename);
      fs.writeFileSync(outputPath, stlString, 'utf8');

      res.json({
        message: 'Three.js code generated & STL exported!',
        gpt_snippet: codeSnippet,
        file_saved: filename,
        prompt_used: prompt,
      });
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
      const transcript = await transcriptionFromBlob(audio as Uploadable, 'en').catch(reason => next(reason));

      if (transcript) {
        res.json({ message: 'Success', transcript: transcript });
      }
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
