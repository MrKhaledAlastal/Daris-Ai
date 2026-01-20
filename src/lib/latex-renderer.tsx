"use client";

import React from "react";
import katex from "katex";
import "katex/dist/katex.min.css";
import { cn } from "@/lib/utils";

type Segment =
    | { type: "text"; content: string }
    | { type: "math"; content: string; display: boolean };

export type LatexRendererProps = {
    content?: string | null;
    as?: React.ElementType;
    className?: string;
    inlineClassName?: string;
    blockClassName?: string;
    dir?: "ltr" | "rtl";
};

export function LatexRenderer({
    content,
    as: Component = "div",
    className,
    inlineClassName = "inline-flex items-center gap-1 align-middle",
    blockClassName = "block my-2 text-center",
    dir,
}: LatexRendererProps) {
    const text = content ?? "";
    if (!text.trim()) return null;

    const segments = React.useMemo(() => parseLatexSegments(text), [text]);

    return (
        <Component className={className} dir={dir}>
            {segments.map((segment, idx) => {
                if (segment.type === "text") {
                    return <React.Fragment key={idx}>{segment.content}</React.Fragment>;
                }

                const rendered = renderMath(segment.content, segment.display);
                const spanClass = segment.display
                    ? cn("block my-2 text-center", blockClassName)
                    : cn("inline-flex items-center gap-1 align-middle", inlineClassName);

                return (
                    <span
                        key={idx}
                        className={spanClass}
                        dangerouslySetInnerHTML={{ __html: rendered }}
                    />
                );
            })}
        </Component>
    );
}

function parseLatexSegments(text: string): Segment[] {
    const segments: Segment[] = [];
    let buffer = "";

    const pushText = () => {
        if (buffer) {
            segments.push({ type: "text", content: buffer });
            buffer = "";
        }
    };

    let i = 0;
    while (i < text.length) {
        const char = text[i];
        const next = text[i + 1];

        if (char === "\\" && next === "$") {
            buffer += "$";
            i += 2;
            continue;
        }

        if (char === "$") {
            const isDisplay = next === "$";
            const delimiter = isDisplay ? "$$" : "$";
            const closingIndex = findClosingDelimiter(text, delimiter, i + delimiter.length);

            if (closingIndex === -1) {
                buffer += delimiter;
                i += delimiter.length;
                continue;
            }

            pushText();
            const mathContent = text
                .slice(i + delimiter.length, closingIndex)
                .trim();
            segments.push({ type: "math", content: mathContent, display: isDisplay });
            i = closingIndex + delimiter.length;
            continue;
        }

        buffer += char;
        i += 1;
    }

    if (buffer) {
        segments.push({ type: "text", content: buffer });
    }

    return segments;
}

function findClosingDelimiter(
    text: string,
    delimiter: string,
    startIndex: number
): number {
    let i = startIndex;
    while (i < text.length) {
        if (text[i] === "\\" && i + 1 < text.length) {
            i += 2;
            continue;
        }
        if (text.startsWith(delimiter, i)) {
            return i;
        }
        i += 1;
    }
    return -1;
}

function renderMath(content: string, displayMode: boolean): string {
    try {
        return katex.renderToString(content, {
            displayMode,
            throwOnError: false,
            strict: "warn",
            trust: true,
            output: "html",
        });
    } catch {
        return content;
    }
}
