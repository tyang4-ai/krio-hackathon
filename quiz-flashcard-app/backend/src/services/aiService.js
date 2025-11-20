const OpenAI = require('openai');

class AIService {
  constructor() {
    // Using NVIDIA Nemotron API (OpenAI-compatible)
    this.client = new OpenAI({
      apiKey: process.env.NVIDIA_API_KEY,
      baseURL: 'https://integrate.api.nvidia.com/v1'
    });
    // Use the model linked to the API key
    this.model = 'nvidia/llama-3.3-nemotron-super-49b-v1';
  }

  async generateQuestions(content, options = {}) {
    const {
      count = 10,
      difficulty = 'medium',
      questionTypes = ['multiple_choice'],
      sampleQuestions = []
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

    const prompt = `Based on the following content, generate ${count} quiz questions.

Requirements:
- Difficulty level: ${difficulty} (${difficultyPrompt[difficulty]})
- Question types: ${questionTypes.join(', ')}
- Each question should test different concepts from the content
- Provide clear, unambiguous questions
- For multiple choice, provide 4 options (A, B, C, D)
${sampleSection}
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
      // Clean up response in case it has markdown code blocks
      const cleanedResponse = responseText
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();

      const result = JSON.parse(cleanedResponse);
      return result.questions || [];
    } catch (error) {
      console.error('Error generating questions:', error);
      if (error.status === 404) {
        throw new Error('Failed to generate questions: 404 status code - The API endpoint or model may not be available. Please check your NVIDIA_API_KEY is valid.');
      }
      throw new Error('Failed to generate questions: ' + (error.message || `${error.status} status code (no body)`));
    }
  }

  async generateFlashcards(content, options = {}) {
    const { count = 10 } = options;

    const prompt = `Based on the following content, create ${count} flashcards for studying essential concepts.

Requirements:
- Focus on key concepts, definitions, and important facts
- Front of card should be a clear question or term
- Back of card should be a concise but complete answer
- Cover different topics from the content
- Make them suitable for memorization and review

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
      // Clean up response in case it has markdown code blocks
      const cleanedResponse = responseText
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();

      const result = JSON.parse(cleanedResponse);
      return result.flashcards || [];
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
      // Clean up response in case it has markdown code blocks
      const cleanedResponse = responseText
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();

      return JSON.parse(cleanedResponse);
    } catch (error) {
      console.error('Error extracting topics:', error);
      throw new Error('Failed to extract topics: ' + error.message);
    }
  }
}

module.exports = new AIService();
