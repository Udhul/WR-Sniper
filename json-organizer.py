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
                line_values = block["lines"][1:]
                line_value = "\n".join(line_values)  # Join all line values into one string
                
                if line_value:
                    organized_data["Service Configurations"][line_key] = line_value
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
            fp_title = str(so_blocks[fp_index]["lines"][1])  # Use line value as this holds the name
            if not fp_title:
                fp_title = str(i)
        except:
            fp_title = str(i) # Use index as fallback
        
        # Determine the end index for this flexibility point
        end_index = fp_indices[i+1] if i+1 < len(fp_indices) else len(so_blocks)
        
        # Get all blocks for this flexibility point
        fp_blocks = so_blocks[fp_index:end_index]
        
        # Store the blocks in the organized data
        organized_data["Site Operations"]["Flexibility Points"][fp_title] = fp_blocks
    
    return organized_data

if __name__ == "__main__":
    json_data = load_json(DEFAULT_TEST_PATH)
    organized_data = organize_json(json_data)

    print(json.dumps(organized_data, indent=4, ensure_ascii=False))


