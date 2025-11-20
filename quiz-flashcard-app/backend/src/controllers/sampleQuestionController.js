const sampleQuestionService = require('../services/sampleQuestionService');
const aiService = require('../services/aiService');
const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');

// Helper function to extract text from PDF
async function extractTextFromPDF(filePath) {
  const dataBuffer = fs.readFileSync(filePath);
  const data = await pdfParse(dataBuffer);
  return data.text;
}

// Helper function to extract text from DOCX
async function extractTextFromDOCX(filePath) {
  const result = await mammoth.extractRawText({ path: filePath });
  return result.value;
}

// Helper function to use AI to extract questions from text
async function extractQuestionsWithAI(text) {
  const prompt = `Analyze the following text which contains sample quiz questions. Extract all questions with their options, correct answers, and explanations (if provided).

Text:
${text.substring(0, 8000)}

You MUST return ONLY valid JSON in this exact format (no extra text before or after):
{
  "questions": [
    {
      "question_text": "The question text",
      "question_type": "multiple_choice",
      "options": ["A) option1", "B) option2", "C) option3", "D) option4"],
      "correct_answer": "A",
      "explanation": "Optional explanation"
    }
  ]
}

Critical requirements:
- Return ONLY valid JSON with no markdown, no comments, no extra text
- Extract ALL questions found in the text
- Include the full question text (escape quotes properly with \\")
- Format options with letter prefixes like "A) ", "B) ", "C) ", "D) "
- Identify the correct answer letter (just the letter: A, B, C, or D)
- Include explanations if mentioned in the document
- Ensure all strings are properly escaped
- Do not include any text outside the JSON structure`;

  try {
    const response = await aiService.client.chat.completions.create({
      model: aiService.model,
      messages: [
        {
          role: 'system',
          content: 'You are an expert at analyzing educational content and extracting structured quiz questions. You MUST respond with valid JSON only, with no markdown formatting, no comments, and no text before or after the JSON.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.2,
      max_tokens: 4000
    });

    let responseText = response.choices[0].message.content;

    // More aggressive cleaning
    responseText = responseText
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .replace(/^[^{]*/, '') // Remove any text before first {
      .replace(/[^}]*$/, '') // Remove any text after last }
      .trim();

    // Try to parse, with error handling
    let result;
    try {
      result = JSON.parse(responseText);
    } catch (parseError) {
      console.error('JSON parse error:', parseError.message);
      console.error('Response text:', responseText.substring(0, 500));

      // Try to fix common JSON issues
      responseText = responseText
        .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // Remove control characters
        .replace(/,(\s*[}\]])/g, '$1') // Remove trailing commas
        .replace(/\\'/g, "'") // Fix escaped single quotes
        .replace(/([^\\])"/g, '$1\\"') // Escape unescaped quotes (basic attempt)

      try {
        result = JSON.parse(responseText);
      } catch (secondError) {
        throw new Error('AI returned invalid JSON. Please try again or use a different document format (JSON/CSV).');
      }
    }

    return result.questions || [];
  } catch (error) {
    console.error('Error extracting questions with AI:', error);
    throw new Error('Failed to extract questions from document: ' + error.message);
  }
}

// Helper function to parse CSV content
function parseCSV(content) {
  const lines = content.trim().split('\n');
  if (lines.length < 2) {
    throw new Error('CSV must have a header row and at least one data row');
  }

  const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
  const requiredHeaders = ['question_text', 'correct_answer'];

  for (const required of requiredHeaders) {
    if (!headers.includes(required)) {
      throw new Error(`CSV must include column: ${required}`);
    }
  }

  const samples = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim());
    if (values.length < headers.length) continue;

    const sample = {};
    headers.forEach((header, index) => {
      if (header === 'options') {
        // Parse options as JSON array or semicolon-separated
        try {
          sample[header] = JSON.parse(values[index]);
        } catch {
          sample[header] = values[index].split(';').map(o => o.trim());
        }
      } else if (header === 'tags') {
        try {
          sample[header] = JSON.parse(values[index]);
        } catch {
          sample[header] = values[index].split(';').map(t => t.trim());
        }
      } else {
        sample[header] = values[index];
      }
    });

    if (sample.question_text && sample.correct_answer) {
      samples.push(sample);
    }
  }

  return samples;
}

