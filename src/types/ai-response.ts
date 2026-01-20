/**
 * AI Response System - Type Definitions
 * Dynamic response structure for Palestinian Tawjihi educational platform
 */

import { BranchId } from '@/constants/branches';

// ============================================================
// Base Section Types
// ============================================================

export interface BaseSection {
  type: string;
  title?: string;
  content: string | string[];
  metadata?: Record<string, any>;
}

// ============================================================
// Common Sections (All Branches)
// ============================================================

export interface LessonTitleSection extends BaseSection {
  type: 'lesson_title';
  title: string;
  subtitle?: string;
}

export interface SimplifiedExplanationSection extends BaseSection {
  type: 'simplified_explanation';
  content: string;
  keyPoints?: string[];
}

export interface ExampleSection extends BaseSection {
  type: 'example';
  title?: string;
  content: string;
  isContextual?: boolean;
  isPractical?: boolean;
}

export interface ThinkingQuestionSection extends BaseSection {
  type: 'thinking_question';
  question: string;
  hint?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
}

// ============================================================
// Scientific Branch Sections
// ============================================================

export interface DefinitionSection extends BaseSection {
  type: 'definition';
  term: string;
  definition: string;
  category?: string;
}

export interface FormulaSection extends BaseSection {
  type: 'formula';
  formula: string;
  variables: Array<{
    symbol: string;
    name: string;
    unit?: string;
  }>;
  conditions?: string[];
}

export interface SolvedExampleSection extends BaseSection {
  type: 'solved_example';
  question: string;
  givens?: string[];
  steps: string[];
  result: string;
  notes?: string[];
}

export interface ImportantNoteSection extends BaseSection {
  type: 'important_note';
  content: string;
  level?: 'info' | 'warning' | 'critical';
}

// ============================================================
// Literary Branch Sections
// ============================================================

export interface MainIdeaSection extends BaseSection {
  type: 'main_idea';
  idea: string;
  context?: string;
}

export interface DetailedExplanationSection extends BaseSection {
  type: 'detailed_explanation';
  content: string;
  subsections?: Array<{
    heading: string;
    content: string;
  }>;
}

export interface KeyPointsSection extends BaseSection {
  type: 'key_points';
  points: string[];
  category?: string;
}

export interface AnalyticalQuestionSection extends BaseSection {
  type: 'analytical_question';
  question: string;
  guidePoints?: string[];
}

// ============================================================
// Industrial Branch Sections
// ============================================================

export interface LessonObjectiveSection extends BaseSection {
  type: 'lesson_objective';
  objective: string;
  learningOutcomes?: string[];
}

export interface ToolsComponentsSection extends BaseSection {
  type: 'tools_components';
  tools: Array<{
    name: string;
    description?: string;
    quantity?: string;
  }>;
  components?: Array<{
    name: string;
    specification?: string;
  }>;
}

export interface ProcedureSection extends BaseSection {
  type: 'procedure';
  steps: Array<{
    number: number;
    description: string;
    image?: string;
    warning?: string;
  }>;
}

export interface SafetyWarningsSection extends BaseSection {
  type: 'safety_warnings';
  warnings: string[];
  level: 'low' | 'medium' | 'high' | 'critical';
}

export interface CommonMistakesSection extends BaseSection {
  type: 'common_mistakes';
  mistakes: Array<{
    mistake: string;
    correction: string;
    reason?: string;
  }>;
}

// ============================================================
// Entrepreneurship Branch Sections
// ============================================================

export interface ConceptExplanationSection extends BaseSection {
  type: 'concept_explanation';
  concept: string;
  explanation: string;
  relatedConcepts?: string[];
}

export interface BusinessExampleSection extends BaseSection {
  type: 'business_example';
  title: string;
  scenario: string;
  outcome?: string;
  lessons?: string[];
}

export interface PracticalScenarioSection extends BaseSection {
  type: 'practical_scenario';
  scenario: string;
  context: string;
  questions?: string[];
}

export interface DecisionQuestionSection extends BaseSection {
  type: 'decision_question';
  situation: string;
  options: string[];
  considerationPoints?: string[];
}

// ============================================================
// Union Type for All Sections
// ============================================================

export type AIResponseSection =
  // Common
  | LessonTitleSection
  | SimplifiedExplanationSection
  | ExampleSection
  | ThinkingQuestionSection
  // Scientific
  | DefinitionSection
  | FormulaSection
  | SolvedExampleSection
  | ImportantNoteSection
  // Literary
  | MainIdeaSection
  | DetailedExplanationSection
  | KeyPointsSection
  | AnalyticalQuestionSection
  // Industrial
  | LessonObjectiveSection
  | ToolsComponentsSection
  | ProcedureSection
  | SafetyWarningsSection
  | CommonMistakesSection
  // Entrepreneurship
  | ConceptExplanationSection
  | BusinessExampleSection
  | PracticalScenarioSection
  | DecisionQuestionSection;

// ============================================================
// Complete AI Response Structure
// ============================================================

export interface AIResponse {
  id: string;
  branchId: BranchId;
  subject: string;
  bookId?: string;
  bookName?: string;
  specialization?: string;
  sections: AIResponseSection[];
  metadata: {
    timestamp: string;
    language: 'ar' | 'en';
    confidence?: number;
    sources?: Array<{
      type: 'book' | 'web';
      name: string;
      url?: string;
    }>;
  };
}

// ============================================================
// Branch Template Configuration
// ============================================================

export interface BranchTemplate {
  branchId: BranchId;
  requiredSections: string[];
  optionalSections: string[];
  sectionOrder: string[];
}

export interface DynamicResponseSchema {
  branchId: BranchId;
  template: string;
  variables: Record<string, any>;
}

export const BRANCH_TEMPLATES: Record<BranchId, DynamicResponseSchema> = {
  scientific: {
    branchId: 'scientific',
    template: 'Scientific template with variables: {{var1}}, {{var2}}',
    variables: {
      var1: 'Example1',
      var2: 'Example2',
    },
  },
  literary: {
    branchId: 'literary',
    template: 'Literary template with variables: {{var1}}, {{var2}}',
    variables: {
      var1: 'Example1',
      var2: 'Example2',
    },
  },
  industrial: {
    branchId: 'industrial',
    template: 'Industrial template with variables: {{var1}}, {{var2}}',
    variables: {
      var1: 'Example1',
      var2: 'Example2',
    },
  },
  entrepreneurship: {
    branchId: 'entrepreneurship',
    template: 'Entrepreneurship template with variables: {{var1}}, {{var2}}',
    variables: {
      var1: 'Example1',
      var2: 'Example2',
    },
  },
};


