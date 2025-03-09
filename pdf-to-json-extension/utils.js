/**
 * Utility functions for PDF to JSON extension
 */

// Check if a URL is a PDF
export function isPdfUrl(url) {
    if (!url) return false;
    return url.endsWith('.pdf') || 
           url.includes('.pdf?') || 
           url.includes('/pdf/') ||
           url.includes('pdf.js');
  }
  
  // Format JSON with consistent indentation
  export function formatJson(jsonData) {
    return JSON.stringify(jsonData, null, 2);
  }
  
  // Get filename from URL
  export function getFilenameFromUrl(url) {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      const filename = pathname.split('/').pop();
      return filename || 'document.pdf';
    } catch (e) {
      return 'document.pdf';
    }
  }
  
  // Icon paths configuration
  export const ICONS = {
    enabled: {
      16: "icons/icon16.png",
      48: "icons/icon48.png",
      128: "icons/icon128.png"
    },
    disabled: {
      16: "icons/icon16_disabled.png",
      48: "icons/icon48_disabled.png",
      128: "icons/icon128_disabled.png"
    }
  };
  
  // Create button status toggler
  export function createButtonToggler(button, originalText, successText, errorText = 'Failed') {
    return {
      showSuccess: () => {
        button.textContent = successText;
        setTimeout(() => {
          button.textContent = originalText;
        }, 2000);
      },
      showError: () => {
        button.textContent = errorText;
        setTimeout(() => {
          button.textContent = originalText;
        }, 2000);
      }
    };
  }
  