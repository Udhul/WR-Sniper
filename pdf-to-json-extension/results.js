document.addEventListener('DOMContentLoaded', () => {
    const jsonOutput = document.getElementById('jsonOutput');
    const copyBtn = document.getElementById('copyBtn');
    const downloadBtn = document.getElementById('downloadBtn');
    
    // Get the JSON data from storage
    chrome.storage.local.get(['pdfJsonResult'], function(result) {
      if (result.pdfJsonResult) {
        // Format the JSON with indentation for readability
        const formattedJson = JSON.stringify(result.pdfJsonResult, null, 2);
        jsonOutput.textContent = formattedJson;
        
        // Enable buttons once we have data
        copyBtn.disabled = false;
        downloadBtn.disabled = false;
      } else {
        jsonOutput.textContent = 'No PDF conversion data found.';
        copyBtn.disabled = true;
        downloadBtn.disabled = true;
      }
    });
    
    // Copy to clipboard functionality
    copyBtn.addEventListener('click', () => {
      const jsonText = jsonOutput.textContent;
      
      // Copy to clipboard
      navigator.clipboard.writeText(jsonText)
        .then(() => {
          // Show temporary success message
          const originalText = copyBtn.textContent;
          copyBtn.textContent = 'Copied!';
          setTimeout(() => {
            copyBtn.textContent = originalText;
          }, 2000);
        })
        .catch(err => {
          console.error('Failed to copy: ', err);
          copyBtn.textContent = 'Failed to copy';
          setTimeout(() => {
            copyBtn.textContent = 'Copy to Clipboard';
          }, 2000);
        });
    });
    
    // Download JSON functionality
    downloadBtn.addEventListener('click', () => {
      chrome.storage.local.get(['pdfJsonResult'], function(result) {
        if (result.pdfJsonResult) {
          const jsonString = JSON.stringify(result.pdfJsonResult, null, 2);
          const blob = new Blob([jsonString], {type: 'application/json'});
          const url = URL.createObjectURL(blob);
          
          // Generate filename from the PDF metadata if available
          let filename = 'pdf_conversion.json';
          if (result.pdfJsonResult.metadata && result.pdfJsonResult.metadata.filename) {
            // Replace .pdf extension with .json if present
            filename = result.pdfJsonResult.metadata.filename.replace(/\.pdf$/i, '') + '.json';
          }
          
          // Create temporary link and trigger download
          const a = document.createElement('a');
          a.href = url;
          a.download = filename;
          a.click();
          
          // Clean up
          URL.revokeObjectURL(url);
          
          // Show temporary success message
          const originalText = downloadBtn.textContent;
          downloadBtn.textContent = 'Downloaded!';
          setTimeout(() => {
            downloadBtn.textContent = originalText;
          }, 2000);
        }
      });
    });
  });
  