// import { convertPdfToJson } from './pdf-converter.js';
// import { isPdfUrl, getFilenameFromUrl } from './utils.js';
// import { processJsonData } from './json-organizer.js';
// import { renderSummaryView } from './summary-view.js';

// document.addEventListener('DOMContentLoaded', async () => {
//   const errorContainer = document.getElementById('errorContainer');
//   const contentOutput = document.getElementById('contentOutput');

//   // Function to show error messages
//   const showError = (message) => {
//     errorContainer.textContent = message;
//     errorContainer.style.display = 'block';
//   };
  
//   // Immediately start checking if this is a PDF page
//   try {
//     // Get the current tab
//     const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
   
//     if (!tab.url || !isPdfUrl(tab.url)) {
//       // Not a PDF page - show error
//       showError('Not a PDF page. Please navigate to a PDF and try again.');
//       return;
//     }
   
//     // Fetch the PDF data
//     const response = await fetch(tab.url);
//     if (!response.ok) {
//       throw new Error(`Failed to fetch PDF: ${response.statusText}`);
//     }
   
//     // Get the PDF as an ArrayBuffer
//     const pdfBuffer = await response.arrayBuffer();
   
//     // Convert the PDF to JSON
//     const jsonData = await convertPdfToJson(pdfBuffer, getFilenameFromUrl(tab.url));
    
//     // Process the JSON to get a summarized version
//     const summaryData = processJsonData(jsonData);
    
//     // Store both raw JSON and summary in storage
//     chrome.storage.local.set({ 
//       pdfJsonResult: jsonData,
//       pdfSummaryResult: summaryData
//     });
    
//     // Render the summary view
//     renderSummaryView(summaryData, contentOutput);
    
//   } catch (error) {
//     showError(`Error: ${error.message}`);
//   }
// });






// With DEBUG SHOW RAW JSON:


import { convertPdfToJson } from './pdf-converter.js';
import { isPdfUrl, getFilenameFromUrl } from './utils.js';
import { processJsonData, organizeJson } from './json-organizer.js';
import { renderSummaryView } from './summary-view.js';

document.addEventListener('DOMContentLoaded', async () => {
  const errorContainer = document.getElementById('errorContainer');
  const contentOutput = document.getElementById('contentOutput');

  // Create debug dropdown instead of a button
  const debugContainer = document.createElement('div');
  debugContainer.style.marginTop = '10px';
  debugContainer.style.display = 'none'; // Hide by default, show after processing
  
  const debugLabel = document.createElement('label');
  debugLabel.textContent = 'View JSON Data: ';
  debugLabel.style.marginRight = '8px';
  
  const debugDropdown = document.createElement('select');
  debugDropdown.id = 'debugDropdown';
  debugDropdown.style.padding = '5px';
  
  // Add options to the dropdown
  const options = [
    { value: 'none', text: 'Select JSON view...' },
    { value: 'summary', text: 'Summary JSON' },
    { value: 'organized', text: 'Organized JSON' },
    { value: 'original', text: 'Original JSON' }
  ];
  
  options.forEach(option => {
    const optionElement = document.createElement('option');
    optionElement.value = option.value;
    optionElement.textContent = option.text;
    debugDropdown.appendChild(optionElement);
  });
  
  // Assemble the debug container
  debugContainer.appendChild(debugLabel);
  debugContainer.appendChild(debugDropdown);
  
  // Add the container to the DOM
  document.body.appendChild(debugContainer);

  // Variables to store data
  let jsonData = null;
  let organizedData = null;
  let summaryData = null;

  // Function to show error messages
  const showError = (message) => {
    errorContainer.textContent = message;
    errorContainer.style.display = 'block';
  };
  
  // Function to display different types of raw JSON for debugging
  const showRawJson = (dataType = 'summary') => {
    // Get the appropriate data based on dataType
    let data;
    let title;
    
    switch (dataType) {
      case 'original':
        data = jsonData;
        title = 'Original JSON';
        if (!data) return;
        break;
      case 'organized':
        data = organizedData;
        title = 'Organized JSON';
        if (!data) return;
        break;
      case 'summary':
        data = summaryData;
        title = 'Summary JSON';
        if (!data) return;
        break;
      default:
        return; // If 'none' or invalid option, just return
    }

    // Clear existing content
    contentOutput.innerHTML = '';
    
    // Add title
    const titleElement = document.createElement('h3');
    titleElement.textContent = title;
    titleElement.style.margin = '10px 0';
    contentOutput.appendChild(titleElement);

    // Create pre element for JSON display
    const pre = document.createElement('pre');
    pre.style.whiteSpace = 'pre-wrap';
    pre.style.maxHeight = '400px';
    pre.style.overflow = 'auto';
    pre.style.fontSize = '12px';
    pre.style.background = '#f5f5f5';
    pre.style.padding = '10px';
    pre.style.borderRadius = '4px';
    
    // Format the JSON with indentation
    pre.textContent = JSON.stringify(data, null, 2);
    
    // Add a button to go back to summary view
    const backButton = document.createElement('button');
    backButton.textContent = 'Back to Summary View';
    backButton.style.padding = '5px 10px';
    backButton.style.marginBottom = '10px';
    backButton.addEventListener('click', () => {
      // Re-render the summary view and reset dropdown
      renderSummaryView(summaryData, contentOutput);
      debugDropdown.value = 'none';
    });
    
    // Add elements to output
    contentOutput.appendChild(backButton);
    contentOutput.appendChild(pre);
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
    
    // Store all versions of the data in variables
    jsonData = await convertPdfToJson(pdfBuffer, getFilenameFromUrl(tab.url));
    organizedData = organizeJson(jsonData);
    summaryData = processJsonData(jsonData);
    
    // Store both raw JSON and summary in storage
    chrome.storage.local.set({
      pdfJsonResult: jsonData,
      pdfSummaryResult: summaryData
    });
    
    // Render the summary view
    renderSummaryView(summaryData, contentOutput);
    
    // Show the debug dropdown now that we have data
    debugContainer.style.display = 'block';
    
    // Add event listener for the debug dropdown
    debugDropdown.addEventListener('change', (event) => {
      const selectedValue = event.target.value;
      
      if (selectedValue !== 'none') {
        showRawJson(selectedValue);
      } else {
        // If "Select JSON view..." is chosen, go back to summary view
        renderSummaryView(summaryData, contentOutput);
      }
    });
  } catch (error) {
    showError(`Error: ${error.message}`);
  }
});
