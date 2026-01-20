"use client";

import katex from "katex";
import "katex/dist/katex.min.css";

export type FormulaMetaItem = {
    label: string;
    symbol?: string;
};

type ParsedFormula = {
    formulaText: string;
    formulaHtml: string | null;
    metaItems: FormulaMetaItem[];
};

const EQUATION_HINT_REGEX =
    /[=≠≈≡≤≥∑∏√πθΩσµλϕφ∞±×÷^_{}]|\\|frac|sqrt|Phi|sin|cos|tan|log|ln|·/i;
const META_IGNORE_REGEX =
    /^(?:box\/?|\/?box|الرموز|رموز|symbols?)[:\-]?\s*$/i;
const SYMBOL_REGEX = /^[A-Za-zΑ-Ωα-ω\u0370-\u03FF\u2100-\u214F0-9]{1,5}$/;
const BULLET_REGEX = /^[-*•–—\u2022]+\s*/;

export function parseFormulaContent(raw: string): ParsedFormula {
    const sections = raw.split("|");
    const firstSection = sections.shift() ?? "";
    const extraSections = sections;

    const firstLines = splitLines(firstSection);
    const extraLines = extraSections.flatMap(splitLines);

    const equationIndex = findEquationIndex(firstLines);
    const formulaLine =
        equationIndex >= 0 ? firstLines[equationIndex] : firstLines[0] ?? "";

    const secondaryLines = firstLines
        .filter((_, idx) => idx !== equationIndex)
        .filter((line) => !META_IGNORE_REGEX.test(line));

    const metaCandidates = [...extraLines, ...secondaryLines];
    const metaItems = buildMetaItems(metaCandidates);

    return {
        formulaText: formulaLine,
        formulaHtml: buildKatexHTML(formulaLine),
        metaItems,
    };
}

function splitLines(text: string): string[] {
    return text
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);
}

function findEquationIndex(lines: string[]): number {
    return lines.findIndex((line) => looksLikeEquation(line));
}

function looksLikeEquation(line: string): boolean {
    if (!line) return false;
    if (META_IGNORE_REGEX.test(line)) return false;
    const cleaned = line.replace(/\s+/g, "");
    if (cleaned.length < 3) return false;
    if (/[\u0600-\u06FF]/.test(line) && !/[=+\-*/^]/.test(line)) {
        return false;
    }
    return EQUATION_HINT_REGEX.test(line);
}

function buildMetaItems(lines: string[]): FormulaMetaItem[] {
    const seen = new Set<string>();
    const items: FormulaMetaItem[] = [];

    const pushItem = (label?: string, symbol?: string) => {
        const finalLabel = (label || symbol || "").trim();
        if (!finalLabel) return;
        const key = `${finalLabel.toLowerCase()}-${symbol ?? ""}`;
        if (seen.has(key)) return;
        seen.add(key);
        items.push({ label: finalLabel, symbol: symbol?.trim() || undefined });
    };

    lines.forEach((line) => {
        if (!line || META_IGNORE_REGEX.test(line)) return;
        const cleaned = line
            .replace(BULLET_REGEX, "")
            .replace(/\s{2,}/g, " ")
            .trim();
        if (!cleaned) return;

        const colonMatch = cleaned.match(/^(.+?)(?:\s*(?:[:=]|–|—|-)\s*)(.+)$/);
        if (colonMatch) {
            const [, leftRaw, rightRaw] = colonMatch;
            const left = leftRaw.trim();
            const right = rightRaw.trim();
            if (looksLikeSymbol(left) && right) {
                pushItem(right, left);
                return;
            }
            if (looksLikeSymbol(right) && left) {
                pushItem(left, right);
                return;
            }
        }

        const tailMatch = cleaned.match(
            /^(.+?)\s+([A-Za-zΑ-Ωα-ω\u0370-\u03FF\u2100-\u214F0-9]{1,5})$/
        );
        if (tailMatch) {
            const [, label, symbol] = tailMatch;
            if (looksLikeSymbol(symbol)) {
                pushItem(label.trim(), symbol.trim());
                return;
            }
        }

        if (looksLikeSymbol(cleaned)) {
            pushItem(cleaned);
            return;
        }

        pushItem(cleaned);
    });

    return items;
}

function looksLikeSymbol(value: string): boolean {
    return SYMBOL_REGEX.test(value);
}

function buildKatexHTML(line: string): string | null {
    const trimmed = line.trim();
    if (!trimmed || /[\u0600-\u06FF]/.test(trimmed)) {
        return null;
    }
    const stripped = trimmed.replace(/^\$\$?/, "").replace(/\$\$?$/, "");
    if (!EQUATION_HINT_REGEX.test(stripped)) {
        return null;
    }
    try {
        return katex.renderToString(stripped, {
            displayMode: true,
            throwOnError: false,
            strict: "warn",
            trust: true,
            output: "html",
            macros: {
                "\\*": "\\times ",
            },
        });
    } catch {
        return null;
    }
}
