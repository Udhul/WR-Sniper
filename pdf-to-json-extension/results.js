import { formatJson, createButtonToggler } from './utils.js';

document.addEventListener('DOMContentLoaded', () => {
    const jsonOutput = document.getElementById('jsonOutput');
    const copyBtn = document.getElementById('copyBtn');
    const downloadBtn = document.getElementById('downloadBtn');
    
    // Get the JSON data from storage
    chrome.storage.local.get(['pdfJsonResult'], function(result) {
      if (result.pdfJsonResult) {
        // Format the JSON with indentation for readability
        jsonOutput.textContent = formatJson(result.pdfJsonResult);
        
        // Enable buttons once we have data
        copyBtn.disabled = false;
        downloadBtn.disabled = false;
      } else {
        jsonOutput.textContent = 'No PDF conversion data found.';
        copyBtn.disabled = true;
        downloadBtn.disabled = true;
      }
    });
    
    // Create button status togglers
    const copyToggler = createButtonToggler(copyBtn, 'Copy to Clipboard', 'Copied!');
    
    // Copy to clipboard functionality
    copyBtn.addEventListener('click', () => {
      navigator.clipboard.writeText(jsonOutput.textContent)
        .then(() => copyToggler.showSuccess())
        .catch(err => {
          console.error('Failed to copy: ', err);
          copyToggler.showError();
        });
    });
    
    // Download JSON functionality
    downloadBtn.addEventListener('click', () => {
      chrome.storage.local.get(['pdfJsonResult'], function(result) {
        if (result.pdfJsonResult) {
          const jsonString = formatJson(result.pdfJsonResult);
          const blob = new Blob([jsonString], {type: 'application/json'});
          const url = URL.createObjectURL(blob);
          
          // Create download link and click it
          const a = document.createElement('a');
          a.href = url;
          a.download = 'pdf-data.json';
          document.body.appendChild(a);
          a.click();
          
          // Clean up
          setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
          }, 0);
        }
      });
    });
});
