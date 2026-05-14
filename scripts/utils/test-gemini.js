require('dotenv').config();
const axios = require('axios');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

async function testGemini() {
  console.log('Testing Gemini API...\n');
  console.log('API Key (first 20 chars):', GEMINI_API_KEY.substring(0, 20) + '...\n');

  const models = [
    'gemini-pro',
    'gemini-1.5-pro',
    'gemini-1.5-flash',
    'gemini-2.0-flash-exp'
  ];

  for (const model of models) {
    try {
      console.log(`Testing model: ${model}...`);
      const response = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
        {
          contents: [{
            parts: [{
              text: 'Hello, respond with just "OK"'
            }]
          }]
        },
        {
          headers: {
            'content-type': 'application/json'
          }
        }
      );

      console.log(`✅ SUCCESS with ${model}`);
      console.log('Response:', response.data.candidates[0].content.parts[0].text);
      console.log('\n');
      break;
    } catch (error) {
      console.log(`❌ FAILED: ${error.response?.status || error.message}`);
      if (error.response?.data) {
        console.log('Error:', JSON.stringify(error.response.data, null, 2));
      }
      console.log('\n');
    }
  }
}

testGemini();
