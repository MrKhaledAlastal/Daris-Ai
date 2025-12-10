import { ai } from "@/ai/genkit";

export async function generateEmbedding(text: string): Promise<number[]> {
    try {
        // @ts-ignore - Genkit types might be tricky, using string identifier
        const result = await ai.embed({
            embedder: 'googleai/text-embedding-004',
            content: text,
        });

        // Handle different return types (array of embeddings or single embedding)
        if (Array.isArray(result)) {
            if (result[0] && typeof result[0] === 'object' && 'embedding' in result[0]) {
                return result[0].embedding as number[];
            }
            return result as unknown as number[];
        }

        // If it returns an object with embedding
        if (result && typeof result === 'object' && 'embedding' in result) {
            return (result as any).embedding;
        }

        return result as unknown as number[];
    } catch (error) {
        console.error("Error generating embedding:", error);
        throw error;
    }
}
