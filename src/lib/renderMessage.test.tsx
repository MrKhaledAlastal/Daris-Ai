import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { renderMessage } from "./renderMessage";

function normalize(html: string) {
  return html.replace(/\s+/g, " ").trim();
}

function extractTextOrder(html: string) {
  const textContent = html
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return textContent;
}

export function selfTestRenderMessageOrder() {
  const sample =
    "مقدمة قبل الكرت\n[concept]العنوان:هذا هو الكرت[/concept]\nنص بعد الكرت";

  const element = renderMessage(sample);
  const html = renderToStaticMarkup(element as React.ReactElement);
  const text = extractTextOrder(html);

  const beforeIndex = text.indexOf("مقدمة قبل الكرت");
  const cardIndex = text.indexOf("هذا هو الكرت");
  const afterIndex = text.indexOf("نص بعد الكرت");

  if (!(beforeIndex !== -1 && cardIndex !== -1 && afterIndex !== -1)) {
    throw new Error("selfTestRenderMessageOrder: النص المطلوب غير موجود في المخرجات");
  }

  if (!(beforeIndex < cardIndex && cardIndex < afterIndex)) {
    throw new Error(
      "selfTestRenderMessageOrder: ترتيب النص قبل/داخل/بعد الكرت غير صحيح"
    );
  }

  return {
    html: normalize(html),
    beforeIndex,
    cardIndex,
    afterIndex,
  };
}

