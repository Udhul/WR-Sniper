// Import the PDF converter
import { convertPdfToJson } from './pdf-converter.js';

document.addEventListener('DOMContentLoaded', () => {
  const convertBtn = document.getElementById('convertBtn');
  const statusDiv = document.getElementById('status');
  
  convertBtn.addEventListener('click', async () => {
    statusDiv.textContent = 'Processing...';
    
    try {
      // Get the current tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (!tab.url || !isPdfUrl(tab.url)) {
        statusDiv.textContent = 'Not a PDF page';
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
      
      // Store the JSON data temporarily
      chrome.storage.local.set({ pdfJsonResult: jsonData });
      
      // Open a new tab to display the results
      chrome.tabs.create({ url: 'results.html' });
      
      statusDiv.textContent = 'Conversion complete!';
    } catch (error) {
      statusDiv.textContent = 'Error: ' + error.message;
      console.error(error);
    }
  });
  
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
