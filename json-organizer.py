import json

DEFAULT_TEST_PATH = "D:\Projects\AI\WR-Dataset\pdf\P-01338126-WR.json"


def load_json(file_path: str) -> dict:
    with open(file_path, 'r', encoding='utf-8') as file:
        return json.load(file)


def find_block_num_with_keyword(blocks, keyword, keys_only=True, exact_match=False) -> int:
    for i, block in enumerate(blocks):
        lines = block.get("lines", [])
        if keys_only:
            # Ensure 'lines' exist and access first line safely
            if lines and len(lines) > 0:
                key = lines[0]
                if exact_match and key == keyword:
                    return i
                elif not exact_match and keyword in key:
                    return i
        else:
            for line in lines:
                if exact_match and keyword == line:
                    return i
                elif not exact_match and keyword in line:
                    return i
    return None


def standardize_key(key: str) -> str:
    """
    Standardize a key by removing spaces, newlines, and colons.
    """
    # Remove colons, strip spaces and newlines
    return key.strip().rstrip(":").strip()


def organize_json(json_data: dict) -> dict:
    organized_data = {
        "Service Configurations": {},
        "Site Operations": {
            "Flexibility Points": {}
        }
    }

    content = json_data.get("content", {})
    blocks = content.get("blocks", [])

    # --- SERVICE CONFIGURATIONS
    # Find blocks under Service Configurations
    sc_start_block_no = find_block_num_with_keyword(blocks, "Service Configurations")
    sc_end_block_no = find_block_num_with_keyword(blocks, "Site Operations") - 1
    sc_blocks = blocks[sc_start_block_no:sc_end_block_no]

    # Find blocks with lines that have relevant keys: 
    line_keys = ["Subscriber address:", "Service ID:"]
    found_keys = set()  # Track which keys are found

    for block_index, block in enumerate(sc_blocks):
        if len(found_keys) == len(line_keys):
            # All keys have been found, stop searching
            break
            
        for key in line_keys:
            if key in found_keys:
                # Skip keys we've already found
                continue
                
            if block["lines"] and key in block["lines"][0] and len(block["lines"]) > 1:
                line_key = block["lines"][0]  # Get exact full line key
                standardized_key = standardize_key(line_key)  # Standardize the key
                line_values = block["lines"][1:]
                line_value = "\n".join(line_values)  # Join all line values into one string
                
                if line_value:
                    organized_data["Service Configurations"][standardized_key] = line_value
                    found_keys.add(key)
                    
                    # If we've found all keys, break out of this inner loop
                    if len(found_keys) == len(line_keys):
                        break

    # --- SITE OPERATIONS
    # Find blocks under Site Operations
    so_start_block_no = find_block_num_with_keyword(blocks, "Site Operations")
    try:
        so_end_block_no = find_block_num_with_keyword(blocks, "file://") - 1
    except:
        so_end_block_no = len(blocks) - 1
    so_blocks = blocks[so_start_block_no:so_end_block_no]

    # Find all blocks starting with "Flexibility Point"
    fp_indices = []
    for i, block in enumerate(so_blocks):
        if block.get("lines") and "Flexibility point" in block["lines"][0]: # Only check line key
            fp_indices.append(i)
    
    # If no flexibility points found, return the organized data as is
    if not fp_indices:
        print(f"No flexibility points found. so blocks: {len(so_blocks)}, sc blocks: {len(sc_blocks)}")
        return organized_data
    
    # Group blocks by flexibility point
    for i, fp_index in enumerate(fp_indices):
        # Get the title of this flexibility point (second line 'value' of the block)
        try:
            fp_title = str(so_blocks[fp_index]["lines"][1])  # Use second line as the title
            if not fp_title:
                fp_title = f"Flexibility Point {i+1}"
        except:
            fp_title = f"Flexibility Point {i+1}"  # Fallback title
        
        # Determine the end index for this flexibility point
        end_index = fp_indices[i+1] if i+1 < len(fp_indices) else len(so_blocks)
        
        # Get all blocks for this flexibility point
        fp_blocks = so_blocks[fp_index:end_index]
        
        # Organize blocks within this flexibility point by state headers
        organized_fp = {
            "info": [],  # Blocks before the first state header
            "state_sections": {}  # Sections grouped by state headers
        }
        
        # Find state headers within this flexibility point
        state_header_indices = []
        for j, block in enumerate(fp_blocks):
            # A state header has only one line and x-coordinate start point > 80
            if (len(block.get("lines", [])) == 1 and 
                block.get("position", [0])[0] > 80):
                state_header_indices.append(j)
        
        # If no state headers, all blocks go to "info"
        if not state_header_indices:
            organized_fp["info"] = fp_blocks
        else:
            # Add blocks before first state header to "info"
            organized_fp["info"] = fp_blocks[:state_header_indices[0]]
            
            # Group blocks by state header
            for j, header_index in enumerate(state_header_indices):
                # Get the state header title
                header_title = fp_blocks[header_index]["lines"][0]
                standardized_header = standardize_key(header_title)  # Standardize the header title
                
                # Determine the end index for this section
                section_end = state_header_indices[j+1] if j+1 < len(state_header_indices) else len(fp_blocks)
                
                # Get blocks for this section (including the header block)
                section_blocks = fp_blocks[header_index:section_end]
                
                # Store in the organized structure
                organized_fp["state_sections"][standardized_header] = section_blocks
        
        # Store this organized flexibility point
        organized_data["Site Operations"]["Flexibility Points"][fp_title] = organized_fp
    
    return organized_data


