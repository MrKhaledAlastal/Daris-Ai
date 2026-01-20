/**
 * AI Response Builder
 * Generates structured responses based on branch and content
 */

import { BranchId } from '@/constants/branches';
import { AIResponse, AIResponseSection, BRANCH_TEMPLATES } from '@/types/ai-response';

export class AIResponseBuilder {
  private sections: AIResponseSection[] = [];
  private branchId: BranchId;
  private subject: string;
  private bookId?: string;
  private bookName?: string;
  private specialization?: string;
  private language: 'ar' | 'en' = 'ar';

  constructor(
    branchId: BranchId,
    subject: string,
    options?: {
      bookId?: string;
      bookName?: string;
      specialization?: string;
      language?: 'ar' | 'en';
    }
  ) {
    this.branchId = branchId;
    this.subject = subject;
    this.bookId = options?.bookId;
    this.bookName = options?.bookName;
    this.specialization = options?.specialization;
    this.language = options?.language || 'ar';
  }

  // ============================================================
  // Section Builders
  // ============================================================

  addLessonTitle(title: string, subtitle?: string): this {
    this.sections.push({
      type: 'lesson_title',
      title,
      subtitle,
      content: title
    });
    return this;
  }

  addSimplifiedExplanation(content: string, keyPoints?: string[]): this {
    this.sections.push({
      type: 'simplified_explanation',
      content,
      keyPoints
    });
    return this;
  }

  addExample(content: string, options?: { title?: string; isContextual?: boolean; isPractical?: boolean }): this {
    this.sections.push({
      type: 'example',
      content,
      title: options?.title,
      isContextual: options?.isContextual,
      isPractical: options?.isPractical
    });
    return this;
  }

  addThinkingQuestion(question: string, hint?: string, difficulty?: 'easy' | 'medium' | 'hard'): this {
    this.sections.push({
      type: 'thinking_question',
      question,
      hint,
      difficulty,
      content: question
    });
    return this;
  }

  // Scientific Branch Methods
  addDefinition(term: string, definition: string, category?: string): this {
    if (this.branchId !== 'scientific') {
      console.warn('Definition section is primarily for scientific branch');
    }
    this.sections.push({
      type: 'definition',
      term,
      definition,
      category,
      content: definition
    });
    return this;
  }

  addFormula(
    formula: string,
    variables: Array<{ symbol: string; name: string; unit?: string }>,
    conditions?: string[]
  ): this {
    if (this.branchId !== 'scientific' && this.branchId !== 'industrial') {
      console.warn('Formula section is primarily for scientific/industrial branches');
    }
    this.sections.push({
      type: 'formula',
      formula,
      variables,
      conditions,
      content: formula
    });
    return this;
  }

  addSolvedExample(
    question: string,
    steps: string[],
    result: string,
    options?: { givens?: string[]; notes?: string[] }
  ): this {
    this.sections.push({
      type: 'solved_example',
      question,
      steps,
      result,
      givens: options?.givens,
      notes: options?.notes,
      content: question
    });
    return this;
  }

  addImportantNote(content: string, level: 'info' | 'warning' | 'critical' = 'info'): this {
    this.sections.push({
      type: 'important_note',
      content,
      level
    });
    return this;
  }

  // Literary Branch Methods
  addMainIdea(idea: string, context?: string): this {
    if (this.branchId !== 'literary') {
      console.warn('Main idea section is primarily for literary branch');
    }
    this.sections.push({
      type: 'main_idea',
      idea,
      context,
      content: idea
    });
    return this;
  }

  addDetailedExplanation(
    content: string,
    subsections?: Array<{ heading: string; content: string }>
  ): this {
    this.sections.push({
      type: 'detailed_explanation',
      content,
      subsections
    });
    return this;
  }

  addKeyPoints(points: string[], category?: string): this {
    this.sections.push({
      type: 'key_points',
      points,
      category,
      content: points
    });
    return this;
  }

  addAnalyticalQuestion(question: string, guidePoints?: string[]): this {
    this.sections.push({
      type: 'analytical_question',
      question,
      guidePoints,
      content: question
    });
    return this;
  }

  // Industrial Branch Methods
  addLessonObjective(objective: string, learningOutcomes?: string[]): this {
    if (this.branchId !== 'industrial') {
      console.warn('Lesson objective section is primarily for industrial branch');
    }
    this.sections.push({
      type: 'lesson_objective',
      objective,
      learningOutcomes,
      content: objective
    });
    return this;
  }

