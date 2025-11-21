const OpenAI = require('openai');

/**
 * Multi-Provider AI Service Factory
 * Supports: NVIDIA, Groq, Together.ai, Ollama, AWS Bedrock, HuggingFace
 *
 * Set AI_PROVIDER environment variable to switch providers:
 * - 'nvidia' (default)
 * - 'groq' (recommended for Vercel - fast & cheap)
 * - 'together' (good balance)
 * - 'ollama' (local dev - free)
 * - 'bedrock' (AWS deployment)
 * - 'huggingface' (max flexibility)
 */
class AIServiceFactory {
  static createClient() {
    const provider = process.env.AI_PROVIDER || 'nvidia';

    switch(provider.toLowerCase()) {
      case 'groq':
        return this.createGroq();
      case 'together':
        return this.createTogether();
      case 'ollama':
        return this.createOllama();
      case 'bedrock':
        return this.createBedrock();
      case 'huggingface':
        return this.createHuggingFace();
      case 'nvidia':
      default:
        return this.createNvidia();
    }
  }

  static createNvidia() {
    const apiKey = process.env.NVIDIA_API_KEY;
    if (!apiKey) {
      throw new Error('NVIDIA_API_KEY environment variable is required');
    }

    return {
      client: new OpenAI({
        apiKey,
        baseURL: 'https://integrate.api.nvidia.com/v1'
      }),
      model: process.env.AI_MODEL || 'nvidia/llama-3.3-nemotron-super-49b-v1',
      provider: 'nvidia'
    };
  }

  static createGroq() {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      throw new Error('GROQ_API_KEY environment variable is required');
    }

    return {
      client: new OpenAI({
        apiKey,
        baseURL: 'https://api.groq.com/openai/v1'
      }),
      model: process.env.AI_MODEL || 'mixtral-8x7b-32768', // or 'llama-3.1-70b-versatile'
      provider: 'groq'
    };
  }

  static createTogether() {
    const apiKey = process.env.TOGETHER_API_KEY;
    if (!apiKey) {
      throw new Error('TOGETHER_API_KEY environment variable is required');
    }

    return {
      client: new OpenAI({
        apiKey,
        baseURL: 'https://api.together.xyz/v1'
      }),
      model: process.env.AI_MODEL || 'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo',
      provider: 'together'
    };
  }

  static createOllama() {
    return {
      client: new OpenAI({
        apiKey: 'ollama', // Dummy key for local
        baseURL: process.env.OLLAMA_BASE_URL || 'http://localhost:11434/v1'
      }),
      model: process.env.AI_MODEL || 'mistral', // or 'llama3.2', 'phi3.5'
      provider: 'ollama'
    };
  }

  static createBedrock() {
    // AWS Bedrock requires AWS SDK - will implement if needed
    throw new Error('AWS Bedrock support requires @aws-sdk/client-bedrock-runtime. Install it and uncomment the implementation in aiService.js');

    /* Uncomment when AWS SDK is installed:
    const { BedrockRuntimeClient } = require('@aws-sdk/client-bedrock-runtime');

    return {
      client: new BedrockRuntimeClient({
        region: process.env.AWS_REGION || 'us-east-1',
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
        }
      }),
      model: process.env.AI_MODEL || 'meta.llama3-70b-instruct-v1:0',
      provider: 'bedrock',
      isBedrockClient: true
    };
    */
  }

  static createHuggingFace() {
    // HuggingFace requires @huggingface/inference - will implement if needed
    throw new Error('HuggingFace support requires @huggingface/inference. Install it and uncomment the implementation in aiService.js');

    /* Uncomment when HF SDK is installed:
    const { HfInference } = require('@huggingface/inference');

    const apiKey = process.env.HUGGINGFACE_API_KEY;
    if (!apiKey) {
      throw new Error('HUGGINGFACE_API_KEY environment variable is required');
    }

    return {
      client: new HfInference(apiKey),
      model: process.env.AI_MODEL || 'mistralai/Mistral-7B-Instruct-v0.2',
      provider: 'huggingface',
      isHuggingFaceClient: true
    };
    */
  }
}

