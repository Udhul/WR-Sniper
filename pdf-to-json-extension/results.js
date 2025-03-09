import { formatJson, createButtonToggler } from './utils.js';
import { renderSummaryView } from './summary-view.js';

document.addEventListener('DOMContentLoaded', () => {
    const jsonOutput = document.getElementById('jsonOutput');
    const copyBtn = document.getElementById('copyBtn');
    const downloadBtn = document.getElementById('downloadBtn');
    const toggleViewBtn = document.getElementById('toggleViewBtn');
    
    let currentView = 'raw'; // 'raw' or 'summary'
    let rawJsonData = null;
    let summaryData = null;
    
    // Get the JSON data from storage
    chrome.storage.local.get(['pdfJsonResult', 'pdfSummaryResult'], function(result) {
      rawJsonData = result.pdfJsonResult;
      summaryData = result.pdfSummaryResult;
      
      if (rawJsonData) {
        // Format the JSON with indentation for readability
        jsonOutput.textContent = formatJson(rawJsonData);
        
        // Enable buttons once we have data
        copyBtn.disabled = false;
        downloadBtn.disabled = false;
        toggleViewBtn.disabled = false;
      } else {
        jsonOutput.textContent = 'No PDF conversion data found.';
        copyBtn.disabled = true;
        downloadBtn.disabled = true;
        toggleViewBtn.disabled = true;
      }
    });
    
    // Create button status togglers
    const copyToggler = createButtonToggler(copyBtn, 'Copy to Clipboard', 'Copied!');
    
    // Toggle between raw JSON and summary view
    toggleViewBtn.addEventListener('click', () => {
      if (currentView === 'raw' && summaryData) {
        // Switch to summary view
        jsonOutput.innerHTML = ''; // Clear
        renderSummaryView(summaryData, jsonOutput);
        toggleViewBtn.textContent = 'Show Raw JSON';
        currentView = 'summary';
      } else {
        // Switch to raw view
        jsonOutput.innerHTML = ''; // Clear
        jsonOutput.textContent = formatJson(rawJsonData);
        toggleViewBtn.textContent = 'Show Summary View';
        currentView = 'raw';
      }
    });
    
    // Copy to clipboard functionality
    copyBtn.addEventListener('click', () => {
      let contentToCopy;
      
      if (currentView === 'raw') {
        contentToCopy = jsonOutput.textContent;
      } else {
        // For summary view, copy the summary JSON
        contentToCopy = JSON.stringify(summaryData, null, 2);
      }
      
      navigator.clipboard.writeText(contentToCopy)
        .then(() => copyToggler.showSuccess())
        .catch(err => {
          console.error('Failed to copy: ', err);
          copyToggler.showError();
        });
    });
    
    // Download JSON functionality
    downloadBtn.addEventListener('click', () => {
      if (!rawJsonData) return;
      
      let dataToDownload, filename;
      
      if (currentView === 'raw') {
        dataToDownload = formatJson(rawJsonData);
        filename = 'pdf-raw-data.json';
      } else {
        dataToDownload = JSON.stringify(summaryData, null, 2);
        filename = 'pdf-summary-data.json';
      }
      
      const blob = new Blob([dataToDownload], {type: 'application/json'});
      const url = URL.createObjectURL(blob);
      
      // Create download link and click it
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      
      // Clean up
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 0);
    });
});
