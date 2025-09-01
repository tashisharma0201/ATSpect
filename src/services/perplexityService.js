// ==============================================================================
// Perplexity Service for Resume Analysis
// ==============================================================================

// --- CONFIGURATION ---

// IMPORTANT: Hardcoding keys is insecure. Use environment variables in production.
// const PERPLEXITY_API_KEY = process.env.REACT_APP_PERPLEXITY_API_KEY;
const PERPLEXITY_API_KEY = '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';

const PERPLEXITY_API_URL = 'https://api.perplexity.ai/chat/completions';
const API_TIMEOUT = 60000; // 60 seconds
const MAX_RETRIES = 2;

/**
 * Analyzes resume text against a job description using the Perplexity API.
 * @param {string} resumeText - The full text of the user's resume.
 * @param {string} jobTitle - The job title for the position.
 * @param {string} jobDescription - The job description for the position.
 * @param {string} companyName - The name of the company.
 * @returns {Promise<object>} A promise that resolves to the JSON analysis object from the API.
 */
export async function analyzeResumeWithPerplexity(resumeText, jobTitle, jobDescription, companyName, resumeMode = 'soft') {
  // Mode-dependent instruction strings
 const modeInstruction = resumeMode === 'soft'
  ? `Note: This resume is intended for recruiter viewing (PDF/digital format). 
- Icons, clickable symbols, and links should NOT be flagged as "non-standard symbols" unless they genuinely obscure or confuse information for human readers.
- Standard bullet points, such as "-", "•" or "*", MUST NOT be flagged as non-standard symbols in this mode. If they are present and used consistently, explicitly state: "Bullet points are used appropriately for clarity."
- If section headings are visually distinct, call this out as a strength.
- If links or icons improve scanning/clicking/navigating the resume, note this as a positive feature for recruiters.
- Only highlight formatting issues that genuinely reduce visual appeal, structure, or usability for a recruiter; do not apply ATS-only rules to this mode.`

  : `Note: This resume is intended for ATS upload and parsing (hard copy). 
- The resume should be plain text only: no icons, emojis, special symbols, images, graphical bullets, tables, columns, or sidebars.
- List every unique symbol, bullet, or unusual formatting detected in the 'formatting_audit' section.
- Only flag and penalize those symbols that are NOT plain "-", "*", "•", or standard ASCII punctuation (e.g. ! ? . , : ;).
- For ANY flagged symbol or formatting issue, explain which part of the resume is affected and exactly why ATS parsing would fail or mis-associate data.
- Check for and penalize: images (including profile photos), text in tables/columns/sidebars, or any section where content is not in plain list form.
- Set 'contains_tables_or_columns' in the audit to true/false and document what you found if true.
- Praise single-column, left-aligned formatting, standard bullet points and section headings, and use of text labels for contact info.
- If all symbols are ATS-compatible, clearly state: "All symbols and bullet points are ATS-compatible."
- If resume is formatted for maximum ATS compatibility, clearly state: "Resume formatted for maximum ATS compatibility."
- Do not warn or penalize unless a definite, document-specific ATS risk is found.
- Your formatting_audit and tips should empower the user to fix only what actually blocks ATS parsing, not simply suggest generic improvements.`;


  const prompt = `
${modeInstruction}

Analyze this resume for the position of "${jobTitle}" at "${companyName}" and provide detailed feedback.

Job Description: ${jobDescription}

Resume Content: ${resumeText}

Please provide a comprehensive analysis in the following JSON format ONLY. Do not include any text, markdown, or code fences before or after the JSON object:
{
  "overall_score": <number between 0 and 100>,
  "ats_score": <number between 0 and 100>,
  "score_interpretation": {
    "90-100": "Exceptional - Top 5% of candidates",
    "80-89": "Very Strong - Likely to pass initial screening",
    "70-79": "Good - Competitive but needs improvement",
    "60-69": "Average - Significant improvements needed",
    "50-59": "Below Average - Major revisions required",
    "0-49": "Poor - Complete overhaul necessary"
  },
  "categories": {
    "formatting": {
      "score": <number between 0 and 100>,
      "weight": 15,
      "description": "Visual appeal, consistency, readability, and professional layout",
      "tips": [
        {"tip": "<string>", "explanation": "<string>", "priority": "<high/medium/low>"}
      ],
   "formatting_audit": {
  "non_standard_symbols_or_icons_present": <true/false>,
  "symbols_and_bullets_found": ["<list every unique symbol, bullet, or icon actually present>"],
  "problematic_symbols": ["<list only those symbols/bullets that would break ATS, with line/section or NA if none>"],
  "contains_tables_or_columns": <true/false>,
  "remarks_about_symbols": "<If none detected, say 'No non-standard symbols or icons detected.' If all found are ATS-compatible, explicitly state: 'All symbols and bullet points are ATS-compatible.'>",
  "section_headings": "<E.g., 'Section headings are standardized and clear.' or details on any issues>",
  "bullet_points": "<E.g., 'Simple '-' or '*' bullets used consistently.' or details on problems/inconsistency>"
}

    },
    "content": {
      "score": <number between 0 and 100>,
      "weight": 30,
      "description": "Quality of experience descriptions, achievements, and overall narrative",
      "tips": [
        {"tip": "<string>", "explanation": "<string>", "priority": "<high/medium/low>"}
      ]
    },
    "keywords": {
      "score": <number between 0 and 100>,
      "weight": 25,
      "description": "Alignment with job requirements and industry terminology",
      "missing_keywords": ["<keyword1>", "<keyword2>"],
      "matched_keywords": ["<keyword1>", "<keyword2>"],
      "tips": [
        {"tip": "<string>", "explanation": "<string>", "priority": "<high/medium/low>"}
      ]
    },
    "experience": {
      "score": <number between 0 and 100>,
      "weight": 20,
      "description": "Relevance, progression, and quantified achievements",
      "tips": [
        {"tip": "<string>", "explanation": "<string>", "priority": "<high/medium/low>"}
      ]
    },
    "skills": {
      "score": <number between 0 and 100>,
      "weight": 10,
      "description": "Technical and soft skills alignment with role requirements",
      "tips": [
        {"tip": "<string>", "explanation": "<string>", "priority": "<high/medium/low>"}
      ]
    }
  },
  "detailed_analysis": {
    "strengths": [
      "<specific strength with example>"
    ],
    "critical_gaps": [
      "<gap that significantly impacts candidacy>"
    ],
    "ats_compatibility": {
      "parsing_issues": ["<issue1>", "<issue2>"],
      "format_recommendations": ["<recommendation1>", "<recommendation2>"]
    }
  },
  "improvement_roadmap": {
    "immediate_fixes": [
      {"action": "<string>", "impact": "<high/medium/low>", "effort": "<high/medium/low>"}
    ],
    "strategic_enhancements": [
      {"action": "<string>", "impact": "<high/medium/low>", "effort": "<high/medium/low>"}
    ],
    "long_term_goals": [
      {"action": "<string>", "impact": "<high/medium/low>", "effort": "<high/medium/low>"}
    ]
  },
  "competitive_analysis": {
    "market_position": "<where this resume stands against typical candidates>",
    "differentiation_opportunities": ["<opportunity1>", "<opportunity2>"],
    "industry_benchmarks": "<how resume compares to industry standards>"
  },
  "suggestions": [
    {
      "category": "<formatting/content/keywords/experience/skills>",
      "tip": "<specific actionable advice>",
      "explanation": "<why this matters and how it helps>",
      "priority": "<high/medium/low>",
      "estimated_impact": "<how much this could improve overall score>"
    }
  ]
}

Scoring Guidelines:
- 90-100: Exceptional resume that stands out significantly, minimal improvements needed
- 80-89: Very strong resume likely to pass initial screening, minor optimizations possible
- 70-79: Good resume that's competitive but has clear improvement opportunities
- 60-69: Average resume requiring significant enhancements to be competitive
- 50-59: Below average resume needing major revisions across multiple areas
- 0-49: Poor resume requiring complete overhaul of structure and content

Focus on:
1. ATS optimization and keyword density analysis
2. Quantified achievements and impact metrics
3. Job-specific skill alignment and gaps
4. Professional formatting and readability
5. Content relevance and career progression narrative
6. Industry-specific best practices and expectations

Provide specific, actionable feedback with clear priorities and expected impact.
Consider both technical requirements and human reviewer appeal.
Analyze against current market standards and hiring trends.
  `;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`Perplexity API attempt ${attempt}/${MAX_RETRIES}`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

      const response = await fetch(PERPLEXITY_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          // Using your original model choice
          model: 'sonar-pro',
          messages: [
            {
              role: 'system',
              content: 'You are an expert resume reviewer. Your task is to analyze the provided resume and job description and respond ONLY with a valid JSON object in the specified format. Do not include any extra text or explanations.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 4096,
          temperature: 0.2,
          stream: false
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Perplexity API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;

      if (!content) {
        throw new Error('No content received from Perplexity API');
      }

      const cleanContent = content.trim().replace(/^```json\s*|```\s*$/g, '');
      const analysisResult = JSON.parse(cleanContent);
      
      if (!analysisResult.overall_score || !analysisResult.categories) {
        throw new Error('Invalid response structure from Perplexity API');
      }

      console.log('Perplexity API success on attempt', attempt);
      return analysisResult;

    } catch (error) {
      console.error(`Perplexity API attempt ${attempt} failed:`, error);
      
      if (attempt === MAX_RETRIES || error.name === 'AbortError') {
        console.error('API analysis failed after all retries.');
        throw error;
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
}