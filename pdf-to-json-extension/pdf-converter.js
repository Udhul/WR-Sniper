// Import PDF.js
import * as pdfjsLib from './lib/pdf.min.mjs';

// Initialize PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = './lib/pdf.worker.min.mjs';

/**
 * Extracts raw text items from a PDF document
 * @param {pdfjsLib.PDFDocumentProxy} pdfDoc - The PDF document
 * @returns {Promise<Array>} - The extracted raw items
 */
async function extractRawTextFromPdf(pdfDoc) {
  const rawItems = [];
  
  // Process each page
  for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
    const page = await pdfDoc.getPage(pageNum);
    const textContent = await page.getTextContent();
    
    // Store each text item with all its properties
    for (const item of textContent.items) {
      // Keep all raw properties from PDF.js
      rawItems.push({
        str: item.str,
        transform: [...item.transform], // Copy the transform array
        width: item.width || 0,
        height: item.height || 0,
        fontName: item.fontName || "",
        hasEOL: !!item.hasEOL,
        page: pageNum,
        // Calculate position for convenience
        x: item.transform[4],
        y: item.transform[5]
      });
    }
  }
  
  return rawItems;
}

/**
 * Converts PDF data to a simple list of raw text items
 * @param {ArrayBuffer} pdfBuffer - The PDF data as an ArrayBuffer
 * @param {string} filename - The name of the PDF file (not used in output)
 * @returns {Promise<Array>} - The list of raw text items
 */
export async function convertPdfToJson(pdfBuffer, filename = 'document.pdf') {
  try {
    // Load the PDF document
    const loadingTask = pdfjsLib.getDocument({ data: pdfBuffer });
    const pdfDoc = await loadingTask.promise;
    
    // Extract raw text items
    const rawItems = await extractRawTextFromPdf(pdfDoc);
    
    return rawItems;
  } catch (error) {
    console.error(`Error converting PDF to JSON: ${error.message}`);
    throw error;
  }
}

// For testing directly in browser
if (typeof window !== 'undefined') {
  window.convertPdfToJson = convertPdfToJson;
}
