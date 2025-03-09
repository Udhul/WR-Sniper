/**
 * Creates a visual representation of the summarized JSON data
 * @param {Object} summaryData - The summarized JSON data from json-organizer
 * @param {HTMLElement} container - The container element to render the summary in
 */
export function renderSummaryView(summaryData, container) {
    // Clear container
    container.innerHTML = '';
    container.classList.add('summary-view');
    
    // Add main header
    const mainHeader = document.createElement('h2');
    mainHeader.textContent = 'Service Summary';
    container.appendChild(mainHeader);
    
    // Add basic information section
    const basicInfo = document.createElement('div');
    basicInfo.classList.add('info-section');
    
    const addressHeader = document.createElement('h3');
    addressHeader.textContent = 'Subscriber Address';
    basicInfo.appendChild(addressHeader);
    
    const addressValue = document.createElement('p');
    addressValue.textContent = summaryData["Subscriber address"] || "Not specified";
    basicInfo.appendChild(addressValue);
    
    const lidHeader = document.createElement('h3');
    lidHeader.textContent = 'Service ID';
    basicInfo.appendChild(lidHeader);
    
    const lidValue = document.createElement('p');
    lidValue.textContent = summaryData["LID"] || "Not specified";
    basicInfo.appendChild(lidValue);
    
    container.appendChild(basicInfo);
    
    // Add Flexibility Points section
    const fpHeader = document.createElement('h3');
    fpHeader.textContent = 'Flexibility Points';
    container.appendChild(fpHeader);
    
    // If no flexibility points, show a message
    if (!summaryData["Flexibility Points"] || summaryData["Flexibility Points"].length === 0) {
      const noFpMsg = document.createElement('p');
      noFpMsg.textContent = 'No flexibility points found in this document.';
      container.appendChild(noFpMsg);
      return;
    }
    
    // Create an accordion for flexibility points
    const fpAccordion = document.createElement('div');
    fpAccordion.classList.add('accordion');
    
    // Process each flexibility point
    summaryData["Flexibility Points"].forEach((fp, index) => {
      // Create accordion item
      const fpItem = document.createElement('div');
      fpItem.classList.add('accordion-item');
      
      // Create header that toggles content
      const fpToggle = document.createElement('div');
      fpToggle.classList.add('accordion-header');
      fpToggle.textContent = `${fp.name}`;
      if (fp.address) {
        const fpAddress = document.createElement('span');
        fpAddress.classList.add('fp-address');
        fpAddress.textContent = ` (${fp.address})`;
        fpToggle.appendChild(fpAddress);
      }
      fpToggle.addEventListener('click', () => {
        fpContent.classList.toggle('expanded');
        fpToggle.classList.toggle('active');
      });
      
      // Create content container
      const fpContent = document.createElement('div');
      fpContent.classList.add('accordion-content');
      
      // Add actions to content
      if (Object.keys(fp.actions).length === 0) {
        const noActions = document.createElement('p');
        noActions.textContent = 'No specific actions defined for this flexibility point.';
        fpContent.appendChild(noActions);
      } else {
        // Process each action type
        for (const [actionType, actionDetails] of Object.entries(fp.actions)) {
          const actionHeader = document.createElement('h4');
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
      
      // Assemble the accordion item
      fpItem.appendChild(fpToggle);
      fpItem.appendChild(fpContent);
      fpAccordion.appendChild(fpItem);
    });
    
    container.appendChild(fpAccordion);
  }
  