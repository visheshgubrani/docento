import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { Type } from '@google/genai'
import { prisma } from '../lib/prisma'
import { getGeminiClient } from '../lib/gemini'
import ApiError from '../utils/ApiError'
import ApiResponse from '../utils/ApiResponse'
import {
  generateCaptions,
  getCaptionStatus,
  fetchTranscription,
  vttToPlainText,
  SUPPORTED_LANGUAGES,
  SupportedLanguage,
} from '../utils/transcription'

// ===== SCHEMAS =====

const transcribeSchema = z.object({
  language: z
    .enum(SUPPORTED_LANGUAGES as unknown as [string, ...string[]])
    .optional()
    .default('en'),
})

const summarySchema = z.object({
  maxLength: z.number().min(50).max(2000).optional().default(500),
})

const generateQuizSchema = z.object({
  description: z
    .string()
    .min(10, 'Quiz description must be at least 10 characters'),
  questionCount: z.number().min(1).max(20).optional().default(5),
  questionTypes: z
    .array(z.enum(['MULTIPLE_CHOICE', 'TRUE_FALSE', 'SHORT_ANSWER']))
    .optional()
    .default(['MULTIPLE_CHOICE']),
  difficulty: z
    .enum(['beginner', 'intermediate', 'advanced'])
    .optional()
    .default('intermediate'),
})

const chatSchema = z.object({
  message: z.string().min(1, 'Message is required'),
  history: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string(),
      }),
    )
    .optional()
    .default([]),
})

const courseOutlineSchema = z.object({
  description: z
    .string()
    .min(10, 'Course description must be at least 10 characters'),
  targetAudience: z.string().optional(),
  difficulty: z
    .enum(['beginner', 'intermediate', 'advanced'])
    .optional()
    .default('intermediate'),
  moduleCount: z.number().min(1).max(20).optional().default(5),
  lessonsPerModule: z.number().min(1).max(15).optional().default(4),
})

const aiQuizResponseSchema = z.object({
  questions: z.array(
    z.object({
      questionText: z.string(),
      questionType: z.enum(['MULTIPLE_CHOICE', 'TRUE_FALSE', 'SHORT_ANSWER']),
      options: z.array(z.string()),
      correctAnswer: z.string(),
      explanation: z.string(),
      points: z.number(),
    }),
  ),
})

const aiCourseOutlineResponseSchema = z.object({
  title: z.string(),
  description: z.string(),
  modules: z.array(
    z.object({
      title: z.string(),
      description: z.string(),
      order: z.number(),
      lessons: z.array(
        z.object({
          title: z.string(),
          description: z.string(),
          contentType: z.enum(['VIDEO', 'TEXT']),
          estimatedDuration: z.number(),
          order: z.number(),
          isFree: z.boolean(),
        }),
      ),
    }),
  ),
  suggestedPrice: z.number(),
  estimatedTotalHours: z.number(),
  prerequisites: z.array(z.string()),
  learningOutcomes: z.array(z.string()),
})

// ===== GEMINI STRUCTURED OUTPUT SCHEMAS =====

const geminiQuizSchema = {
  type: Type.OBJECT,
  properties: {
    questions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          questionText: { type: Type.STRING },
          questionType: {
            type: Type.STRING,
            enum: ['MULTIPLE_CHOICE', 'TRUE_FALSE', 'SHORT_ANSWER'],
          },
          options: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
          correctAnswer: { type: Type.STRING },
          explanation: { type: Type.STRING },
          points: { type: Type.NUMBER },
        },
        required: [
          'questionText',
          'questionType',
          'options',
          'correctAnswer',
          'explanation',
          'points',
        ],
      },
    },
  },
  required: ['questions'],
}