  addToolsComponents(
    tools: Array<{ name: string; description?: string; quantity?: string }>,
    components?: Array<{ name: string; specification?: string }>
  ): this {
    this.sections.push({
      type: 'tools_components',
      tools,
      components,
      content: tools.map(t => t.name).join(', ')
    });
    return this;
  }

  addProcedure(
    steps: Array<{
      number: number;
      description: string;
      image?: string;
      warning?: string;
    }>
  ): this {
    this.sections.push({
      type: 'procedure',
      steps,
      content: steps.map(s => s.description)
    });
    return this;
  }

  addSafetyWarnings(warnings: string[], level: 'low' | 'medium' | 'high' | 'critical' = 'medium'): this {
    this.sections.push({
      type: 'safety_warnings',
      warnings,
      level,
      content: warnings
    });
    return this;
  }

  addCommonMistakes(
    mistakes: Array<{
      mistake: string;
      correction: string;
      reason?: string;
    }>
  ): this {
    this.sections.push({
      type: 'common_mistakes',
      mistakes,
      content: mistakes.map(m => m.mistake)
    });
    return this;
  }

  // Entrepreneurship Branch Methods
  addConceptExplanation(concept: string, explanation: string, relatedConcepts?: string[]): this {
    if (this.branchId !== 'entrepreneurship') {
      console.warn('Concept explanation section is primarily for entrepreneurship branch');
    }
    this.sections.push({
      type: 'concept_explanation',
      concept,
      explanation,
      relatedConcepts,
      content: explanation
    });
    return this;
  }

  addBusinessExample(
    title: string,
    scenario: string,
    options?: { outcome?: string; lessons?: string[] }
  ): this {
    this.sections.push({
      type: 'business_example',
      title,
      scenario,
      outcome: options?.outcome,
      lessons: options?.lessons,
      content: scenario
    });
    return this;
  }

  addPracticalScenario(scenario: string, context: string, questions?: string[]): this {
    this.sections.push({
      type: 'practical_scenario',
      scenario,
      context,
      questions,
      content: scenario
    });
    return this;
  }

  addDecisionQuestion(
    situation: string,
    options: string[],
    considerationPoints?: string[]
  ): this {
    this.sections.push({
      type: 'decision_question',
      situation,
      options,
      considerationPoints,
      content: situation
    });
    return this;
  }

  // ============================================================
  // Build Methods
  // ============================================================

  private sortSections(): AIResponseSection[] {
    const template = BRANCH_TEMPLATES[this.branchId];
    const order: AIResponseSection['type'][] = 'sectionOrder' in template && Array.isArray(template.sectionOrder)
      ? template.sectionOrder
      : [];

    return this.sections.sort((a, b) => {
      const indexA = order.indexOf(a.type);
      const indexB = order.indexOf(b.type);

      // If not in order list, put at end
      if (indexA === -1) return 1;
      if (indexB === -1) return -1;

      return indexA - indexB;
    });
  }

  build(sources?: Array<{ type: 'book' | 'web'; name: string; url?: string }>): AIResponse {
    // Sort sections according to branch template
    const sortedSections = this.sortSections();

    return {
      id: `response-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      branchId: this.branchId,
      subject: this.subject,
      bookId: this.bookId,
      bookName: this.bookName,
      specialization: this.specialization,
      sections: sortedSections,
      metadata: {
        timestamp: new Date().toISOString(),
        language: this.language,
        sources
      }
    };
  }

  // Helper method to validate required sections
  validate(): { valid: boolean; missing: string[] } {
    const template = BRANCH_TEMPLATES[this.branchId];
    const existingTypes = this.sections.map(s => s.type);
    const missing = 'sectionOrder' in template && Array.isArray(template.sectionOrder)
      ? template.sectionOrder.filter((required: AIResponseSection['type']) => !existingTypes.includes(required))
      : [];

    return {
      valid: missing.length === 0,
      missing
    };
  }

  buildDynamicPrompt(): string {
    const template = BRANCH_TEMPLATES[this.branchId];
    let prompt = template.template;

    // Replace variables in the template with actual values
    for (const [key, value] of Object.entries(template.variables)) {
      prompt = prompt.replace(`{{${key}}}`, value);
    }

    return prompt;
  }
}


