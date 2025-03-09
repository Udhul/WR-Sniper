// Enable the extension button for PDF pages
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete') {
    const url = tab.url || '';
    const isPdf = url.endsWith('.pdf') || 
                  url.includes('.pdf?') || 
                  url.includes('/pdf/') ||
                  url.includes('pdf.js');
    
    // Update the extension icon based on whether this is a PDF page
    if (isPdf) {
      chrome.action.setIcon({
        tabId: tabId,
        path: {
          16: "icons/icon16.png",
          48: "icons/icon48.png",
          128: "icons/icon128.png"
        }
      });
    } else {
      chrome.action.setIcon({
        tabId: tabId,
        path: {
          16: "icons/icon16_disabled.png",
          48: "icons/icon48_disabled.png",
          128: "icons/icon128_disabled.png"
        }
      });
    }
  }
});
