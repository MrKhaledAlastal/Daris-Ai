'use client';

import '@/ai/genkit';
import {config} from 'dotenv';
config();

import '@/ai/flows/generate-practice-questions.ts';
import '@/ai/flows/summarize-textbook-content.ts';
import '@/ai/flows/answer-study-questions.ts';
