import { convertPdfToJson } from './pdf-converter.js';
import { isPdfUrl, getFilenameFromUrl, formatJson } from './utils.js';

document.addEventListener('DOMContentLoaded', async () => {
  const statusDiv = document.getElementById('status');
  const jsonOutput = document.getElementById('jsonOutput');

  // Style settings for error display
  const errorStyles = {
    color: '#d32f2f',
    fontWeight: 'bold',
    fontSize: '14px',
    textAlign: 'center',
    padding: '30px'
  };
  
  // Normal styles (for resetting)
  const normalStyles = {
    color: '',
    fontWeight: '',
    fontSize: '',
    textAlign: '',
    padding: ''
  };
  
  // Apply styles to an element
  const applyStyles = (element, styles) => {
    for (const [property, value] of Object.entries(styles)) {
      element.style[property] = value;
    }
  };

  // Immediately start checking if this is a PDF page
  try {
    // Get the current tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
   
    if (!tab.url || !isPdfUrl(tab.url)) {
      // Not a PDF page - show prominent message
      statusDiv.textContent = 'Not a PDF page';
      jsonOutput.textContent = 'Please navigate to a PDF page and try again.';
      applyStyles(jsonOutput, errorStyles);
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
    jsonOutput.textContent = formatJson(jsonData);
    applyStyles(jsonOutput, normalStyles);
   
    statusDiv.textContent = 'Conversion complete!';
  } catch (error) {
    statusDiv.textContent = 'Error: ' + error.message;
  }
});