const geminiCourseOutlineSchema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING },
    description: { type: Type.STRING },
    modules: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          description: { type: Type.STRING },
          order: { type: Type.NUMBER },
          lessons: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                description: { type: Type.STRING },
                contentType: {
                  type: Type.STRING,
                  enum: ['VIDEO', 'TEXT'],
                },
                estimatedDuration: { type: Type.NUMBER },
                order: { type: Type.NUMBER },
                isFree: { type: Type.BOOLEAN },
              },
              required: [
                'title',
                'description',
                'contentType',
                'estimatedDuration',
                'order',
                'isFree',
              ],
            },
          },
        },
        required: ['title', 'description', 'order', 'lessons'],
      },
    },
    suggestedPrice: { type: Type.NUMBER },
    estimatedTotalHours: { type: Type.NUMBER },
    prerequisites: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
    learningOutcomes: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
  },
  required: [
    'title',
    'description',
    'modules',
    'suggestedPrice',
    'estimatedTotalHours',
    'prerequisites',
    'learningOutcomes',
  ],
}

// ===== HELPER FUNCTIONS =====

const getVideoIdFromLesson = (lesson: any): string | null => {
  if (lesson.videoId) return lesson.videoId
  if (lesson.videoUrl) return lesson.videoUrl.split('/').pop()?.split('?')[0]
  return null
}

const getTranscriptionText = async (
  videoId: string,
  language: string = 'en',
): Promise<string> => {
  const vttContent = await fetchTranscription(videoId, language)
  return vttToPlainText(vttContent)
}

const extractJsonCandidate = (raw: string): string => {
  const trimmed = raw.trim()
  if (!trimmed) {
    throw new Error('AI response was empty')
  }

  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)
  if (fencedMatch?.[1]) {
    return fencedMatch[1].trim()
  }

  const firstBraceIndex = trimmed.search(/[{[]/)
  if (firstBraceIndex === -1) {
    return trimmed
  }

  const opening = trimmed[firstBraceIndex]
  const closing = opening === '{' ? '}' : ']'
  let depth = 0
  let inString = false
  let escaping = false

  for (let index = firstBraceIndex; index < trimmed.length; index += 1) {
    const char = trimmed[index]

    if (escaping) {
      escaping = false
      continue
    }

    if (char === '\\') {
      escaping = true
      continue
    }

    if (char === '"') {
      inString = !inString
      continue
    }

    if (inString) continue

    if (char === opening) depth += 1
    if (char === closing) depth -= 1

    if (depth === 0) {
      return trimmed.slice(firstBraceIndex, index + 1)
    }
  }

  return trimmed.slice(firstBraceIndex)
}

const parseAiJson = <T>(raw: string, schema: z.ZodType<T>): T => {
  const jsonCandidate = extractJsonCandidate(raw)
  const parsed = JSON.parse(jsonCandidate) as unknown
  return schema.parse(parsed)
}

// ===== TRANSCRIPTION ENDPOINTS =====

/**
 * POST /ai/transcribe
 * Trigger caption generation for a video lesson
 */
export const generateTranscription = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const lesson = req.lesson!

    // Validate lesson type
    if (lesson.contentType !== 'VIDEO') {
      return next(new ApiError(400, 'Only video lessons can be transcribed'))
    }

    const videoId = getVideoIdFromLesson(lesson)
    if (!videoId) {
      return next(new ApiError(400, 'No video found for this lesson'))
    }

    // Check video status
    if (lesson.videoStatus !== 'READY') {
      return next(
        new ApiError(
          422,
          'Video must be ready before generating transcription',
        ),
      )
    }

    // Parse request
    const parsed = transcribeSchema.safeParse(req.body)
    if (!parsed.success) {
      return next(new ApiError(400, parsed.error.issues[0].message))
    }

    const { language } = parsed.data

    // Trigger caption generation
    const result = await generateCaptions(
      videoId,
      language as SupportedLanguage,
    )

    // Update lesson
    await prisma.lesson.update({
      where: { id: lesson.id },
      data: {
        transcriptionStatus: result.status,
        transcriptionLanguage: language,
      },
    })

    return res.status(202).json(
      new ApiResponse(202, 'Transcription generation started', {
        status: result.status,
        language: result.language,
        label: result.label,
      }),
    )
  } catch (error) {
    next(error)
  }
}