class AIService {
  constructor() {
    const config = AIServiceFactory.createClient();
    this.client = config.client;
    this.model = config.model;
    this.provider = config.provider;
    this.maxRetries = parseInt(process.env.AI_MAX_RETRIES) || 3;
    this.retryDelay = parseInt(process.env.AI_RETRY_DELAY) || 1000;

    console.log(`AI Service initialized with provider: ${this.provider}, model: ${this.model}`);
  }

  /**
   * Retry logic with exponential backoff
   */
  async retryWithBackoff(fn, retries = this.maxRetries) {
    for (let i = 0; i < retries; i++) {
      try {
        return await fn();
      } catch (error) {
        const isLastRetry = i === retries - 1;

        // Don't retry on certain errors
        if (error.status === 401 || error.status === 403) {
          throw error; // Authentication errors shouldn't be retried
        }

        if (isLastRetry) {
          throw error;
        }

        // Exponential backoff
        const delay = this.retryDelay * Math.pow(2, i);
        console.warn(`AI request failed (attempt ${i + 1}/${retries}), retrying in ${delay}ms...`, error.message);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  /**
   * Clean AI response to extract JSON
   */
  cleanJsonResponse(responseText) {
    return responseText
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .replace(/^[^{[]*/, '') // Remove text before first { or [
      .replace(/[^}\]]*$/, '') // Remove text after last } or ]
      .trim();
  }

  async generateQuestions(content, options = {}) {
    const {
      count = 10,
      difficulty = 'medium',
      questionTypes = ['multiple_choice'],
      sampleQuestions = [],
      customDirections = ''
    } = options;

    const difficultyPrompt = {
      easy: 'basic understanding and recall',
      medium: 'application and analysis',
      hard: 'synthesis, evaluation, and complex problem-solving'
    };

    // Build sample questions section if samples are provided
    let sampleSection = '';
    if (sampleQuestions.length > 0) {
      sampleSection = `
IMPORTANT - Style Guide from Sample Questions:
The user has provided the following sample questions. Analyze their characteristics carefully and generate new questions that match:
- Question phrasing style and tone
- Option format and length
- Level of detail in explanations
- Type of answer choices
- Overall structure and formatting

Sample Questions to Learn From:
${sampleQuestions.map((sq, i) => `
Example ${i + 1}:
Question: ${sq.question_text}
Type: ${sq.question_type}
Options: ${JSON.stringify(sq.options)}
Correct Answer: ${sq.correct_answer}
Explanation: ${sq.explanation || 'N/A'}
`).join('\n')}

Generate new questions that match this style while covering different concepts from the content.
`;
    }

    // Build custom directions section if provided
    let customDirectionsSection = '';
    if (customDirections && customDirections.trim()) {
      customDirectionsSection = `

CUSTOM INSTRUCTIONS FROM USER:
${customDirections.trim()}

Follow these custom instructions carefully while generating the questions.
`;
    }

    const prompt = `Based on the following content, generate ${count} quiz questions.

Requirements:
- Difficulty level: ${difficulty} (${difficultyPrompt[difficulty]})
- Question types: ${questionTypes.join(', ')}
- Each question should test different concepts from the content
- Provide clear, unambiguous questions
- For multiple choice, provide 4 options (A, B, C, D)
${sampleSection}${customDirectionsSection}
Content:
${content.substring(0, sampleQuestions.length > 0 ? 6000 : 8000)}

Return the questions in the following JSON format:
{
  "questions": [
    {
      "question_text": "The question here",
      "question_type": "multiple_choice",
      "difficulty": "${difficulty}",
      "options": ["A) Option 1", "B) Option 2", "C) Option 3", "D) Option 4"],
      "correct_answer": "A",
      "explanation": "Brief explanation of why this is correct",
      "tags": ["topic1", "topic2"]
    }
  ]
}

Generate exactly ${count} questions. Respond ONLY with valid JSON, no other text.`;

    try {
      const result = await this.retryWithBackoff(async () => {
        const response = await this.client.chat.completions.create({
          model: this.model,
          messages: [
            {
              role: 'system',
              content: 'You are an expert educator who creates high-quality quiz questions. Always respond with valid JSON only, no markdown formatting or extra text.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.7,
          max_tokens: 4000
        });

        const responseText = response.choices[0].message.content;
        const cleanedResponse = this.cleanJsonResponse(responseText);
        const parsed = JSON.parse(cleanedResponse);

        return parsed.questions || [];
      });

      // Log usage for cost tracking
      console.log(`Generated ${result.length} questions using ${this.provider}`);
      return result;

    } catch (error) {
      console.error('Error generating questions:', error);

      // Provider-specific error messages
      if (error.status === 404) {
        throw new Error(`Failed to generate questions: 404 status code - The API endpoint or model may not be available. Provider: ${this.provider}, Model: ${this.model}. Please check your API key and model configuration.`);
      }

      if (error.status === 401 || error.status === 403) {
        throw new Error(`Authentication failed for ${this.provider}. Please check your API key.`);
      }

      if (error.status === 429) {
        throw new Error(`Rate limit exceeded for ${this.provider}. Please try again later or upgrade your plan.`);
      }

      throw new Error('Failed to generate questions: ' + (error.message || `${error.status} status code (no body)`));
    }
  }

  async generateFlashcards(content, options = {}) {
    const { count = 10, customDirections = '' } = options;

    // Build custom directions section if provided
    let customDirectionsSection = '';
    if (customDirections && customDirections.trim()) {
      customDirectionsSection = `

CUSTOM INSTRUCTIONS FROM USER:
${customDirections.trim()}

Follow these custom instructions carefully while generating the flashcards.
`;
    }

    const prompt = `Based on the following content, create ${count} flashcards for studying essential concepts.

Requirements:
- Focus on key concepts, definitions, and important facts
- Front of card should be a clear question or term
- Back of card should be a concise but complete answer
- Cover different topics from the content
- Make them suitable for memorization and review
${customDirectionsSection}
Content:
${content.substring(0, 8000)}

Return the flashcards in the following JSON format:
{
  "flashcards": [
    {
      "front_text": "Term or question",
      "back_text": "Definition or answer",
      "difficulty": "medium",
      "tags": ["topic1", "topic2"]
    }
  ]
}

Generate exactly ${count} flashcards. Respond ONLY with valid JSON, no other text.`;

    try {
      const result = await this.retryWithBackoff(async () => {
        const response = await this.client.chat.completions.create({
          model: this.model,
          messages: [
            {
              role: 'system',
              content: 'You are an expert educator who creates effective flashcards for learning. Always respond with valid JSON only, no markdown formatting or extra text.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.7,
          max_tokens: 3000
        });

        const responseText = response.choices[0].message.content;
        const cleanedResponse = this.cleanJsonResponse(responseText);
        const parsed = JSON.parse(cleanedResponse);

        return parsed.flashcards || [];
      });

      console.log(`Generated ${result.length} flashcards using ${this.provider}`);
      return result;

    } catch (error) {
      console.error('Error generating flashcards:', error);
      throw new Error('Failed to generate flashcards: ' + error.message);
    }
  }

  async extractKeyTopics(content) {
    const prompt = `Analyze the following content and extract the main topics and themes.

Content:
${content.substring(0, 4000)}

Return in JSON format:
{
  "topics": ["topic1", "topic2", "topic3"],
  "summary": "Brief summary of the content"
}

Respond ONLY with valid JSON, no other text.`;

    try {
      const result = await this.retryWithBackoff(async () => {
        const response = await this.client.chat.completions.create({
          model: this.model,
          messages: [
            {
              role: 'system',
              content: 'You are an expert at analyzing educational content. Always respond with valid JSON only, no markdown formatting or extra text.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.3,
          max_tokens: 500
        });

        const responseText = response.choices[0].message.content;
        const cleanedResponse = this.cleanJsonResponse(responseText);
        return JSON.parse(cleanedResponse);
      });

      console.log(`Extracted topics using ${this.provider}`);
      return result;

    } catch (error) {
      console.error('Error extracting topics:', error);
      throw new Error('Failed to extract topics: ' + error.message);
    }
  }

  /**
   * Health check for the AI service
   */
  async healthCheck() {
    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'user', content: 'Say "OK"' }
        ],
        max_tokens: 10
      });

      return {
        healthy: true,
        provider: this.provider,
        model: this.model,
        response: response.choices[0].message.content
      };
    } catch (error) {
      return {
        healthy: false,
        provider: this.provider,
        model: this.model,
        error: error.message
      };
    }
  }
}

module.exports = new AIService();
