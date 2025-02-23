// scripts/fetchExamples.ts
import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

interface Example {
  title: string;
  tags: string[];
  description: string;
  code: string;
}

async function fetchExamples() {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  // Navigate to the Three.js examples page.
  await page.goto('https://threejs.org/examples/', { waitUntil: 'networkidle2' });

  // Extract links to example pages.
  const exampleLinks: { title: string; url: string }[] = await page.evaluate(() => {
    const anchors = Array.from(document.querySelectorAll('a'));
    return anchors
      .filter(a => a.href.includes('/examples/') && a.textContent && a.textContent.trim())
      .map(a => ({
        title: a.textContent!.trim(),
        url: a.href
      }));
  });

  console.log(`Found ${exampleLinks.length} example links.`);

  // For demonstration, limit to the first 10 examples.
  const limitedLinks = exampleLinks.slice(0, 10);
  const examples: Example[] = [];

  for (const link of limitedLinks) {
    console.log(`Processing: ${link.title} - ${link.url}`);
    try {
      const exPage = await browser.newPage();
      await exPage.goto(link.url, { waitUntil: 'networkidle2' });

      // Extract the page title.
      let pageTitle = await exPage.evaluate(() => document.title);
      if (!pageTitle) {
        pageTitle = link.title;
      }

      // Generate tags by splitting the title into words and filtering common words.
      const commonWords = new Set(['a', 'an', 'the', 'of', 'and', 'to']);
      const tags = pageTitle.split(/\s+/)
        .map(word => word.toLowerCase().replace(/[^a-z0-9]/g, ''))
        .filter(word => word.length > 0 && !commonWords.has(word));

      // Try to get a description from the meta tag; fallback if not found.
      const description = await exPage.evaluate(() => {
        const meta = document.querySelector('meta[name="description"]');
        return meta ? meta.getAttribute('content') || '' : '';
      });
      const finalDescription = description || `Example of ${pageTitle}`;

      // Extract code from <script> tags that mention "THREE"
      const code = await exPage.evaluate(() => {
        const scripts = Array.from(document.querySelectorAll('script'));
        return scripts
          .filter(script => script.textContent && script.textContent.includes('THREE'))
          .map(script => script.textContent)
          .join('\n\n');
      });

      examples.push({
        title: pageTitle,
        tags,
        description: finalDescription,
        code: code.trim() || 'No code found'
      });
      await exPage.close();
    } catch (error) {
      console.error(`Error processing ${link.title}:`, error);
    }
  }

  await browser.close();

  // Write the results to a JSON file.
  const outputPath = "embeddings/examples.json";
  fs.writeFileSync(outputPath, JSON.stringify(examples, null, 2), 'utf8');
  console.log(`Saved ${examples.length} examples to ${outputPath}`);
}

fetchExamples().catch(error => {
  console.error('Unexpected error:', error);
});
