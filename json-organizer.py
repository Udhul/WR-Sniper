import json

DEFAULT_TEST_PATH = "D:\Projects\AI\WR-Dataset\pdf\P-01338126-WR.json"


def load_json(file_path: str) -> dict:
    with open(file_path, 'r') as file:
        return json.load(file)

def find_block_num_with_keyword(blocks, keyword, keys_only=True, exact_match=False) -> int:
    for i, block in enumerate(blocks):
        lines = block.get("lines", [])
        if keys_only:
            key = block[0]
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
    organized_data = {"Service Configurations": {},
                      "Site Operations": {}
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
    for key in line_keys:
        block_num = find_block_num_with_keyword(sc_blocks, key)
        if block_num is None:
            continue
        line_key = sc_blocks[block_num]["lines"][0]
        line_values = sc_blocks[block_num]["lines"][1:]
        line_value = "\n".join(line_values)
        if line_value:
            organized_data["Service Configurations"][line_key] = line_value

    # --- SITE OPERATIONS
    # Find blocks under Site Operations
    so_start_block_no = find_block_num_with_keyword(blocks, "Site Operations")
    try:
        so_end_block_no = find_block_num_with_keyword(blocks, "file://") - 1
    except:
        so_end_block_no = len(blocks) - 1
    so_blocks = blocks[so_start_block_no:so_end_block_no]

    # Split into flexibility points
    fp_blocks = []
    for block in so_blocks:
        new_flexibility_point_start_block_num = find_block_num_with_keyword(so_blocks, "Flexibility Point")
        if new_flexibility_point_start_block_num is None:
            fp_blocks.append(block)
        else:
            fp_blocks.append(block[:new_flexibility_point_start_block_num])
            break

    return organized_data
