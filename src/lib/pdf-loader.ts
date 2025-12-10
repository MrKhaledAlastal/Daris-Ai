import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

export async function parsePDF(buffer: Buffer): Promise<{ text: string; numPages: number }> {
    // Convert Buffer to Uint8Array
    const data = new Uint8Array(buffer);

    const loadingTask = pdfjsLib.getDocument({
        data,
        useSystemFonts: true,
        disableFontFace: true,
    });

    const pdfDocument = await loadingTask.promise;
    const numPages = pdfDocument.numPages;
    let fullText = "";

    for (let i = 1; i <= numPages; i++) {
        const page = await pdfDocument.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
            .map((item: any) => item.str)
            .join(" ");

        fullText += pageText + "\n\n";
    }

    return {
        text: fullText,
        numPages
    };
}
