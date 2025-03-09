import { isPdfUrl, ICONS } from './utils.js';

// Enable the extension button for PDF pages
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete') {
    const url = tab.url || '';
    
    // Update the extension icon based on whether this is a PDF page
    chrome.action.setIcon({
      tabId: tabId,
      path: isPdfUrl(url) ? ICONS.enabled : ICONS.disabled
    });
  }
});
