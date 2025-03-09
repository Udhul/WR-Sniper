/**
 * Creates a compact visual representation of the summarized JSON data
 * @param {Object} summaryData - The summarized JSON data from json-organizer
 * @param {HTMLElement} container - The container element to render the summary in
 */
export function renderSummaryView(summaryData, container) {
    // Clear container
    container.innerHTML = '';
    container.classList.add('summary-view');
    
    // Add basic information at the top
    const basicInfo = document.createElement('div');
    basicInfo.classList.add('basic-info');
  
    // Subscriber address
    const addressDiv = document.createElement('div');
    addressDiv.innerHTML = `<span>Subscriber:</span> ${summaryData["Subscriber address"] || "Not specified"}`;
    basicInfo.appendChild(addressDiv);
    
    // Service ID
    const lidDiv = document.createElement('div');
    lidDiv.innerHTML = `<span>Service ID:</span> ${summaryData["LID"] || "Not specified"}`;
    basicInfo.appendChild(lidDiv);
    
    container.appendChild(basicInfo);
    
    // Add Flexibility Points section
    const fpList = document.createElement('div');
    fpList.classList.add('fp-list');
    
    // If no flexibility points, show a message
    if (!summaryData["Flexibility Points"] || summaryData["Flexibility Points"].length === 0) {
      const noFpMsg = document.createElement('p');
      noFpMsg.textContent = 'No flexibility points found in this document.';
      noFpMsg.style.textAlign = 'center';
      noFpMsg.style.color = '#5f6368';
      noFpMsg.style.padding = '20px';
      fpList.appendChild(noFpMsg);
      container.appendChild(fpList);
      return;
    }
    
    // Process each flexibility point - all expanded by default
    summaryData["Flexibility Points"].forEach((fp, index) => {
      const fpItem = document.createElement('div');
      fpItem.classList.add('fp-item');
      
      // Create header
      const fpHeader = document.createElement('div');
      fpHeader.classList.add('fp-header');
      
      const titleSpan = document.createElement('span');
      titleSpan.classList.add('fp-title');
      titleSpan.textContent = fp.name;
      fpHeader.appendChild(titleSpan);
      
      // Add toggle functionality
      fpHeader.addEventListener('click', () => {
        fpContent.style.display = fpContent.style.display === 'none' ? 'block' : 'none';
      });
      
      // Create content container - expanded by default
      const fpContent = document.createElement('div');
      fpContent.classList.add('fp-content');
      
      // Add all flexibility point info fields (except name and actions)
      for (const key in fp) {
        // Skip name and actions as they're handled separately
        if (key !== 'name' && key !== 'actions') {
          const infoDiv = document.createElement('div');
          infoDiv.classList.add('fp-info');
          
          // Format key with capitalized first letter
          const formattedKey = key.charAt(0).toUpperCase() + key.slice(1);
          infoDiv.textContent = `${formattedKey}: ${fp[key]}`;
          
          fpContent.appendChild(infoDiv);
        }
      }
      
      // Add actions to content
      if (!fp.actions || Object.keys(fp.actions).length === 0) {
        const noActions = document.createElement('p');
        noActions.textContent = 'No specific actions defined for this flexibility point.';
        noActions.style.color = '#5f6368';
        noActions.style.fontStyle = 'italic';
        noActions.style.fontSize = '12px';
        fpContent.appendChild(noActions);
      } else {
        // Process each action type
        for (const [actionType, actionDetails] of Object.entries(fp.actions)) {
          const actionHeader = document.createElement('div');
          actionHeader.classList.add('action-header');
          actionHeader.textContent = actionType;
          fpContent.appendChild(actionHeader);
          
          // Process action details
          const actionTable = document.createElement('table');
          actionTable.classList.add('details-table');
          
          for (const [key, value] of Object.entries(actionDetails)) {
            const row = document.createElement('tr');
            
            const keyCell = document.createElement('td');
            keyCell.classList.add('key-cell');
            keyCell.textContent = key;
            row.appendChild(keyCell);
            
            const valueCell = document.createElement('td');
            valueCell.classList.add('value-cell');
            valueCell.textContent = value;
            row.appendChild(valueCell);
            
            actionTable.appendChild(row);
          }
          
          fpContent.appendChild(actionTable);
        }
      }
      
      // Assemble the item
      fpItem.appendChild(fpHeader);
      fpItem.appendChild(fpContent);
      fpList.appendChild(fpItem);
    });
    
    container.appendChild(fpList);
  }
  