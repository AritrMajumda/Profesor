// PDF Text Extraction using pdf.js
// Configured for Vite with proper worker setup

import * as pdfjsLib from 'pdfjs-dist';

// Configure worker
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.mjs',
    import.meta.url
).toString();

/**
 * Extract text content from a PDF file
 */
export async function extractTextFromPDF(file) {
    try {
        console.log('[PDF] Starting extraction for:', file.name);

        const arrayBuffer = await file.arrayBuffer();

        const loadingTask = pdfjsLib.getDocument({
            data: arrayBuffer,
            useWorkerFetch: false,
            isEvalSupported: false,
            useSystemFonts: true,
        });

        const pdf = await loadingTask.promise;
        console.log(`[PDF] Loaded: ${pdf.numPages} pages`);

        let fullText = '';

        // Extract text from each page
        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();

            let pageText = '';
            let lastY = null;

            for (const item of textContent.items) {
                if (item.str && item.str.trim()) {
                    // Skip items that look like metadata/XML
                    if (isGarbageText(item.str)) continue;

                    // Add newline if Y position changed significantly
                    if (lastY !== null && Math.abs(item.transform[5] - lastY) > 5) {
                        pageText += '\n';
                    } else if (pageText.length > 0 && !pageText.endsWith(' ') && !pageText.endsWith('\n')) {
                        pageText += ' ';
                    }
                    pageText += item.str.trim();
                    lastY = item.transform[5];
                }
            }

            if (pageText.trim()) {
                fullText += pageText + '\n\n';
            }
        }

        // Clean up the text
        let cleanedText = cleanText(fullText);

        console.log(`[PDF] Extracted ${cleanedText.length} chars`);
        console.log('[PDF] Preview:', cleanedText.substring(0, 300) + '...');

        if (cleanedText.length < 100) {
            throw new Error('PDF has very little extractable text.');
        }

        return cleanedText;
    } catch (error) {
        console.error('[PDF] Extraction error:', error);
        throw new Error(`PDF extraction failed: ${error.message}. Please try a .txt file instead.`);
    }
}

/**
 * Check if text looks like garbage/metadata
 */
function isGarbageText(text) {
    // Skip XML-like content
    if (text.includes('<?xml') || text.includes('</') || text.includes('xmlns')) return true;
    // Skip paths
    if (text.includes('word/') || text.includes('.xml') || text.includes('docProps')) return true;
    // Skip binary-looking content
    if (/^[\x00-\x1f\x7f-\xff]+$/.test(text)) return true;
    // Skip content that's mostly special characters
    const specialChars = (text.match(/[^a-zA-Z0-9\s.,;:!?'"()-]/g) || []).length;
    if (specialChars > text.length * 0.5) return true;
    return false;
}

/**
 * Clean extracted text
 */
function cleanText(text) {
    return text
        // Remove non-printable characters
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
        // Remove excessive whitespace
        .replace(/[ \t]+/g, ' ')
        // Normalize line breaks
        .replace(/\n{3,}/g, '\n\n')
        // Remove lines that are mostly special chars
        .split('\n')
        .filter(line => {
            const stripped = line.trim();
            if (!stripped) return false;
            // Keep lines with mostly alphanumeric content
            const alphaNum = (stripped.match(/[a-zA-Z0-9]/g) || []).length;
            return alphaNum > stripped.length * 0.3 || stripped.length < 5;
        })
        .join('\n')
        .trim();
}

/**
 * Read text from a plain text file
 */
export async function extractTextFromFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target.result;
            if (text.trim().length < 50) {
                reject(new Error('File is empty or has very little content'));
            }
            console.log('[TXT] Extracted', text.length, 'chars');
            console.log('[TXT] Preview:', text.substring(0, 300) + '...');
            resolve(text);
        };
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsText(file);
    });
}
