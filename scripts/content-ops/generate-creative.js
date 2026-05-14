/**
 * Gemini Image Generation — Paid Media Creative Generator
 * Model: gemini-3.1-flash-image-preview (Nano Banana 2)
 *
 * Usage:
 *   node generate-creative.js                                            → default vFairs prompt
 *   node generate-creative.js "your custom prompt"                       → custom prompt, no refs
 *   node generate-creative.js --prompt "..." --out "filename.png"        → named args
 *   node generate-creative.js --ref "logo.png" --prompt "..."            → with logo reference
 *   node generate-creative.js --ref "logo.png" --style-ref "https://..."  → logo + competitor ad style
 *
 * Flags:
 *   --prompt   "..."          Ad creative brief / instructions
 *   --ref      path/to/logo   Local image file passed as brand logo reference
 *   --style-ref URL           URL of a competitor ad image — fetched and passed as style reference
 *   --out      filename        Output filename (no extension needed)
 *
 * Output: outputs/creatives/[filename].png
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) {
  console.error('ERROR: GEMINI_API_KEY not found in .env');
  process.exit(1);
}

const MODEL = 'gemini-3.1-flash-image-preview';
const OUTPUT_DIR = path.join(__dirname, '../../outputs/creatives');

// Default prompt — vFairs paid media creative
const DEFAULT_PROMPT = `
Create a professional B2B SaaS LinkedIn ad creative (1200x628px landscape format).

Design specs:
- Dark navy/charcoal background (#1a2035)
- Bold white headline centered: "Run Every Event. Zero Chaos."
- Sub-headline below in light grey: "Virtual. Hybrid. In-Person. One platform."
- Bottom right: a clean teal/blue CTA button with white text "Get a Free Demo"
- Top left corner: clean minimal logo text "vFairs" in white, bold
- Background: subtle abstract conference/event visual — blurred warm stage lighting, soft bokeh effect suggesting a large event venue, very muted so text remains dominant
- Bottom strip: thin teal accent bar (#00a99d) running full width
- Overall feel: premium, enterprise SaaS, modern, trustworthy
- No people faces. No stock-photo feel. Abstract and geometric.
- Typography should feel like Inter or Helvetica — clean sans-serif
`;

async function fetchImageFromUrl(url) {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const mimeType = contentType.split(';')[0].trim();
    const buffer = Buffer.from(await response.arrayBuffer());
    return { base64: buffer.toString('base64'), mimeType, sizeKB: (buffer.length / 1024).toFixed(0) };
  } catch (err) {
    throw new Error(`Failed to fetch style reference image: ${err.message}`);
  }
}

async function generateImage(prompt, outputFilename, refImagePath, styleRefUrl) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`;

  const parts = [{ text: prompt.trim() }];

  // Logo reference — local file
  if (refImagePath) {
    const absPath = path.resolve(refImagePath);
    if (!fs.existsSync(absPath)) {
      throw new Error(`Logo file not found: ${absPath}`);
    }
    const imageBuffer = fs.readFileSync(absPath);
    const base64Image = imageBuffer.toString('base64');
    const ext = path.extname(absPath).toLowerCase().replace('.', '');
    const mimeType = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg'
                   : ext === 'webp' ? 'image/webp'
                   : 'image/png';
    parts.push({ inlineData: { mimeType, data: base64Image } });
    console.log(`Logo loaded: ${absPath} (${(imageBuffer.length / 1024).toFixed(0)}KB)`);
  }

  // Style reference — fetched from URL (competitor ad image)
  if (styleRefUrl) {
    try {
      const { base64, mimeType, sizeKB } = await fetchImageFromUrl(styleRefUrl);
      parts.push({ inlineData: { mimeType, data: base64 } });
      console.log(`Style reference loaded from URL (${sizeKB}KB, ${mimeType})`);
    } catch (err) {
      console.warn(`Warning: ${err.message} — proceeding without style reference`);
    }
  }

  const body = {
    contents: [{ parts }],
    generationConfig: {
      responseModalities: ['IMAGE', 'TEXT']
    }
  };

  console.log(`\nCalling Gemini ${MODEL}...`);
  console.log(`Prompt (first 120 chars): ${prompt.trim().slice(0, 120)}...\n`);

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Gemini API error ${response.status}: ${error}`);
  }

  const data = await response.json();

  const responseParts = data?.candidates?.[0]?.content?.parts ?? [];
  const imagePart = responseParts.find(p => p.inlineData?.mimeType?.startsWith('image/'));
  const textPart = responseParts.find(p => p.text);

  if (!imagePart) {
    console.log('Full response:', JSON.stringify(data, null, 2));
    throw new Error('No image returned in response.');
  }

  const mimeType = imagePart.inlineData.mimeType;
  const base64Data = imagePart.inlineData.data;
  const ext = mimeType.split('/')[1] || 'png';

  const filename = outputFilename
    ? (outputFilename.endsWith(`.${ext}`) ? outputFilename : `${outputFilename}.${ext}`)
    : `creative-${Date.now()}.${ext}`;

  const outputPath = path.join(OUTPUT_DIR, filename);
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  fs.writeFileSync(outputPath, Buffer.from(base64Data, 'base64'));

  console.log(`✓ Saved: ${outputPath}`);
  if (textPart?.text) {
    console.log(`Model note: ${textPart.text}`);
  }

  return outputPath;
}

function parseArgs(args) {
  let prompt = DEFAULT_PROMPT;
  let outputFilename = null;
  let refImagePath = null;
  let styleRefUrl = null;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--prompt' && args[i + 1]) {
      prompt = args[++i];
    } else if (args[i] === '--out' && args[i + 1]) {
      outputFilename = args[++i];
    } else if (args[i] === '--ref' && args[i + 1]) {
      refImagePath = args[++i];
    } else if (args[i] === '--style-ref' && args[i + 1]) {
      styleRefUrl = args[++i];
    } else if (!args[i].startsWith('--') && i === 0) {
      prompt = args[i];
    }
  }

  return { prompt, outputFilename, refImagePath, styleRefUrl };
}

(async () => {
  const args = process.argv.slice(2);
  const { prompt, outputFilename, refImagePath, styleRefUrl } = parseArgs(args);

  try {
    const savedPath = await generateImage(prompt, outputFilename, refImagePath, styleRefUrl);
    console.log(`\nDone: ${savedPath}`);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
