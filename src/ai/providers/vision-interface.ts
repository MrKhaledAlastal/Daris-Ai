
export interface VisionProvider {
    /**
     * Extract text and description from an image or PDF (base64).
     * @param base64Data The base64 encoded data (without prefix like 'data:image/...')
     * @param mimeType The mime type (e.g., 'image/jpeg', 'application/pdf')
     * @param prompt Optional prompt to guide the extraction
     */
    extractText(
        base64Data: string,
        mimeType: string,
        prompt?: string
    ): Promise<string>;
}
