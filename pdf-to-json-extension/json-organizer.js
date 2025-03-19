/**
 * Standardizes a key by trimming spaces and removing a trailing colon.
 *
 * @param {string} key - The key to standardize.
 * @returns {string} - The standardized key.
 */
function standardizeKey(key) {
    return key.trim().replace(/:$/, '').trim();
  }
  













/**
 * Joins an array of text lines into a single string.
 * Inserts a single space between lines if the previous line does not end
 * with a space and the next line does not begin with one.
 *
 * @param {Array<string>} lines - Array of text lines.
 * @returns {string} - Joined string.
 */
function joinLines(lines) {
    let result = "";
    for (let i = 0; i < lines.length; i++) {
      let line = lines[i];
      if (i > 0) {
        if (result.length > 0 && result[result.length - 1] !== " " && line[0] !== " ") {
          result += " ";
        }
      }
      result += line;
    }
    return result;
  }
  
  /**
   * Merges raw PDF text items into blocks.
   *
   * - Discards items with empty or whitespace-only "str".
   * - Sorts items by page (ascending), then by y descending (higher y first), then by x ascending.
   * - Discards items from the top or bottom of a page: for each page, items whose y coordinate is within 5 points
   *   from the maximum (top) or minimum (bottom) y value are removed.
   * - Discards items before the first item whose 'str' begins with "Service Configurations".
   * - For each unused item, if it hasEOL===true, finds the next unused item (from the remaining sorted items)
   *   whose x coordinate is within 1 point of the block's starting x; merges that item’s str into the block and marks it used.
   *   This process continues until an item with hasEOL===false is reached.
   *
   * Each resulting block is an object with:
   *   - "lines": list of raw strings,
   *   - "text": the joined string (using joinLines),
   *   - positional info: "x", "y", "width", "height", "fontName", "page".
   *
   * @param {Array<Object>} rawItems - Array of raw text items.
   * @returns {Array<Object>} - Array of merged blocks.
   */
  function mergeRawItemsIntoBlocks(rawItems) {
    // Filter out empty or whitespace-only items.
    let filtered = rawItems.filter(item => item.str && item.str.trim() !== "");
  
    // // Sort: page ascending, then y descending (higher y first), then x ascending.
    // filtered.sort((a, b) => {
    //   const pageDiff = (a.page || 0) - (b.page || 0);
    //   if (pageDiff !== 0) return pageDiff;
    //   const yDiff = (b.y || 0) - (a.y || 0); // descending: higher y first
    //   if (yDiff !== 0) return yDiff;
    //   return (a.x || 0) - (b.x || 0);
    // });
  
    // Group items by page and discard those near the top or bottom.
    const pageItems = {};
    filtered.forEach(item => {
      const page = item.page || 0;
      if (!pageItems[page]) {
        pageItems[page] = [];
      }
      pageItems[page].push(item);
    });
    const newFiltered = [];
    for (const page in pageItems) {
      const items = pageItems[page];
      const maxY = Math.max(...items.map(item => item.y));
      const minY = Math.min(...items.map(item => item.y));
      items.forEach(item => {
        // Keep the item only if it's more than 5 points away from both the top and bottom.
        if ((maxY - item.y > 5) && (item.y - minY > 5)) {
          newFiltered.push(item);
        }
      });
    }
    // // Re-sort new filtered items.
    // newFiltered.sort((a, b) => {
    //   const pageDiff = (a.page || 0) - (b.page || 0);
    //   if (pageDiff !== 0) return pageDiff;
    //   const yDiff = (b.y || 0) - (a.y || 0);
    //   if (yDiff !== 0) return yDiff;
    //   return (a.x || 0) - (b.x || 0);
    // });
    filtered = newFiltered;
  
    // Discard items before the first that starts with "Service Configurations".
    const startIndex = filtered.findIndex(item =>
      item.str.trim().startsWith("Service Configurations")
    );
    if (startIndex !== -1) {
      filtered = filtered.slice(startIndex);
    }
  
    // Mark all items as not used.
    filtered.forEach(item => item.used = false);
  
    const blocks = [];
    for (let i = 0; i < filtered.length; i++) {
      if (filtered[i].used) continue; // skip items already merged into a block
  
      let currentItem = filtered[i];
      currentItem.used = true; // mark as used
      const blockStartX = currentItem.x; // remember starting x
      let blockLines = [currentItem.str];
      let blockX = currentItem.x;
      let blockY = currentItem.y;
      let blockWidth = currentItem.width;
      let blockHeight = currentItem.height;
      let blockFont = currentItem.fontName;
      let blockPage = currentItem.page;
  
      // If current item hasEOL true, try to find the next unused item with similar x.
      while (currentItem.hasEOL === true) {
        // Look for the next candidate (search entire remaining filtered array)
        let candidate = null;
        for (let j = 0; j < filtered.length; j++) {
          if (!filtered[j].used && Math.abs(filtered[j].x - blockStartX) <= 1) {
            candidate = filtered[j];
            break;
          }
        }
        if (!candidate) break;
        // If candidate starts with key phrases, do not merge.
        if (
          candidate.str.trim().startsWith("Service Configurations") ||
          candidate.str.trim().startsWith("Site Operations")
        ) {
          break;
        }
        // Merge candidate.
        candidate.used = true;
        blockLines.push(candidate.str);
        blockX = Math.min(blockX, candidate.x);
        const currentRight = blockX + blockWidth;
        const candidateRight = candidate.x + candidate.width;
        blockWidth = Math.max(currentRight, candidateRight) - blockX;
        // Update currentItem to candidate for further chaining.
        currentItem = candidate;
        // Continue only if candidate hasEOL true.
        if (!currentItem.hasEOL) break;
      }
      const block = {
        lines: blockLines,
        text: joinLines(blockLines),
        x: blockX,
        y: blockY,
        width: blockWidth,
        height: blockHeight,
        fontName: blockFont,
        page: blockPage
      };
      blocks.push(block);
    }
  
    // (Optional) Copy the result to the clipboard for debugging.
    if (navigator && navigator.clipboard) {
      navigator.clipboard.writeText(JSON.stringify(blocks, null, 2));
    }
    return blocks;
  }
  
  
  















  /**
   * Finds the index of a block whose text (joined text) contains the given keyword.
   * Searches only the block's text.
   *
   * @param {Array} blocks - Array of blocks.
   * @param {string} keyword - The keyword to search for.
   * @param {boolean} [exactMatch=false] - If true, require an exact match.
   * @returns {number|null} - The index of the matching block, or null if not found.
   */
  function findBlockNumWithKeyword(blocks, keyword, exactMatch = false) {
    for (let i = 0; i < blocks.length; i++) {
      const text = blocks[i].text || "";
      if (exactMatch) {
        if (text.trim() === keyword) return i;
      } else {
        if (text.includes(keyword)) return i;
      }
    }
    return null;
  }
  
  /**
   * Organizes the raw blocks into a structured JSON object.
   *
   * The structure is as follows:
   * - "Service Configurations": key-value pairs (e.g., Subscriber address, Service ID)
   * - "Site Operations": contains nested "Flexibility Points"
   *    - Within each Flexibility Point, there is an "info" section and state_sections.
   *
   * @param {Object} jsonData - The raw JSON data with property `rawItems` (an array).
   *                           (You should pass { content: { blocks: mergedBlocks } }.)
   * @returns {Object} - The organized JSON structure.
   */
  export function organizeJson(jsonData) {
    // Expect jsonData.content.blocks to be our merged blocks.
    const organizedData = {
      "Service Configurations": {},
      "Site Operations": {
        "Flexibility Points": {}
      }
    };
  
    // Use our merged blocks from the raw extraction.
    const blocks = (jsonData.content && jsonData.content.blocks) || [];
  
    // --- SERVICE CONFIGURATIONS
    const scStartBlockNo = findBlockNumWithKeyword(blocks, "Service Configurations");
    const siteOpsIndex = findBlockNumWithKeyword(blocks, "Site Operations");
    const scEndBlockNo = siteOpsIndex !== null ? siteOpsIndex - 1 : blocks.length;
    const scBlocks = blocks.slice(scStartBlockNo, scEndBlockNo);
  
    const lineKeys = ["Subscriber address:", "Service ID:"];
    const foundKeys = new Set();
  
    // For each block, if its text contains one of the keys and the next block exists,
    // then use the next block’s text as the value.
    for (let i = 0; i < scBlocks.length; i++) {
      const block = scBlocks[i];
      for (const key of lineKeys) {
        if (block.text && block.text.includes(key)) {
          if (i + 1 < scBlocks.length) {
            const value = scBlocks[i + 1].text;
            organizedData["Service Configurations"][standardizeKey(key)] = value;
            foundKeys.add(key);
          }
        }
      }
    }
  
    // --- SITE OPERATIONS
    const soStartBlockNo = siteOpsIndex;
    const fileIndex = findBlockNumWithKeyword(blocks, "file://");
    const soEndBlockNo = fileIndex !== null ? fileIndex - 1 : blocks.length - 1;
    const soBlocks = blocks.slice(soStartBlockNo, soEndBlockNo);
  
    // Find indices of blocks that begin with "Flexibility point"
    const fpIndices = [];
    for (let i = 0; i < soBlocks.length; i++) {
      if (soBlocks[i].text && soBlocks[i].text.includes("Flexibility point")) {
        fpIndices.push(i);
      }
    }
    if (fpIndices.length === 0) {
      console.log(`No flexibility points found. so blocks: ${soBlocks.length}, sc blocks: ${scBlocks.length}`);
      return organizedData;
    }
  
    // Group blocks by flexibility point.
    for (let i = 0; i < fpIndices.length; i++) {
      const fpIndex = fpIndices[i];
      let fpTitle;
      try {
        // Use the next block’s text as title if available.
        fpTitle = soBlocks[fpIndex + 1].text;
        if (!fpTitle) fpTitle = `Flexibility Point ${i + 1}`;
      } catch (err) {
        fpTitle = `Flexibility Point ${i + 1}`;
      }
      const endIndex = (i + 1 < fpIndices.length) ? fpIndices[i + 1] : soBlocks.length;
      const fpBlocks = soBlocks.slice(fpIndex, endIndex);
  
      const organizedFP = {
        "info": [],
        "state_sections": {}
      };
  
      // Identify state headers: a state header is defined as a block with x > 80.
      const stateHeaderIndices = [];
      for (let j = 0; j < fpBlocks.length; j++) {
        const block = fpBlocks[j];
        if (block.text && block.text.trim() !== "" && block.x > 80) {
          stateHeaderIndices.push(j);
        }
      }
  
      if (stateHeaderIndices.length === 0) {
        organizedFP["info"] = fpBlocks;
      } else {
        organizedFP["info"] = fpBlocks.slice(0, stateHeaderIndices[0]);
        for (let j = 0; j < stateHeaderIndices.length; j++) {
          const headerIndex = stateHeaderIndices[j];
          const headerTitle = fpBlocks[headerIndex].text;
          const standardizedHeader = standardizeKey(headerTitle);
          const sectionEnd = (j + 1 < stateHeaderIndices.length) ? stateHeaderIndices[j + 1] : fpBlocks.length;
          const sectionBlocks = fpBlocks.slice(headerIndex, sectionEnd);
          organizedFP["state_sections"][standardizedHeader] = sectionBlocks;
        }
      }
      organizedData["Site Operations"]["Flexibility Points"][fpTitle] = organizedFP;
    }
  
    return organizedData;
  }
  
  /**
   * Creates a simplified summary of the organized data.
   * The summary includes:
   *   - Top-level Service Configurations ("Subscriber address" and "Service ID" as "LID")
   *   - A list of Flexibility Points with their names, addresses (if found), positions,
   *     remarks, and action sections (for headers including "Add", "Connect", or "Remove").
   *
   * @param {Object} organizedData - The organized JSON structure.
   * @returns {Object} - The summary JSON data.
   */
  export function createSummaryJson(organizedData) {
    const summary = {
      "Subscriber address": organizedData["Service Configurations"][standardizeKey("Subscriber address:")] || "",
      "LID": organizedData["Service Configurations"][standardizeKey("Service ID:")] || "",
      "Flexibility Points": []
    };
  
    const fpEntries = organizedData["Site Operations"]["Flexibility Points"];
    for (const fpTitle in fpEntries) {
      const fpData = fpEntries[fpTitle];
      const fpSummary = {
        "name": fpTitle,
        "address": "",
        "position": "",
        "remark": "",
        "actions": {}
      };
  
      // Search the info blocks for Address, Position, and Remark.
      for (let i = 0; i < fpData.info.length; i++) {
        const block = fpData.info[i];
        const line = block.text || "";
        if (line.startsWith("Address") && i + 1 < fpData.info.length) {
          fpSummary["address"] = fpData.info[i + 1].text;
        } else if (line.startsWith("Position") && i + 1 < fpData.info.length) {
          fpSummary["position"] = fpData.info[i + 1].text;
        } else if (line.startsWith("Remark") && i + 1 < fpData.info.length) {
          fpSummary["remark"] = fpData.info[i + 1].text;
        }
      }
  
      // Process state sections that contain action keywords.
      for (const header in fpData.state_sections) {
        if (header.includes("Add") || header.includes("Connect") || header.includes("Remove")) {
          const actionContent = {};
          const section = fpData.state_sections[header];
          // Skip the header block and process the remaining blocks.
          for (let i = 1; i < section.length; i++) {
            const block = section[i];
            const line = block.text || "";
            if (line.trim().endsWith(':')) {
              const key = standardizeKey(line);
              const value = (i + 1 < section.length) ? section[i + 1].text : "";
              actionContent[key] = value;
            } else {
              if (!actionContent["Notes"]) {
                actionContent["Notes"] = line;
              } else {
                actionContent["Notes"] += "\n" + line;
              }
            }
          }
          fpSummary["actions"][header] = actionContent;
        }
      }
  
      // Remove any empty fields from the flexibility point summary.
      for (const key in fpSummary) {
        if (fpSummary[key] === "" || (typeof fpSummary[key] === "object" && Object.keys(fpSummary[key]).length === 0)) {
          delete fpSummary[key];
        }
      }
  
      summary["Flexibility Points"].push(fpSummary);
    }
  
    return summary;
  }
  
  /**
   * Main processing function to organize and summarize JSON data.
   *
   * This function expects the raw JSON data to have raw items list structure:
   * [ ... rawItems ... ]
   *
   * @param {Object} jsonData - The raw JSON data.
   * @returns {Object} - Processed summary data.
   */
  export function processJsonData(jsonData) {
    // First, merge raw items into blocks.
    const mergedBlocks = mergeRawItemsIntoBlocks(jsonData);
    // Replace jsonData.content.blocks with our merged blocks.
    jsonData = { content: { blocks: mergedBlocks } };
    const organizedData = organizeJson(jsonData);
    const summaryData = createSummaryJson(organizedData);
    return summaryData;
  }
  