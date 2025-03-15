// Import PDF.js
import * as pdfjsLib from './lib/pdf.min.mjs';

// Initialize PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = './lib/pdf.worker.min.mjs';

/**
 * Creates an MD5 hash from an array buffer
 * @param {ArrayBuffer} buffer - The buffer to hash
 * @returns {Promise<string>} - The MD5 hash
 */
async function calculateSHA256(buffer) {
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Extracts text blocks from a PDF document
 * @param {pdfjsLib.PDFDocumentProxy} pdfDoc - The PDF document
 * @returns {Promise<{blocks: Array, rawText: string}>} - The extracted blocks and raw text
 */
async function extractTextFromPdf(pdfDoc) {
  const documentBlocks = [];
  let documentRawText = "";
  
  // Process each page
  for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
    const page = await pdfDoc.getPage(pageNum);
    const textContent = await page.getTextContent();
    
    // Create blocks from text items
    // PDF.js provides text in a different format than PyMuPDF,
    // so we need to group items into blocks
    const blocks = [];
    let currentBlock = null;
    
    for (const item of textContent.items) {
      if (item.str.trim() === '') continue;
      
      // Each item has a transform that provides position info [horizontal pos, vertical pos, etc]
      const x = item.transform[4];
      const y = item.transform[5];
      const width = item.width || 0;
      const height = item.height || 12; // Approximate height if not provided
      
      // Check if this item belongs to the current block or if we need a new block
      if (!currentBlock || 
          Math.abs(y - currentBlock.avgY) > height * 0.5) {
        // Start a new block
        if (currentBlock) {
          blocks.push(currentBlock);
        }
        
        currentBlock = {
          position: [x, y, x + width, y - height],
          lines: [item.str],
          avgY: y
        };
      } else {
        // Add to existing block
        currentBlock.lines.push(item.str);
        currentBlock.position[2] = Math.max(currentBlock.position[2], x + width);
        // Update average Y position
        currentBlock.avgY = (currentBlock.avgY + y) / 2;
      }
    }
    
    // Add the last block
    if (currentBlock) {
      blocks.push(currentBlock);
    }
    
    // Add blocks to document blocks
    for (const block of blocks) {
      documentBlocks.push({
        page: pageNum,
        lines: block.lines,
        position: block.position,
      });
    }
  }
  
  // Sort blocks by page, then by y-coordinate, then by x-coordinate
  documentBlocks.sort((a, b) => {
    if (a.page !== b.page) return a.page - b.page;
    if (a.position[1] !== b.position[1]) return b.position[1] - a.position[1]; // Higher Y is lower on page
    return a.position[0] - b.position[0];
  });
  
  // Set block numbers after sorting
  for (let i = 0; i < documentBlocks.length; i++) {
    documentBlocks[i].block_index = i;
  }
  
  // Build raw text from all blocks
  for (const block of documentBlocks) {
    documentRawText += block.lines.join('\n') + '\n';
  }
  documentRawText = documentRawText.trim();
  
  return {
    blocks: documentBlocks,
    rawText: documentRawText
  };
}

/**
 * Converts PDF data to structured JSON
 * @param {ArrayBuffer} pdfBuffer - The PDF data as an ArrayBuffer
 * @param {string} filename - The name of the PDF file
 * @returns {Promise<Object>} - The structured JSON data
 */
export async function convertPdfToJson(pdfBuffer, filename = 'document.pdf') {
  try {
    // Calculate hash
    const fileHash = await calculateSHA256(pdfBuffer);
    
    // Load the PDF document
    const loadingTask = pdfjsLib.getDocument({ data: pdfBuffer });
    const pdfDoc = await loadingTask.promise;
    
    // Extract text content
    const { blocks: documentBlocks, rawText: documentRawText } = await extractTextFromPdf(pdfDoc);
   
    // Create metadata
    const metadata = {
      filename: filename,
      file_path: "memory",
      file_hash: fileHash,
      processed_date: new Date().toISOString(),
      page_count: pdfDoc.numPages
    };
    
    // Create the complete JSON structure
    const jsonData = {
      metadata: metadata,
      content: {
        blocks: documentBlocks,
        raw: documentRawText
      },
      annotations: {
        labeled: false,
        relevant_lines: [],
        extracted_data: {}
      }
    };
    
    return jsonData;
  } catch (error) {
    console.error(`Error converting PDF to JSON: ${error.message}`);
    throw error;
  }
}

// For testing directly in browser
if (typeof window !== 'undefined') {
  window.convertPdfToJson = convertPdfToJson;
}
