/**
 * Standardizes a key by removing spaces, newlines, and colons.
 *
 * @param {string} key - The key to standardize.
 * @returns {string} - The standardized key.
 */
function standardizeKey(key) {
    return key.trim().replace(/:$/, '').trim();
}

/**
 * Finds the block number in an array of blocks that contains the specified keyword.
 * It can search only the first line (keysOnly=true) or all lines.
 *
 * @param {Array} blocks - Array of block objects.
 * @param {string} keyword - The keyword to search for.
 * @param {boolean} [keysOnly=true] - If true, only check the first line of each block.
 * @param {boolean} [exactMatch=false] - If true, require an exact match.
 * @returns {number|null} - The index of the block if found; otherwise, null.
 */
function findBlockNumWithKeyword(blocks, keyword, keysOnly = true, exactMatch = false) {
    for (let i = 0; i < blocks.length; i++) {
        const block = blocks[i];
        const lines = block.lines || [];
        if (keysOnly) {
            if (lines.length > 0) {
                const key = lines[0];
                if (exactMatch && key === keyword) {
                    return i;
                } else if (!exactMatch && key.includes(keyword)) {
                    return i;
                }
            }
        } else {
            for (const line of lines) {
                if (exactMatch && line === keyword) {
                    return i;
                } else if (!exactMatch && line.includes(keyword)) {
                    return i;
                }
            }
        }
    }
    return null;
}

/**
 * Organizes the raw JSON data into a structured object.
 *
 * The structure is as follows:
 *  - "Service Configurations": contains key-value pairs (e.g., Subscriber address, Service ID)
 *  - "Site Operations" with nested "Flexibility Points": groups blocks into flexibility points and state sections.
 *
 * @param {Object} jsonData - The raw JSON data.
 * @returns {Object} - The organized JSON structure.
 */
