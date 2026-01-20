import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { generateEmbedding } from "@/lib/embeddings";

const pdf = require("pdf-parse");

// Configuration constants
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const BATCH_SIZE = 10; // Process embeddings in batches
const MAX_PAGE_LENGTH = 8000; // Prevent extremely long pages

// 🔧 FIX: Removed CHUNK_OVERLAP to prevent duplicate page content
const CHUNK_SIZE = 1500;      // Optimal for Arabic text and semantic matching

export async function POST(req: Request) {
    let bookId: string | null = null;

    try {
        const body = await req.json();
        bookId = body.bookId;
        const { storagePath, skipFirstPages } = body;

        // Validate inputs
        if (!bookId || !storagePath) {
            return NextResponse.json(
                { error: "Missing required fields: bookId and storagePath" },
                { status: 400 }
            );
        }

        const pagesToSkip = typeof skipFirstPages === 'number' && skipFirstPages >= 0 ? skipFirstPages : 0;

        console.log(`📚 Starting book processing for: ${bookId}`);

        // Mark as processing
        await supabaseAdmin
            .from("books")
            .update({ status: "processing" })
            .eq("id", bookId);

        // 1) Download file with size validation
        console.log(`⬇️ Downloading file from: ${storagePath}`);
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

        console.log(`✅ File downloaded successfully (${(buffer.length / 1024 / 1024).toFixed(2)}MB)`);

        // 2) Parse PDF - Extract full text first
        console.log(`📄 Extracting text from PDF...`);

        const pdfData = await pdf(buffer, {
            max: 0, // Parse all pages
            version: 'v2.0.550'
        });

        if (!pdfData || !pdfData.text || pdfData.text.trim().length === 0) {
            throw new Error("No text content extracted from PDF");
        }

        const fullText = pdfData.text.trim();
        const totalPDFPages = pdfData.numpages || 0;

        console.log(`📊 PDF has ${totalPDFPages} pages, extracted ${fullText.length} characters`);

        // 3) Intelligent chunking - Split text into logical page-sized chunks
        const pages: { page: number; text: string }[] = [];

        // Split by common page delimiters first (multiple newlines, form feeds, page numbers patterns)
        const pageDelimiters = /(?:\n\s*\n\s*\n|\f|\n\s*(?:Page|صفحة|الصفحة)\s+\d+)/gi;
        let rawChunks = fullText.split(pageDelimiters).filter((chunk: string) => chunk.trim().length > 0);

        // Auto-detect index/cover pages
        let actualSkipCount = pagesToSkip;
        if (pagesToSkip === 0 && rawChunks.length > 0) {
            const firstChunkLower = rawChunks[0].toLowerCase();
            const indexKeywords = ['فهرس', 'محتويات', 'table of contents', 'contents', 'index'];
            const hasIndexKeywords = indexKeywords.some(keyword => firstChunkLower.includes(keyword));

            if (hasIndexKeywords && rawChunks[0].length < 500) {
                actualSkipCount = 1;
                console.log(`🔍 Auto-detected index/cover page - skipping first chunk`);
            }
        }

        if (actualSkipCount > 0) {
            console.log(`⭐️ Skipping first ${actualSkipCount} chunk(s) (index/cover pages)`);
            rawChunks = rawChunks.slice(actualSkipCount);
        }

        // If we got reasonable chunks (not too many, not too few), use them
        if (rawChunks.length > totalPDFPages / 2 && rawChunks.length < totalPDFPages * 3) {
            console.log(`✅ Using natural page breaks: ${rawChunks.length} chunks detected`);

            rawChunks.forEach((chunk: string, index: number) => {
                let content = chunk.trim().replace(/\s+/g, ' ');

                if (content.length > MAX_PAGE_LENGTH) {
                    content = content.substring(0, MAX_PAGE_LENGTH);
                }

                if (content.length > 100) { // Minimum content threshold
                    pages.push({
                        page: index + 1,
                        text: content
                    });
                }
            });
        } else {
            // Fallback: NON-overlapping chunking to prevent duplicates
            console.log(`⚠️ Using non-overlapping chunking (${CHUNK_SIZE} chars per chunk)`);

            // Auto-detect index/cover in sliding window mode
            let slidingSkipCount = pagesToSkip;
            if (pagesToSkip === 0) {
                const firstChunkPreview = fullText.substring(0, Math.min(500, fullText.length)).toLowerCase();
                const indexKeywords = ['فهرس', 'محتويات', 'table of contents', 'contents', 'index'];
                const hasIndexKeywords = indexKeywords.some(keyword => firstChunkPreview.includes(keyword));

                if (hasIndexKeywords && firstChunkPreview.length < 500) {
                    slidingSkipCount = 1;
                    console.log(`🔍 Auto-detected index/cover - skipping first chunk`);
                }
            }

            // 🔧 FIX: Use CHUNK_SIZE as step (no overlap)
            const stepSize = CHUNK_SIZE; // No overlap = no duplicates
            let pageNum = 1;
            let chunksSkipped = 0;

            for (let start = 0; start < fullText.length; start += stepSize) {
                const end = Math.min(start + CHUNK_SIZE, fullText.length);
                let chunk = fullText.substring(start, end).trim();

                // Clean up whitespace
                chunk = chunk.replace(/\s+/g, ' ');

                if (chunk.length > MAX_PAGE_LENGTH) {
                    chunk = chunk.substring(0, MAX_PAGE_LENGTH);
                }

                if (chunk.length > 100) {
                    // Skip first N chunks if they are index/cover
                    if (chunksSkipped < slidingSkipCount) {
                        chunksSkipped++;
                        continue;
                    }

                    pages.push({
                        page: pageNum++,
                        text: chunk
                    });
                }

                // Stop if we've reached the end
                if (end >= fullText.length) break;
            }

            if (slidingSkipCount > 0) {
                console.log(`⭐️ Skipped ${chunksSkipped} chunk(s) in sliding window mode`);
            }
        }

        if (pages.length === 0) {
            throw new Error("Failed to create text chunks from PDF");
        }

        console.log(`✅ Successfully created ${pages.length} unique text chunks for processing`);

        // 4) Generate and save embeddings in batches
        console.log(`🔮 Generating embeddings for ${pages.length} chunks...`);

        let processed = 0;
        const errors: string[] = [];

        for (let i = 0; i < pages.length; i += BATCH_SIZE) {
            const batch = pages.slice(i, i + BATCH_SIZE);
            const batchNum = Math.floor(i / BATCH_SIZE) + 1;
            const totalBatches = Math.ceil(pages.length / BATCH_SIZE);

            console.log(`📄 Processing batch ${batchNum}/${totalBatches} (${batch.length} chunks)...`);

            // Process batch in parallel
            const batchPromises = batch.map(async (p) => {
                try {
                    // Generate embedding
                    const embedding = await generateEmbedding(p.text);

                    // 🔧 FIX: Check if page already exists before inserting
                    const { data: existing } = await supabaseAdmin
                        .from("book_pages")
                        .select("id")
                        .eq("book_id", bookId)
                        .eq("page_number", p.page)
                        .maybeSingle();

                    if (existing) {
                        console.log(`⚠️ Page ${p.page} already exists, skipping...`);
                        return { success: true, page: p.page, skipped: true };
                    }

                    // Insert into database
                    const { error: insertError } = await supabaseAdmin
                        .from("book_pages")
                        .insert({
                            book_id: bookId,
                            page_number: p.page,
                            content: p.text,
                            embedding,
                        });

                    if (insertError) {
                        throw new Error(`Insert failed: ${insertError.message}`);
                    }

                    return { success: true, page: p.page, skipped: false };
                } catch (err: any) {
                    const errorMsg = `Page ${p.page}: ${err.message}`;
                    console.error(`❌ ${errorMsg}`);
                    errors.push(errorMsg);
                    return { success: false, page: p.page };
                }
            });

            const results = await Promise.allSettled(batchPromises);
            const batchSuccess = results.filter(
                r => r.status === "fulfilled" && (r.value as any).success
            ).length;

            processed += batchSuccess;

            console.log(`✅ Batch ${batchNum}: ${batchSuccess}/${batch.length} chunks saved (Total: ${processed}/${pages.length})`);
        }

        // 5) Mark as done or partial success
        const finalStatus = errors.length > 0
            ? (processed > 0 ? "partial_success" : "error")
            : "analyzed";

        console.log(`📊 Final status: ${finalStatus} (${processed}/${pages.length} chunks processed)`);

        await supabaseAdmin
            .from("books")
            .update({
                status: finalStatus,
                processed_pages: processed,
                total_pages: totalPDFPages,
                processing_errors: errors.length > 0 ? errors.slice(0, 10).join("; ") : null
            })
            .eq("id", bookId);

        console.log(`✅ Book processing complete for: ${bookId}`);

        return NextResponse.json({
            success: processed > 0,
            totalPages: totalPDFPages,
            processedPages: processed,
            processedChunks: pages.length,
            errors: errors.length > 0 ? errors : undefined
        });

    } catch (err: any) {
        console.error("❌ PROCESS ERROR:", err);

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
                console.error("❌ Failed to update error status:", updateErr);
            }
        }

        return NextResponse.json({
            error: err.message || "Processing failed",
            bookId
        }, { status: 500 });
    }
}