def create_summary_json(organized_data):
    """
    Create a simplified summary of the organized data showing:
    - Flexibility point names and addresses
    - State sections containing "Add ", "Connect ", or "Remove " in their headers, 
      with content organized as key-value pairs
    """

    summary = {
        # Add top level Service Config info - Use standardized keys
        "Subscriber address": organized_data.get("Service Configurations", {}).get(standardize_key("Subscriber address: "), ""),
        "LID": organized_data.get("Service Configurations", {}).get(standardize_key("Service ID: "), ""),
        # Prepare Flexibility Points list
        "Flexibility Points": []
    }
    
    # Go through each flexibility point
    for fp_title, fp_data in organized_data["Site Operations"]["Flexibility Points"].items():
        fp_summary = {
            "name": fp_title,
            "address": "",
            "actions": {}
        }
        
        # Find address in info blocks
        for block in fp_data.get("info", []):
            # Check if this is a list of lines or a block with lines
            lines = block if isinstance(block, list) else block.get("lines", [])
            
            # Look for address line
            for i, line in enumerate(lines):
                if line.startswith("Address: ") and i+1 < len(lines):
                    fp_summary["address"] = lines[i+1]
                    break
        
        # Get relevant state sections (Add, Connect, Remove)
        for header, section in fp_data.get("state_sections", {}).items():
            if any(keyword in header for keyword in ["Add", "Connect", "Remove"]):
                # Initialize a dictionary for this action's content
                action_content = {}
                
                # Skip the first block as that's the header itself
                for block in section[1:]:
                    # Check if this is a list of lines
                    lines = block if isinstance(block, list) else block.get("lines", [])
                    
                    if lines:
                        # If the first line ends with a colon, treat it as a key-value pair
                        if lines[0].rstrip().endswith(':'):
                            key = standardize_key(lines[0])  # Standardize the key
                            value = "\n".join(lines[1:]) if len(lines) > 1 else ""
                            action_content[key] = value
                        else:
                            # For lines without a key format, use the whole content as a value
                            # with a generic key or append to a "notes" field
                            note_content = "\n".join(lines)
                            if "Notes" not in action_content:
                                action_content["Notes"] = note_content
                            else:
                                action_content["Notes"] += "\n" + note_content
                
                # Add the organized content to the actions dictionary
                fp_summary["actions"][header] = action_content
        
        # Add to summary
        summary["Flexibility Points"].append(fp_summary)
    
    return summary


def clean_structure(organized_data):
    """
    Clean the block structures by replacing each block with just its lines.
    """
    # Clean Service Configurations (no blocks to clean here)
    
    # Clean Site Operations - Flexibility Points
    for fp_title, fp_data in organized_data["Site Operations"]["Flexibility Points"].items():
        # Clean info blocks
        fp_data["info"] = [block.get("lines", []) for block in fp_data.get("info", [])]
        
        # Clean state sections
        for state_header, state_blocks in fp_data.get("state_sections", {}).items():
            fp_data["state_sections"][state_header] = [block.get("lines", []) for block in state_blocks]
    
    return organized_data

# Test
if __name__ == "__main__":
    json_data = load_json(DEFAULT_TEST_PATH)
    organized_data = organize_json(json_data)
    # cleaned_data = clean_structure(organized_data)
    summary_data = create_summary_json(organized_data)

    # Print the summary
    print(json.dumps(summary_data, indent=4, ensure_ascii=False))

