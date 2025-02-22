// scripts/generateEmbeddings.ts
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { OpenAI } from 'openai';

dotenv.config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || '' });

interface ThreeJSExample {
  title: string;
  tags: string[];
  description: string;
  code: string;
  embedding?: number[];
}

async function computeEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: 'text-embedding-ada-002',
    input: text,
  });
  return response.data[0].embedding;
}

async function main() {
  // Path to your examples JSON file (adjust as needed) - ../embeddings/examples.json
  const inputPath =  'embeddings/examples.json';
  // Path to save the updated examples JSON file
  const outputPath = 'embeddings/examples_with_embeddings.json';

  let examples: ThreeJSExample[] = [];

  try {
    const rawData = fs.readFileSync(inputPath, 'utf8');
    examples = JSON.parse(rawData);
  } catch (err) {
    console.error('Error reading examples file:', err);
    process.exit(1);
  }

  for (const example of examples) {
    // Combine description and code to generate a richer embedding.
    const textToEmbed = `${example.description}\n${example.code}`;
    console.log(`Computing embedding for: ${example.title}`);
    try {
      const embedding = await computeEmbedding(textToEmbed);
      example.embedding = embedding;
    } catch (err) {
      console.error(`Error computing embedding for ${example.title}:`, err);
    }
    // Optional: delay between requests to respect rate limits.
    await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
  }

  try {
    fs.writeFileSync(outputPath, JSON.stringify(examples, null, 2), 'utf8');
    console.log('Embeddings saved to:', outputPath);
  } catch (err) {
    console.error('Error writing output file:', err);
  }
}

main().catch(err => {
  console.error('Unexpected error:', err);
});
