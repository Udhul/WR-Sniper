import { convertPdfToJson } from './pdf-converter.js';
import { isPdfUrl, getFilenameFromUrl } from './utils.js';
import { processJsonData } from './json-organizer.js';
import { renderSummaryView } from './summary-view.js';

document.addEventListener('DOMContentLoaded', async () => {
  const errorContainer = document.getElementById('errorContainer');
  const contentOutput = document.getElementById('contentOutput');

  // Function to show error messages
  const showError = (message) => {
    errorContainer.textContent = message;
    errorContainer.style.display = 'block';
  };
  
  // Immediately start checking if this is a PDF page
  try {
    // Get the current tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
   
    if (!tab.url || !isPdfUrl(tab.url)) {
      // Not a PDF page - show error
      showError('Not a PDF page. Please navigate to a PDF and try again.');
      return;
    }
   
    // Fetch the PDF data
    const response = await fetch(tab.url);
    if (!response.ok) {
      throw new Error(`Failed to fetch PDF: ${response.statusText}`);
    }
   
    // Get the PDF as an ArrayBuffer
    const pdfBuffer = await response.arrayBuffer();
   
    // Convert the PDF to JSON
    const jsonData = await convertPdfToJson(pdfBuffer, getFilenameFromUrl(tab.url));
    
    // Process the JSON to get a summarized version
    const summaryData = processJsonData(jsonData);
    
    // Store both raw JSON and summary in storage
    chrome.storage.local.set({ 
      pdfJsonResult: jsonData,
      pdfSummaryResult: summaryData
    });
    
    // Render the summary view
    renderSummaryView(summaryData, contentOutput);
    
  } catch (error) {
    showError(`Error: ${error.message}`);
  }
});
