import { convertPdfToJson } from './pdf-converter.js';
import { isPdfUrl, getFilenameFromUrl, formatJson } from './utils.js';
import { processJsonData } from './json-organizer.js';
import { renderSummaryView } from './summary-view.js';

document.addEventListener('DOMContentLoaded', async () => {
  const statusDiv = document.getElementById('status');
  const contentOutput = document.getElementById('contentOutput');

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
      contentOutput.textContent = 'Please navigate to a PDF page and try again.';
      applyStyles(contentOutput, errorStyles);
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
    
    // Process the JSON data to get a summarized version
    const summaryData = processJsonData(jsonData);
    
    // Store both the raw JSON and summary data in local storage
    chrome.storage.local.set({ 
      pdfJsonResult: jsonData,
      pdfSummaryResult: summaryData
    });
    
    // Render the summary view in the contentOutput div
    renderSummaryView(summaryData, contentOutput);
    
    statusDiv.textContent = 'Conversion complete!';
  } catch (error) {
    statusDiv.textContent = 'Error: ' + error.message;
    contentOutput.textContent = 'An error occurred: ' + error.message;
    applyStyles(contentOutput, errorStyles);
  }
});




// import { convertPdfToJson } from './pdf-converter.js';
// import { isPdfUrl, getFilenameFromUrl, formatJson } from './utils.js';
// import { processJsonData, organizeJson, createSummaryJson } from './json-organizer.js';
// import { renderSummaryView } from './summary-view.js';

// document.addEventListener('DOMContentLoaded', async () => {
//   const statusDiv = document.getElementById('status');
//   const contentOutput = document.getElementById('contentOutput');

//   // Style settings for error display
//   const errorStyles = {
//     color: '#d32f2f',
//     fontWeight: 'bold',
//     fontSize: '14px',
//     textAlign: 'center',
//     padding: '30px'
//   };
  
//   // Normal styles (for resetting)
//   const normalStyles = {
//     color: '',
//     fontWeight: '',
//     fontSize: '',
//     textAlign: '',
//     padding: ''
//   };
  
//   // Apply styles to an element
//   const applyStyles = (element, styles) => {
//     for (const [property, value] of Object.entries(styles)) {
//       element.style[property] = value;
//     }
//   };

//   // Immediately start checking if this is a PDF page
//   try {
//     // Get the current tab
//     const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
   
//     if (!tab.url || !isPdfUrl(tab.url)) {
//       // Not a PDF page - show prominent message
//       statusDiv.textContent = 'Not a PDF page';
//       contentOutput.textContent = 'Please navigate to a PDF page and try again.';
//       applyStyles(contentOutput, errorStyles);
//       return;
//     }
   
//     // This is a PDF page - proceed with conversion
//     statusDiv.textContent = 'Processing PDF...';
   
//     // Fetch the PDF data
//     const response = await fetch(tab.url);
//     if (!response.ok) {
//       throw new Error(`Failed to fetch PDF: ${response.statusText}`);
//     }
   
//     // Get the PDF as an ArrayBuffer
//     const pdfBuffer = await response.arrayBuffer();
   
//     // Convert the PDF to JSON
//     const jsonData = await convertPdfToJson(pdfBuffer, getFilenameFromUrl(tab.url));
    
//     // First, get the organized data (intermediate structure)
//     const organizedData = organizeJson(jsonData);
//     console.log("Organized Data:", organizedData);
    
//     // Process the organized data to get a summarized version
//     const summaryData = processJsonData(jsonData);
//     console.log("Summary Data:", summaryData);
    
//     // Store all formats in chrome.storage
//     chrome.storage.local.set({ 
//       pdfJsonResult: jsonData,
//       pdfOrganizedResult: organizedData,
//       pdfSummaryResult: summaryData
//     });
    
//     // Display the organized structure instead of summary for debugging
//     contentOutput.textContent = JSON.stringify(summaryData, null, 2);
    
//     statusDiv.textContent = 'Conversion complete! Showing organized structure for debugging.';
//   } catch (error) {
//     statusDiv.textContent = 'Error: ' + error.message;
//     contentOutput.textContent = 'An error occurred: ' + error.message;
//     applyStyles(contentOutput, errorStyles);
//   }
// });
