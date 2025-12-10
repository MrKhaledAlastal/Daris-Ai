import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { generateEmbedding } from "@/lib/embeddings";

// 📦 Install: npm install pdf-parse
// This is much simpler and works reliably in Node.js
const pdf = require("pdf-parse");

// Configuration constants
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const BATCH_SIZE = 10; // Process embeddings in batches
const MAX_PAGE_LENGTH = 8000; // Prevent extremely long pages
const CHARS_PER_PAGE = 3000; // Approximate chars per page for chunking

export async function POST(req: Request) {
    let bookId: string | null = null;

    try {
        const body = await req.json();
        bookId = body.bookId;
        const { storagePath } = body;

        // Validate inputs
        if (!bookId || !storagePath) {
            return NextResponse.json(
                { error: "Missing required fields: bookId and storagePath" },
                { status: 400 }
            );
        }

        // Mark as processing
        await supabaseAdmin
            .from("books")
            .update({ status: "processing" })
            .eq("id", bookId);

        // 1) Download file with size validation
        const { data: fileData, error: downloadError } = await supabaseAdmin
            .storage
            .from("textbooks")
            .download(storagePath);

        if (downloadError) {
            throw new Error(`Download failed: ${downloadError.message}`);
        }

        if (!fileData) {
            throw new Error("No file data received");
        }

        const buffer = Buffer.from(await fileData.arrayBuffer());

        // Validate file size
        if (buffer.length > MAX_FILE_SIZE) {
            throw new Error(`File too large: ${(buffer.length / 1024 / 1024).toFixed(2)}MB (max: 50MB)`);
        }

        // 2) Parse PDF with page-by-page extraction
        console.log(`Parsing PDF for book ${bookId}`);

        const data = await pdf(buffer, {
            max: 0, // Parse all pages
            version: 'v2.0.550' // Use stable version
        });

        const totalPages = data.numpages;
        console.log(`Processing ${totalPages} pages for book ${bookId}`);

        // Extract text by page using pdf-parse's pagerender callback
        const pages: { page: number; text: string }[] = [];

        // Re-parse with page callback to get individual pages
        await pdf(buffer, {
            pagerender: async (pageData: any) => {
                const pageNum = pageData.pageIndex + 1;
                let text = pageData.getTextContent().then((content: any) => {
                    return content.items.map((item: any) => item.str).join(" ");
                });

                const pageText = await text;

                if (pageText && pageText.trim().length > 0) {
                    let content = pageText.trim();

                    // Truncate extremely long pages
                    if (content.length > MAX_PAGE_LENGTH) {
                        console.warn(`Page ${pageNum} truncated from ${content.length} to ${MAX_PAGE_LENGTH} chars`);
                        content = content.substring(0, MAX_PAGE_LENGTH);
                    }

                    pages.push({ page: pageNum, text: content });
                }

                return pageData;
            }
        }).catch((err: any) => {
            // If page-by-page fails, fall back to chunking the full text
            console.warn("Page-by-page extraction failed, using text chunking", err.message);
        });

        // Fallback: If page extraction didn't work, chunk the full text
        if (pages.length === 0 && data.text && data.text.trim().length > 0) {
            console.log("Using text chunking fallback");
            const fullText = data.text.trim();
            const numChunks = Math.ceil(fullText.length / CHARS_PER_PAGE);

            for (let i = 0; i < numChunks; i++) {
                const start = i * CHARS_PER_PAGE;
                const end = Math.min(start + CHARS_PER_PAGE, fullText.length);
                const chunk = fullText.substring(start, end).trim();

                if (chunk.length > 0) {
                    pages.push({
                        page: i + 1,
                        text: chunk.substring(0, MAX_PAGE_LENGTH)
                    });
                }
            }
        }

        if (pages.length === 0) {
            throw new Error("No text content extracted from PDF");
        }

        // 3) Generate and save embeddings in batches
        console.log(`Generating embeddings for ${pages.length} text chunks`);

        let processed = 0;
        const errors: string[] = [];

        for (let i = 0; i < pages.length; i += BATCH_SIZE) {
            const batch = pages.slice(i, i + BATCH_SIZE);

            // Process batch in parallel
            const batchPromises = batch.map(async (p) => {
                try {
                    const embedding = await generateEmbedding(p.text);

                    const { error: insertError } = await supabaseAdmin
                        .from("book_pages")
                        .insert({
                            book_id: bookId,
                            page_number: p.page,
                            content: p.text,
                            embedding,
                        });

                    if (insertError) {
                        throw new Error(`Insert failed for page ${p.page}: ${insertError.message}`);
                    }

                    return { success: true, page: p.page };
                } catch (err: any) {
                    errors.push(`Page ${p.page}: ${err.message}`);
                    return { success: false, page: p.page };
                }
            });

            const results = await Promise.allSettled(batchPromises);
            processed += results.filter(r => r.status === "fulfilled" && (r.value as any).success).length;

            console.log(`Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${processed}/${pages.length} pages processed`);
        }

        // 4) Mark as done or partial success
        const finalStatus = errors.length > 0 ? "partial_success" : "analyzed";

        await supabaseAdmin
            .from("books")
            .update({
                status: finalStatus,
                processed_pages: processed,
                total_pages: totalPages,
                processing_errors: errors.length > 0 ? errors.join("; ") : null
            })
            .eq("id", bookId);

        return NextResponse.json({
            success: true,
            totalPages: totalPages,
            processedPages: processed,
            errors: errors.length > 0 ? errors : undefined
        });

    } catch (err: any) {
        console.error("PROCESS ERROR:", err);

        // Update book status with error details
        if (bookId) {
            try {
                await supabaseAdmin
                    .from("books")
                    .update({
                        status: "error",
                        error_message: err.message || "Unknown error"
                    })
                    .eq("id", bookId);
            } catch (updateErr: unknown) {
                console.error("Failed to update error status:", updateErr);
            }
        }

        return NextResponse.json({
            error: err.message || "Processing failed",
            bookId
        }, { status: 500 });
    }
}