/**
 * GET /ai/transcription/status
 * Check transcription generation status
 */
export const getTranscriptionStatus = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const lesson = req.lesson!

    const videoId = getVideoIdFromLesson(lesson)
    if (!videoId) {
      return next(new ApiError(400, 'No video found for this lesson'))
    }

    const language = lesson.transcriptionLanguage || 'en'
    const status = await getCaptionStatus(videoId, language)

    if (!status) {
      return res.status(200).json(
        new ApiResponse(200, 'No transcription found', {
          status: null,
          hasTranscription: false,
        }),
      )
    }

    // Sync status with database if changed
    if (status.status !== lesson.transcriptionStatus) {
      await prisma.lesson.update({
        where: { id: lesson.id },
        data: { transcriptionStatus: status.status },
      })
    }

    return res.status(200).json(
      new ApiResponse(200, 'Transcription status fetched', {
        status: status.status,
        language: status.language,
        label: status.label,
        generated: status.generated,
        hasTranscription: status.status === 'ready',
      }),
    )
  } catch (error) {
    next(error)
  }
}

/**
 * GET /ai/transcription
 * Fetch the transcription text
 */
export const getTranscription = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const lesson = req.lesson!

    const videoId = getVideoIdFromLesson(lesson)
    if (!videoId) {
      return next(new ApiError(400, 'No video found for this lesson'))
    }

    // Check status first
    const language = lesson.transcriptionLanguage || 'en'
    const status = await getCaptionStatus(videoId, language)

    if (!status || status.status !== 'ready') {
      return next(
        new ApiError(
          422,
          `Transcription is not ready yet (status: ${status?.status || 'not_started'})`,
        ),
      )
    }

    const vttContent = await fetchTranscription(videoId, language)
    const plainText = vttToPlainText(vttContent)

    // Return format based on query param
    const format = req.query.format as string

    if (format === 'vtt') {
      res.setHeader('Content-Type', 'text/vtt')
      return res.send(vttContent)
    }

    return res.status(200).json(
      new ApiResponse(200, 'Transcription fetched', {
        text: plainText,
        vtt: vttContent,
        language,
      }),
    )
  } catch (error) {
    next(error)
  }
}

// ===== AI FEATURE ENDPOINTS =====

/**
 * POST /ai/summary
 * Generate AI summary of video content
 */
export const generateSummary = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const lesson = req.lesson!

    const videoId = getVideoIdFromLesson(lesson)
    if (!videoId) {
      return next(new ApiError(400, 'No video found for this lesson'))
    }

    const parsed = summarySchema.safeParse(req.body)
    if (!parsed.success) {
      return next(new ApiError(400, parsed.error.issues[0].message))
    }

    const { maxLength } = parsed.data

    // Get transcription
    const language = lesson.transcriptionLanguage || 'en'
    const transcription = await getTranscriptionText(videoId, language)

    if (!transcription || transcription.length < 50) {
      return next(new ApiError(422, 'Transcription not available or too short'))
    }

    // Generate summary with Gemini
    const gemini = getGeminiClient()
    const model = process.env.GEMINI_SIMPLE_MODEL || 'gemini-2.5-flash'

    const response = await gemini.models.generateContent({
      model,
      contents: `Please summarize the following video transcript:\n\n${transcription}`,
      config: {
        systemInstruction: `You are an educational content summarizer. Create a clear, concise summary of the video lesson content. The summary should:
- Highlight the main topics and key concepts
- Be structured with bullet points for easy reading
- Be approximately ${maxLength} characters
- Focus on actionable takeaways for learners`,
      },
    })

    const summary = response.text || ''
    if (!summary) {
      console.error(
        '[AI] Empty summary response. Full response object:',
        JSON.stringify(response, null, 2),
      )
      return next(new ApiError(500, 'AI returned empty response'))
    }

    return res.status(200).json(
      new ApiResponse(200, 'Summary generated', {
        summary,
        lessonId: lesson.id,
        lessonTitle: lesson.title,
      }),
    )
  } catch (error) {
    next(error)
  }
}