const sampleQuestionController = {
  // Get all sample questions for a category
  getByCategory: async (req, res) => {
    try {
      const { categoryId } = req.params;
      const samples = sampleQuestionService.getSampleQuestionsByCategory(categoryId);
      res.json(samples);
    } catch (error) {
      console.error('Error getting sample questions:', error);
      res.status(500).json({ error: 'Failed to get sample questions' });
    }
  },

  // Get single sample question by ID
  getById: async (req, res) => {
    try {
      const { id } = req.params;
      const sample = sampleQuestionService.getSampleQuestionById(id);

      if (!sample) {
        return res.status(404).json({ error: 'Sample question not found' });
      }

      res.json(sample);
    } catch (error) {
      console.error('Error getting sample question:', error);
      res.status(500).json({ error: 'Failed to get sample question' });
    }
  },

  // Create a new sample question
  create: async (req, res) => {
    try {
      const { categoryId } = req.params;
      const sampleData = {
        ...req.body,
        category_id: categoryId
      };

      const sample = sampleQuestionService.addSampleQuestion(sampleData);
      res.status(201).json(sample);
    } catch (error) {
      console.error('Error creating sample question:', error);
      res.status(500).json({ error: 'Failed to create sample question' });
    }
  },

  // Create multiple sample questions at once
  createBulk: async (req, res) => {
    try {
      const { categoryId } = req.params;
      const { samples } = req.body;

      if (!Array.isArray(samples) || samples.length === 0) {
        return res.status(400).json({ error: 'Samples must be a non-empty array' });
      }

      const ids = sampleQuestionService.addBulkSampleQuestions(samples, categoryId);
      const createdSamples = ids.map(id => sampleQuestionService.getSampleQuestionById(id));

      res.status(201).json(createdSamples);
    } catch (error) {
      console.error('Error creating bulk sample questions:', error);
      res.status(500).json({ error: 'Failed to create sample questions' });
    }
  },

  // Update a sample question
  update: async (req, res) => {
    try {
      const { id } = req.params;
      const sample = sampleQuestionService.updateSampleQuestion(id, req.body);

      if (!sample) {
        return res.status(404).json({ error: 'Sample question not found' });
      }

      res.json(sample);
    } catch (error) {
      console.error('Error updating sample question:', error);
      res.status(500).json({ error: 'Failed to update sample question' });
    }
  },

  // Delete a sample question
  delete: async (req, res) => {
    try {
      const { id } = req.params;
      sampleQuestionService.deleteSampleQuestion(id);
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting sample question:', error);
      res.status(500).json({ error: 'Failed to delete sample question' });
    }
  },

  // Get count of sample questions for a category
  getCount: async (req, res) => {
    try {
      const { categoryId } = req.params;
      const count = sampleQuestionService.getSampleQuestionCount(categoryId);
      res.json({ count });
    } catch (error) {
      console.error('Error getting sample question count:', error);
      res.status(500).json({ error: 'Failed to get sample question count' });
    }
  },

  // Upload sample questions from file (JSON, CSV, PDF, or DOCX)
  uploadFile: async (req, res) => {
    try {
      const { categoryId } = req.params;

      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const filePath = req.file.path;
      const fileExt = path.extname(req.file.originalname).toLowerCase();

      let samples = [];

      if (fileExt === '.json') {
        // Parse JSON file
        const content = fs.readFileSync(filePath, 'utf-8');
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed)) {
          samples = parsed;
        } else if (parsed.samples && Array.isArray(parsed.samples)) {
          samples = parsed.samples;
        } else if (parsed.questions && Array.isArray(parsed.questions)) {
          samples = parsed.questions;
        } else {
          throw new Error('JSON must contain an array of questions or have a "samples" or "questions" property');
        }
      } else if (fileExt === '.csv') {
        // Parse CSV file
        const content = fs.readFileSync(filePath, 'utf-8');
        samples = parseCSV(content);
      } else if (fileExt === '.pdf') {
        // Extract text from PDF and use AI to parse questions
        const text = await extractTextFromPDF(filePath);
        samples = await extractQuestionsWithAI(text);
      } else if (fileExt === '.docx') {
        // Extract text from DOCX and use AI to parse questions
        const text = await extractTextFromDOCX(filePath);
        samples = await extractQuestionsWithAI(text);
      } else {
        // Clean up uploaded file
        fs.unlinkSync(filePath);
        return res.status(400).json({ error: 'Unsupported file format. Please upload JSON, CSV, PDF, or DOCX file.' });
      }

      // Filter out invalid samples and provide feedback
      const validSamples = [];
      const invalidSamples = [];

      for (let i = 0; i < samples.length; i++) {
        if (!samples[i].question_text || !samples[i].correct_answer) {
          invalidSamples.push({
            index: i,
            reason: `Missing ${!samples[i].question_text ? 'question_text' : 'correct_answer'}`,
            partial: samples[i]
          });
        } else {
          validSamples.push(samples[i]);
        }
      }

      // Log invalid samples for debugging
      if (invalidSamples.length > 0) {
        console.warn('Skipped invalid samples:', JSON.stringify(invalidSamples, null, 2));
      }

      // Check if we have any valid samples
      if (validSamples.length === 0) {
        fs.unlinkSync(filePath);
        return res.status(400).json({
          error: 'No valid sample questions found in file',
          details: `Found ${samples.length} questions but all were invalid. Check console for details.`
        });
      }

      // Add valid samples to database
      const ids = sampleQuestionService.addBulkSampleQuestions(validSamples, categoryId);
      const createdSamples = ids.map(id => sampleQuestionService.getSampleQuestionById(id));

      // Clean up uploaded file
      fs.unlinkSync(filePath);

      // Prepare response message
      let message = `Successfully imported ${createdSamples.length} sample questions`;
      if (invalidSamples.length > 0) {
        message += ` (skipped ${invalidSamples.length} invalid questions)`;
      }

      res.status(201).json({
        success: true,
        message,
        samples: createdSamples,
        skipped: invalidSamples.length
      });
    } catch (error) {
      console.error('Error uploading sample questions file:', error);

      // Clean up file if it exists
      if (req.file && req.file.path && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }

      res.status(500).json({ error: error.message || 'Failed to upload sample questions' });
    }
  }
};

module.exports = sampleQuestionController;
