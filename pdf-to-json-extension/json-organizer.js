/**
 * JSON Organizer Module
 * Processes raw PDF JSON output to create a structured format based on document sections
 */

/**
 * Find the index of a block that contains a keyword
 * @param {Array} blocks - The blocks array to search
 * @param {String} keyword - The keyword to search for
 * @param {Boolean} keysOnly - Whether to search only in the first line of each block
 * @param {Boolean} exactMatch - Whether to require an exact match
 * @returns {Number|null} - The index of the block or null if not found
 */
export function findBlockNumWithKeyword(blocks, keyword, keysOnly = true, exactMatch = false) {
    for (let i = 0; i < blocks.length; i++) {
      const lines = blocks[i].lines || [];
      
      if (keysOnly) {
        // Check only the first line if it exists
        if (lines.length > 0) {
          const key = lines[0];
          if ((exactMatch && key === keyword) || (!exactMatch && key.includes(keyword))) {
            return i;
          }
        }
      } else {
        // Check all lines in the block
        for (const line of lines) {
          if ((exactMatch && line === keyword) || (!exactMatch && line.includes(keyword))) {
            return i;
          }
        }
      }
    }
    return null;
  }
  
  /**
   * Organizes blocks into a hierarchical structure
   * @param {Object} jsonData - The raw JSON data from PDF conversion
   * @returns {Object} - Organized JSON with nested structure
   */
  export function organizeJson(jsonData) {
    const organizedData = {
      "Service Configurations": {},
      "Site Operations": {
        "Flexibility Points": {}
      }
    };
  
    const blocks = jsonData.content?.blocks || [];
    if (!blocks.length) return organizedData;
  
    // --- SERVICE CONFIGURATIONS
    const scStartBlockNo = findBlockNumWithKeyword(blocks, "Service Configurations");
    if (scStartBlockNo === null) return organizedData;
    
    const soStartBlockNo = findBlockNumWithKeyword(blocks, "Site Operations");
    if (soStartBlockNo === null) return organizedData;
    
    const scEndBlockNo = soStartBlockNo - 1;
    const scBlocks = blocks.slice(scStartBlockNo, scEndBlockNo + 1);
  
    // Find blocks with lines that have relevant keys
    const lineKeys = ["Subscriber address:", "Service ID:"];
    const foundKeys = new Set();
  
    for (let blockIndex = 0; blockIndex < scBlocks.length; blockIndex++) {
      if (foundKeys.size === lineKeys.length) break;
      
      const block = scBlocks[blockIndex];
      
      for (const key of lineKeys) {
        if (foundKeys.has(key)) continue;
        
        if (block.lines && block.lines.length > 1 && block.lines[0].includes(key)) {
          const lineKey = block.lines[0]; // Get exact full line key
          const lineValues = block.lines.slice(1);
          const lineValue = lineValues.join("\n");
          
          if (lineValue) {
            organizedData["Service Configurations"][lineKey] = lineValue;
            foundKeys.add(key);
            
            if (foundKeys.size === lineKeys.length) break;
          }
        }
      }
    }
  
    // --- SITE OPERATIONS
    let soEndBlockNo;
    const fileUrlBlockNo = findBlockNumWithKeyword(blocks, "file://");
    
    if (fileUrlBlockNo !== null) {
      soEndBlockNo = fileUrlBlockNo - 1;
    } else {
      soEndBlockNo = blocks.length - 1;
    }
    
    const soBlocks = blocks.slice(soStartBlockNo, soEndBlockNo + 1);
  
    // Find all blocks starting with "Flexibility Point"
    const fpIndices = [];
    for (let i = 0; i < soBlocks.length; i++) {
      const block = soBlocks[i];
      if (block.lines && block.lines[0] && block.lines[0].includes("Flexibility point")) {
        fpIndices.push(i);
      }
    }
  
    // If no flexibility points found, return the organized data as is
    if (fpIndices.length === 0) {
      console.log(`No flexibility points found. so blocks: ${soBlocks.length}, sc blocks: ${scBlocks.length}`);
      return organizedData;
    }
  
    // Group blocks by flexibility point
    for (let i = 0; i < fpIndices.length; i++) {
      const fpIndex = fpIndices[i];
      
      // Get the title of this flexibility point (second line 'value' of the block)
      let fpTitle;
      try {
        fpTitle = soBlocks[fpIndex].lines[1];
        if (!fpTitle) {
          fpTitle = `Flexibility Point ${i+1}`;
        }
      } catch (e) {
        fpTitle = `Flexibility Point ${i+1}`; // Fallback title
      }
      
      // Determine the end index for this flexibility point
      const endIndex = (i+1 < fpIndices.length) ? fpIndices[i+1] : soBlocks.length;
      
      // Get all blocks for this flexibility point
      const fpBlocks = soBlocks.slice(fpIndex, endIndex);
      
      // Organize blocks within this flexibility point by state headers
      const organizedFp = {
        "info": [], // Blocks before the first state header
        "state_sections": {} // Sections grouped by state headers
      };
      
      // Find state headers within this flexibility point
      const stateHeaderIndices = [];
      for (let j = 0; j < fpBlocks.length; j++) {
        const block = fpBlocks[j];
        // A state header has only one line and x-coordinate start point > 80
        if (block.lines && block.lines.length === 1 && 
            block.position && block.position[0] > 80) {
          stateHeaderIndices.push(j);
        }
      }
      
      // If no state headers, all blocks go to "info"
      if (stateHeaderIndices.length === 0) {
        organizedFp.info = fpBlocks;
      } else {
        // Add blocks before first state header to "info"
        organizedFp.info = fpBlocks.slice(0, stateHeaderIndices[0]);
        
        // Group blocks by state header
        for (let j = 0; j < stateHeaderIndices.length; j++) {
          const headerIndex = stateHeaderIndices[j];
          
          // Get the state header title
          const headerTitle = fpBlocks[headerIndex].lines[0];
          
          // Determine the end index for this section
          const sectionEnd = (j+1 < stateHeaderIndices.length) ? stateHeaderIndices[j+1] : fpBlocks.length;
          
          // Get blocks for this section (including the header block)
          const sectionBlocks = fpBlocks.slice(headerIndex, sectionEnd);
          
          // Store in the organized structure
          organizedFp.state_sections[headerTitle] = sectionBlocks;
        }
      }
      
      // Store this organized flexibility point
      organizedData["Site Operations"]["Flexibility Points"][fpTitle] = organizedFp;
    }
    
    return organizedData;
  }
  
  /**
   * Cleans the block structures by replacing each block with just its lines
   * @param {Object} organizedData - The organized JSON data
   * @returns {Object} - Cleaned up organized data
   */
  export function cleanStructure(organizedData) {
    const cleanedData = JSON.parse(JSON.stringify(organizedData));
    
    // Clean Site Operations - Flexibility Points
    const fpData = cleanedData["Site Operations"]["Flexibility Points"];
    for (const fpTitle in fpData) {
      // Clean info blocks
      fpData[fpTitle].info = fpData[fpTitle].info.map(block => block.lines || []);
      
      // Clean state sections
      for (const stateHeader in fpData[fpTitle].state_sections) {
        fpData[fpTitle].state_sections[stateHeader] = 
          fpData[fpTitle].state_sections[stateHeader].map(block => block.lines || []);
      }
    }
    
    return cleanedData;
  }
  
  /**
   * Creates a simplified summary of the organized data
   * @param {Object} organizedData - The organized JSON data
   * @returns {Object} - Simplified summary data
   */
  export function createSummaryJson(organizedData) {
    const summary = {
      "Subscriber address": organizedData["Service Configurations"]["Subscriber address: "] || "",
      "LID": organizedData["Service Configurations"]["Service ID: "] || "",
      "Flexibility Points": []
    };
    
    // Go through each flexibility point
    const fpData = organizedData["Site Operations"]["Flexibility Points"];
    for (const fpTitle in fpData) {
      const fpSummary = {
        "name": fpTitle,
        "address": "",
        "actions": {}
      };
      
      // Find address in info blocks
      for (const block of fpData[fpTitle].info) {
        // Check if this is a list of lines or a block with lines
        const lines = Array.isArray(block) ? block : (block.lines || []);
        
        // Look for address line
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].startsWith("Address: ") && i+1 < lines.length) {
            fpSummary.address = lines[i+1];
            break;
          }
        }
      }
      
      // Get relevant state sections (Add, Connect, Remove)
      const stateSections = fpData[fpTitle].state_sections;
      for (const header in stateSections) {
        if (header.includes("Add ") || header.includes("Connect ") || header.includes("Remove ")) {
          // Initialize a dictionary for this action's content
          const actionContent = {};
          
          // Skip the first block as that's the header itself
          const section = stateSections[header];
          for (let i = 1; i < section.length; i++) {
            // Check if this is a list of lines
            const lines = Array.isArray(section[i]) ? section[i] : (section[i].lines || []);
            
            if (lines.length) {
              // If the first line ends with a colon, treat it as a key-value pair
              if (lines[0].trim().endsWith(':')) {
                const key = lines[0].trim().replace(/:$/, '').trim();
                const value = lines.length > 1 ? lines.slice(1).join("\n") : "";
                actionContent[key] = value;
              } else {
                // For lines without a key format, use the whole content as a value
                const noteContent = lines.join("\n");
                if (!actionContent["Notes"]) {
                  actionContent["Notes"] = noteContent;
                } else {
                  actionContent["Notes"] += "\n" + noteContent;
                }
              }
            }
          }
          
          // Add the organized content to the actions dictionary
          fpSummary.actions[header] = actionContent;
        }
      }
      
      // Add to summary
      summary["Flexibility Points"].push(fpSummary);
    }
    
    return summary;
  }
  
  /**
   * Main processing function to organize and summarize JSON data
   * @param {Object} jsonData - The raw JSON data from PDF conversion
   * @returns {Object} - Processed summary data
   */
  export function processJsonData(jsonData) {
    const organizedData = organizeJson(jsonData);
    const summaryData = createSummaryJson(organizedData);
    return summaryData;
  }
  