/**
 * POST /ai/generate-quiz
 * Generate quiz questions from a provided topic description
 */
export const generateQuiz = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const lesson = req.lesson!

    const parsed = generateQuizSchema.safeParse(req.body)
    if (!parsed.success) {
      return next(new ApiError(400, parsed.error.issues[0].message))
    }

    const { description, questionCount, questionTypes, difficulty } =
      parsed.data

    // Generate quiz with Gemini structured output
    const gemini = getGeminiClient()
    const model = process.env.GEMINI_STRUCTURED_MODEL || 'gemini-2.5-flash'

    const response = await gemini.models.generateContent({
      model,
      contents: `Create a ${difficulty} level quiz about:\n\n${description}`,
      config: {
        systemInstruction: `You are an educational quiz generator. Create quiz questions based on a topic description and difficulty level.

Rules:
- Generate exactly ${questionCount} questions
- Use only these question types: ${questionTypes.join(', ')}
- For MULTIPLE_CHOICE: provide exactly 4 options as full text answers (not letters like A, B, C, D)
- For TRUE_FALSE: options must be ["True", "False"] and correctAnswer must be either "True" or "False"
- For SHORT_ANSWER: options should be an empty array [], and correctAnswer is the expected answer text
- IMPORTANT: correctAnswer MUST be the exact text of one of the options (not a letter reference)
- Each option should be the complete answer text
- Return valid JSON only with no markdown fences or extra commentary`,
        responseMimeType: 'application/json',
        responseSchema: geminiQuizSchema,
      },
    })

    const responseContent = response.text || ''
    if (!responseContent) {
      console.error(
        '[AI] Empty quiz response. Full response object:',
        JSON.stringify(response, null, 2),
      )
      return next(new ApiError(500, 'AI returned empty response'))
    }

    let questions: z.infer<typeof aiQuizResponseSchema>['questions'] = []

    try {
      const parsedResponse = parseAiJson(responseContent, aiQuizResponseSchema)
      questions = parsedResponse.questions
    } catch (parseError) {
      console.error('[AI] Failed to parse quiz JSON:', parseError)
      console.error('[AI] Raw quiz content:', responseContent)
      return next(new ApiError(500, 'Failed to parse AI response'))
    }

    return res.status(200).json(
      new ApiResponse(200, 'Quiz questions generated', {
        questions,
        lessonId: lesson.id,
        lessonTitle: lesson.title,
        questionCount: questions.length,
      }),
    )
  } catch (error) {
    next(error)
  }
}

/**
 * POST /ai/chat
 * Chat with video content
 */
export const chatWithVideo = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const lesson = req.lesson!

    const videoId = getVideoIdFromLesson(lesson)
    if (!videoId) {
      return next(new ApiError(400, 'No video found for this lesson'))
    }

    const parsed = chatSchema.safeParse(req.body)
    if (!parsed.success) {
      return next(new ApiError(400, parsed.error.issues[0].message))
    }

    const { message, history } = parsed.data

    // Get transcription
    const language = lesson.transcriptionLanguage || 'en'
    const transcription = await getTranscriptionText(videoId, language)

    if (!transcription || transcription.length < 50) {
      return next(new ApiError(422, 'Transcription not available for chat'))
    }

    // Build conversation input for Gemini
    const gemini = getGeminiClient()
    const model = process.env.GEMINI_SIMPLE_MODEL || 'gemini-2.5-flash'

    const instructions = `You are a helpful teaching assistant for a video lesson titled "${lesson.title}".
Your role is to help students understand the content by:
- Answering questions about the video content
- Clarifying concepts explained in the video
- Providing examples related to the topics
- Suggesting related topics to explore

Here is the transcript of the video lesson you are helping with:
---
${transcription}
---

Only answer questions related to the content above. If asked about unrelated topics, politely redirect to the lesson content.`

    // Map history to Gemini format (role 'assistant' becomes 'model')
    const contents = [
      ...history.map((h) => ({
        role: h.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: h.content }],
      })),
      {
        role: 'user' as const,
        parts: [{ text: message }],
      },
    ]

    const aiResponse = await gemini.models.generateContent({
      model,
      contents,
      config: {
        systemInstruction: instructions,
      },
    })

    const responseText = aiResponse.text || ''
    if (!responseText) {
      console.error(
        '[AI] Empty chat response. Full response object:',
        JSON.stringify(aiResponse, null, 2),
      )
      return next(new ApiError(500, 'AI returned empty response'))
    }

    return res.status(200).json(
      new ApiResponse(200, 'Chat response generated', {
        response: responseText,
        lessonId: lesson.id,
      }),
    )
  } catch (error) {
    next(error)
  }
}

