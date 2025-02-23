import fs from 'fs';
import path from 'path';
import { OpenAI } from 'openai';
import { app } from 'electron';
import dotenv from 'dotenv';
dotenv.config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || '' });

// Store examples in a more accessible location
function getExamplesPath(): string {
  const devPath =
    'C:/Users/danie/Development/hack-ireland-team-28/embeddings/examples_with_embeddings.json';
  return devPath;
}

const examplesPath = getExamplesPath();
if (!fs.existsSync(examplesPath)) {
  // Ensure directory exists and copy from bundled location if needed.
  const examplesDir = path.dirname(examplesPath);
  if (!fs.existsSync(examplesDir)) {
    fs.mkdirSync(examplesDir, { recursive: true });
  }
  // Try to copy from a known source location (adjust as needed)
  const sourceExamples = path.join(__dirname, 'examples', 'threejs_examples.json');
  if (fs.existsSync(sourceExamples)) {
    fs.copyFileSync(sourceExamples, examplesPath);
  } else {
    console.error('Source examples file not found:', sourceExamples);
  }
}

// Now load the examples
interface ThreeJSExample {
  title: string;
  tags: string[];
  description: string;
  code: string;
  embedding?: number[];
}

let examples: ThreeJSExample[] = [];
try {
  const data = fs.readFileSync(examplesPath, 'utf8');
  examples = JSON.parse(data);
} catch (err) {
  console.error('Failed to load examples:', err);
}

// Compute cosine similarity between two vectors
function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0,
    normA = 0,
    normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] ** 2;
    normB += b[i] ** 2;
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

// Compute an embedding for a given text using OpenAI's embeddings
async function computeEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: 'text-embedding-ada-002',
    input: text,
  });
  // Assumes response.data[0].embedding exists
  return response.data[0].embedding;
}

// Precompute embeddings for examples if not already computed
async function precomputeExampleEmbeddings(): Promise<void> {
  for (const example of examples) {
    if (!example.embedding) {
      try {
        // Combine description and code for the embedding
        const embedding = await computeEmbedding(example.description + ' ' + example.code);
        example.embedding = embedding;
      } catch (err) {
        console.error('Error computing embedding for example:', example.title, err);
      }
    }
  }
}

// Retrieve top-N relevant examples for a prompt
export async function getRelevantExamples(prompt: string, topN = 2): Promise<ThreeJSExample[]> {
  const promptEmbedding = await computeEmbedding(prompt);
  await precomputeExampleEmbeddings();
  const ranked = examples.map(example => {
    const sim = cosineSimilarity(promptEmbedding, example.embedding!);
    return { ...example, similarity: sim };
  });
  ranked.sort((a, b) => b.similarity - a.similarity);
  return ranked.slice(0, topN);
}

// Build a context string for GPT from the retrieved examples
export async function buildRetrievalContext(prompt: string): Promise<string> {
  const relevant = await getRelevantExamples(prompt);
  let context = 'Relevant Three.js Examples:\n';
  relevant.forEach((ex, idx) => {
    context += `Example ${idx + 1} - ${ex.title}:\n${ex.code}\n\n`;
  });
  return context;
}