export function organizeJson(jsonData) {
    const organizedData = {
        "Service Configurations": {},
        "Site Operations": {
            "Flexibility Points": {}
        }
    };

    const content = jsonData.content || {};
    const blocks = content.blocks || [];

    // --- SERVICE CONFIGURATIONS
    const scStartBlockNo = findBlockNumWithKeyword(blocks, "Service Configurations");
    const siteOpsIndex = findBlockNumWithKeyword(blocks, "Site Operations");
    const scEndBlockNo = (siteOpsIndex !== null) ? siteOpsIndex - 1 : blocks.length;
    const scBlocks = blocks.slice(scStartBlockNo, scEndBlockNo);

    const lineKeys = ["Subscriber address:", "Service ID:"];
    const foundKeys = new Set();

    for (let blockIndex = 0; blockIndex < scBlocks.length; blockIndex++) {
        if (foundKeys.size === lineKeys.length) {
            break;
        }
        const block = scBlocks[blockIndex];
        for (const key of lineKeys) {
            if (foundKeys.has(key)) continue;
            if (block.lines && block.lines.length > 0 && block.lines[0].includes(key) && block.lines.length > 1) {
                const lineKey = block.lines[0]; // full key from the block
                const standardizedKey = standardizeKey(lineKey); // Standardize the key
                const lineValues = block.lines.slice(1);
                const lineValue = lineValues.join("\n");
                if (lineValue) {
                    organizedData["Service Configurations"][standardizedKey] = lineValue;
                    foundKeys.add(key);
                    if (foundKeys.size === lineKeys.length) break;
                }
            }
        }
    }

    // --- SITE OPERATIONS
    const soStartBlockNo = siteOpsIndex;
    let fileIndex = findBlockNumWithKeyword(blocks, "file://");
    let soEndBlockNo = (fileIndex !== null) ? fileIndex - 1 : blocks.length - 1;
    const soBlocks = blocks.slice(soStartBlockNo, soEndBlockNo);

    // Find indices of all blocks that start with "Flexibility point"
    const fpIndices = [];
    for (let i = 0; i < soBlocks.length; i++) {
        if (soBlocks[i].lines && soBlocks[i].lines.length > 0 && soBlocks[i].lines[0].includes("Flexibility point")) {
            fpIndices.push(i);
        }
    }
    if (fpIndices.length === 0) {
        console.log(`No flexibility points found. so blocks: ${soBlocks.length}, sc blocks: ${scBlocks.length}`);
        return organizedData;
    }

    // Group blocks by flexibility point
    for (let i = 0; i < fpIndices.length; i++) {
        const fpIndex = fpIndices[i];
        let fpTitle;
        try {
            fpTitle = String(soBlocks[fpIndex].lines[1]);
            if (!fpTitle) {
                fpTitle = `Flexibility Point ${i + 1}`;
            }
        } catch (err) {
            fpTitle = `Flexibility Point ${i + 1}`;
        }
        const endIndex = (i + 1 < fpIndices.length) ? fpIndices[i + 1] : soBlocks.length;
        const fpBlocks = soBlocks.slice(fpIndex, endIndex);

        const organizedFP = {
            "info": [],
            "state_sections": {}
        };

        // Find state headers within this flexibility point.
        // A state header is defined as a block with a single line and a position with x-coordinate > 80.
        const stateHeaderIndices = [];
        for (let j = 0; j < fpBlocks.length; j++) {
            const block = fpBlocks[j];
            if (block.lines && block.lines.length === 1) {
                const pos = block.position || [0];
                if (pos[0] > 80) {
                    stateHeaderIndices.push(j);
                }
            }
        }

        if (stateHeaderIndices.length === 0) {
            organizedFP["info"] = fpBlocks;
        } else {
            organizedFP["info"] = fpBlocks.slice(0, stateHeaderIndices[0]);
            // Group blocks by state header.
            for (let j = 0; j < stateHeaderIndices.length; j++) {
                const headerIndex = stateHeaderIndices[j];
                const headerTitle = fpBlocks[headerIndex].lines[0];
                const standardizedHeader = standardizeKey(headerTitle); // Standardize header
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
 *   - A list of Flexibility Points with their names, addresses (if found), and action sections.
 *
 * @param {Object} organizedData - The organized JSON structure.
 * @returns {Object} - The summary JSON data.
 */
export function createSummaryJson(organizedData) {
    const summary = {
        "Subscriber address": (organizedData["Service Configurations"][standardizeKey("Subscriber address:")] || ""),
        "LID": (organizedData["Service Configurations"][standardizeKey("Service ID:")] || ""),
        "Flexibility Points": []
    };

    const fpEntries = organizedData["Site Operations"]["Flexibility Points"];
    for (const fpTitle in fpEntries) {
        const fpData = fpEntries[fpTitle];
        const fpSummary = {
            "name": fpTitle,
            "address": "",
            "actions": {}
        };

        // Find address in info blocks.
        for (let i = 0; i < fpData.info.length; i++) {
            const block = fpData.info[i];
            const lines = Array.isArray(block) ? block : (block.lines || []);
            for (let j = 0; j < lines.length; j++) {
                if (lines[j].startsWith("Address") && j + 1 < lines.length) {
                    fpSummary["address"] = lines[j + 1];
                    break;
                }
            }
            if (fpSummary["address"]) break;
        }

        // Get state sections whose header contains "Add ", "Connect ", or "Remove ".
        for (const header in fpData.state_sections) {
            if (header.includes("Add") || header.includes("Connect") || header.includes("Remove")) {
                const actionContent = {};
                const section = fpData.state_sections[header];
                // Skip the header block (first block in the section)
                for (let i = 1; i < section.length; i++) {
                    const block = section[i];
                    const lines = Array.isArray(block) ? block : (block.lines || []);
                    if (lines.length > 0) {
                        if (lines[0].trim().endsWith(':')) {
                            const key = standardizeKey(lines[0]); // Standardize key
                            const value = (lines.length > 1) ? lines.slice(1).join("\n") : "";
                            actionContent[key] = value;
                        } else {
                            const noteContent = lines.join("\n");
                            if (!actionContent["Notes"]) {
                                actionContent["Notes"] = noteContent;
                            } else {
                                actionContent["Notes"] += "\n" + noteContent;
                            }
                        }
                    }
                }
                fpSummary["actions"][header] = actionContent;
            }
        }

        summary["Flexibility Points"].push(fpSummary);
    }

    return summary;
}

/**
 * Main processing function to organize and summarize JSON data.
 *
 * @param {Object} jsonData - The raw JSON data from PDF conversion.
 * @returns {Object} - Processed summary data.
 */
export function processJsonData(jsonData) {
    const organizedData = organizeJson(jsonData);
    const summaryData = createSummaryJson(organizedData);
    return summaryData;
}
