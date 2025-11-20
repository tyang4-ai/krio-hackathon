const OpenAI = require('openai');

class AIService {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }

  async generateQuestions(content, options = {}) {
    const {
      count = 10,
      difficulty = 'medium',
      questionTypes = ['multiple_choice']
    } = options;

    const difficultyPrompt = {
      easy: 'basic understanding and recall',
      medium: 'application and analysis',
      hard: 'synthesis, evaluation, and complex problem-solving'
    };

    const prompt = `Based on the following content, generate ${count} quiz questions.

Requirements:
- Difficulty level: ${difficulty} (${difficultyPrompt[difficulty]})
- Question types: ${questionTypes.join(', ')}
- Each question should test different concepts from the content
- Provide clear, unambiguous questions
- For multiple choice, provide 4 options (A, B, C, D)

Content:
${content.substring(0, 8000)}

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

Generate exactly ${count} questions.`;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are an expert educator who creates high-quality quiz questions. Always respond with valid JSON.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 4000,
        response_format: { type: 'json_object' }
      });

      const result = JSON.parse(response.choices[0].message.content);
      return result.questions || [];
    } catch (error) {
      console.error('Error generating questions:', error);
      throw new Error('Failed to generate questions: ' + error.message);
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

Generate exactly ${count} flashcards.`;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are an expert educator who creates effective flashcards for learning. Always respond with valid JSON.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 3000,
        response_format: { type: 'json_object' }
      });

      const result = JSON.parse(response.choices[0].message.content);
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
}`;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are an expert at analyzing educational content. Always respond with valid JSON.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 500,
        response_format: { type: 'json_object' }
      });

      return JSON.parse(response.choices[0].message.content);
    } catch (error) {
      console.error('Error extracting topics:', error);
      throw new Error('Failed to extract topics: ' + error.message);
    }
  }
}

module.exports = new AIService();
