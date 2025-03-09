// Import the PDF converter
import { convertPdfToJson } from './pdf-converter.js';

document.addEventListener('DOMContentLoaded', async () => {
  const statusDiv = document.getElementById('status');
  const jsonOutput = document.getElementById('jsonOutput');
  const container = document.querySelector('.container');

  // Immediately start checking if this is a PDF page
  try {
    // Get the current tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
   
    if (!tab.url || !isPdfUrl(tab.url)) {
      // Not a PDF page - show prominent message
      statusDiv.textContent = 'Not a PDF page';
      jsonOutput.textContent = 'Please navigate to a PDF page and try again.';
     
      // Make the message more noticeable
      jsonOutput.style.color = '#d32f2f';
      jsonOutput.style.fontWeight = 'bold';
      jsonOutput.style.fontSize = '14px';
      jsonOutput.style.textAlign = 'center';
      jsonOutput.style.padding = '30px';
      return;
    }
   
    // This is a PDF page - proceed with conversion
    statusDiv.textContent = 'Processing PDF...';
   
    // Fetch the PDF data
    const response = await fetch(tab.url);
    if (!response.ok) {
      throw new Error(`Failed to fetch PDF: ${response.statusText}`);
    }
   
    // Get the PDF as an ArrayBuffer
    const pdfBuffer = await response.arrayBuffer();
   
    // Convert the PDF to JSON
    const jsonData = await convertPdfToJson(pdfBuffer, getFilenameFromUrl(tab.url));
   
    // Display the JSON in the popup
    const formattedJson = JSON.stringify(jsonData, null, 2);
    jsonOutput.textContent = formattedJson;
    jsonOutput.style.color = '';
    jsonOutput.style.fontWeight = '';
    jsonOutput.style.fontSize = '';
    jsonOutput.style.textAlign = '';
    jsonOutput.style.padding = '';
   
    statusDiv.textContent = 'Conversion complete!';
  } catch (error) {
    statusDiv.textContent = 'Error: ' + error.message;
    jsonOutput.textContent = 'An error occurred during conversion:\n' + error.stack;
    console.error(error);
  }

  function isPdfUrl(url) {
    return url.endsWith('.pdf') ||
           url.includes('.pdf?') ||
           url.includes('/pdf/') ||
           url.includes('pdf.js');
  }
 
  function getFilenameFromUrl(url) {
    // Extract filename from URL
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      const filename = pathname.split('/').pop();
      return filename || 'document.pdf';
    } catch (e) {
      return 'document.pdf';
    }
  }
});