// ===== COURSE-LEVEL AI ENDPOINTS =====

/**
 * POST /ai/generate-outline
 * Generate course outline with modules and lessons based on description
 * Uses the Gemini API with strict JSON schema enforcement
 */
export const generateCourseOutline = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const parsed = courseOutlineSchema.safeParse(req.body)
    if (!parsed.success) {
      return next(new ApiError(400, parsed.error.issues[0].message))
    }

    const {
      description,
      targetAudience,
      difficulty,
      moduleCount,
      lessonsPerModule,
    } = parsed.data

    const gemini = getGeminiClient()
    const model = process.env.GEMINI_STRUCTURED_MODEL || 'gemini-2.5-flash'

    const audienceContext = targetAudience
      ? `Target audience: ${targetAudience}.`
      : ''

    const instructions = `You are an expert course curriculum designer. Create detailed, well-structured course outlines for online learning platforms.

Guidelines:
- Create exactly ${moduleCount} modules
- Each module should have exactly ${lessonsPerModule} lessons
- Lessons should build progressively from basic to advanced concepts
- The difficulty level is: ${difficulty}
- Include practical exercises and real-world applications
- Lesson titles should be specific and actionable
- Module titles should clearly communicate the topic area
- Always set isFree to false for every generated lesson
- Return valid JSON only with no markdown fences or extra commentary`

    const userInput = `Create a comprehensive course outline for the following:

Course idea: ${description}
${audienceContext}

Make it practical, engaging, and industry-relevant.`

    // Use Gemini structured output
    const response = await gemini.models.generateContent({
      model,
      contents: userInput,
      config: {
        systemInstruction: instructions,
        responseMimeType: 'application/json',
        responseSchema: geminiCourseOutlineSchema,
      },
    })

    const responseContent = response.text || ''

    if (!responseContent) {
      console.error(
        '[AI] Empty response. Full response object:',
        JSON.stringify(response, null, 2),
      )
      return next(new ApiError(500, 'AI returned empty response'))
    }

    let courseOutline: z.infer<typeof aiCourseOutlineResponseSchema>

    try {
      courseOutline = parseAiJson(
        responseContent,
        aiCourseOutlineResponseSchema,
      )
    } catch (parseError) {
      console.error('[AI] Failed to parse JSON:', parseError)
      console.error('[AI] Raw content:', responseContent)
      return res.status(200).json(
        new ApiResponse(200, 'Course outline generated (raw)', {
          rawResponse: responseContent,
          parseError: 'Failed to parse as JSON',
        }),
      )
    }

    const normalizedOutline = {
      ...courseOutline,
      modules: Array.isArray(courseOutline.modules)
        ? courseOutline.modules.map((module: any) => ({
            ...module,
            lessons: Array.isArray(module.lessons)
              ? module.lessons.map((lesson: any) => ({
                  ...lesson,
                  isFree: false,
                }))
              : [],
          }))
        : [],
    }

    return res.status(200).json(
      new ApiResponse(200, 'Course outline generated', {
        outline: normalizedOutline,
      }),
    )
  } catch (error) {
    next(error)
  }
}
