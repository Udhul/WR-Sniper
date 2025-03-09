"""
Single PDF to JSON Converter API

A simplified version of the PDF converter that converts a PDF to JSON.
This script can be used as a command-line tool, API, or background service.

Features:
- Process PDF from file path or memory buffer
- Return JSON data or save to file
- Standalone executable with no external dependencies
- Silent operation mode for background processing
"""

import sys
import json
import datetime
import hashlib
import io
from pathlib import Path
import fitz  # PyMuPDF for text extraction
from typing import Dict, List, Tuple, Union, Optional, Any


def extract_text_from_pdf_doc(doc: fitz.Document, filename: str = "unknown.pdf") -> Tuple[List[Dict], str]:
    """
    Extract text content from an open PDF document.
    
    Args:
        doc: Open PyMuPDF document
        filename: Original filename for reference
        
    Returns:
        List of dictionaries containing text lines and their positions
        String containing all the raw text in the pdf file
    """
    document_blocks: List[Dict] = []
    document_raw_text = ""

    try:
        # Process each page, storing blocks
        for page_num, page in enumerate(doc):
            # Get text blocks with position information
            blocks = page.get_text("blocks")

            # Process each block
            for block in blocks:
                text = block[4].strip("\n")  # Block text in one string, stripping beginning and ending newlines
                current_block_dict = {
                    "page": page_num + 1,
                    "lines": text.split("\n"),
                    "position": block[:4],
                }
                document_blocks.append(current_block_dict)
        
        # Sort blocks by page, then by y-coordinate, then by x-coordinate
        def sort_key(block):
            page = block.get("page", 0)
            position = block.get("position")
            if position:
                return (page, position[1], position[0])
            else:
                return (page, 0, 0)
        
        # Sort document blocks
        document_blocks.sort(key=sort_key)

        # Set block numbers after sorting
        for block_num, block in enumerate(document_blocks, 1):
            block["line_num"] = block_num

        # Build document_raw_text from blocks
        for block in document_blocks:
            document_raw_text += "\n".join(block["lines"]) + "\n"
        document_raw_text = document_raw_text.rstrip("\n")
            
        if not is_silent_mode():
            print(f"Extracted {len(document_blocks)} text blocks from {filename}", file=sys.stderr)
    except Exception as e:
        if not is_silent_mode():
            print(f"Error extracting text from {filename}: {e}", file=sys.stderr)
        raise
    
    return document_blocks, document_raw_text


def extract_text_from_pdf_path(pdf_path: Path) -> Tuple[List[Dict], str]:
    """Extract text content from a PDF file."""
    try:
        doc = fitz.open(str(pdf_path))
        result = extract_text_from_pdf_doc(doc, filename=pdf_path.name)
        doc.close()
        return result
    except Exception as e:
        if not is_silent_mode():
            print(f"Error opening PDF from path {pdf_path}: {e}", file=sys.stderr)
        raise


def extract_text_from_pdf_bytes(pdf_bytes: bytes, filename: str = "memory.pdf") -> Tuple[List[Dict], str]:
    """Extract text content from PDF bytes in memory."""
    try:
        memory_stream = io.BytesIO(pdf_bytes)
        doc = fitz.open(stream=memory_stream, filetype="pdf")
        result = extract_text_from_pdf_doc(doc, filename=filename)
        doc.close()
        return result
    except Exception as e:
        if not is_silent_mode():
            print(f"Error opening PDF from memory: {e}", file=sys.stderr)
        raise


def create_json_structure(document_lines: List[Dict], document_raw_text: str, 
                          metadata: Dict[str, Any]) -> Dict:
    """
    Create the standardized JSON structure for PDF content.
    
    Args:
        document_lines: List of text blocks/lines with position data
        document_raw_text: Raw text content as a single string
        metadata: Dictionary containing file metadata
    
    Returns:
        Complete JSON structure
    """
    return {
        "metadata": {
            **metadata,
            "processed_date": datetime.datetime.now().isoformat(),
            "page_count": len(set(block["page"] for block in document_lines)) if document_lines else 0,
        },
        "content": {
            "lines": document_lines,
            "raw": document_raw_text
        },
        "annotations": {
            "labeled": False,
            "relevant_lines": [],
            "extracted_data": {}
        }
    }


def save_json_output(json_data: Dict, output_path: Union[str, Path]) -> None:
    """
    Save JSON data to the specified output path.
    
    Args:
        json_data: The JSON data to save
        output_path: Where to save the JSON file
    """
    output_path = Path(output_path)
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(json_data, f, indent=2, ensure_ascii=False)
    if not is_silent_mode():
        print(f"Saved JSON output to {output_path}", file=sys.stderr)


def convert_pdf_from_path(pdf_path: Union[str, Path], save_output: bool = False, 
                         output_path: Optional[str] = None) -> Dict:
    """
    Convert a PDF file to a structured JSON format.
    
    Args:
        pdf_path: Path to the PDF file
        save_output: Whether to save the output to a file
        output_path: Path where to save the JSON output if save_output is True
            
    Returns:
        Dictionary containing structured PDF content
    """
    pdf_path = Path(pdf_path)
    
    try:
        # Extract file metadata
        with open(pdf_path, 'rb') as f:
            file_hash = hashlib.md5(f.read()).hexdigest()
        
        # Extract text content
        document_lines, document_raw_text = extract_text_from_pdf_path(pdf_path)
        
        # Create metadata dictionary
        metadata = {
            "filename": pdf_path.name,
            "file_path": str(pdf_path),
            "file_hash": file_hash,
        }
        
        # Create JSON structure
        json_data = create_json_structure(document_lines, document_raw_text, metadata)
        
        # Save JSON if requested
        if save_output:
            # If output_path is not specified, use the same name with .json extension
            if not output_path:
                output_path = pdf_path.with_suffix('.json')
            else:
                output_path = Path(output_path)
                # If output is a directory, use it with the pdf filename
                if output_path.is_dir():
                    output_path = output_path / pdf_path.with_suffix('.json').name
            
            save_json_output(json_data, output_path)
        
        return json_data
    
    except Exception as e:
        if not is_silent_mode():
            print(f"Error converting {pdf_path} to JSON: {e}", file=sys.stderr)
        raise


def convert_pdf_from_bytes(pdf_bytes: bytes, filename: str = "memory.pdf", 
                          save_output: bool = False, output_path: Optional[str] = None) -> Dict:
    """
    Convert a PDF from memory bytes to a structured JSON format.
    
    Args:
        pdf_bytes: PDF content as bytes
        filename: Optional filename for reference
        save_output: Whether to save the output to a file
        output_path: Path where to save the JSON output if save_output is True
            
    Returns:
        Dictionary containing structured PDF content
    """
    try:
        # Extract file metadata
        file_hash = hashlib.md5(pdf_bytes).hexdigest()
        
        # Extract text content
        document_lines, document_raw_text = extract_text_from_pdf_bytes(pdf_bytes, filename)
        
        # Create metadata dictionary
        metadata = {
            "filename": filename,
            "file_path": "memory",
            "file_hash": file_hash,
        }
        
        # Create JSON structure
        json_data = create_json_structure(document_lines, document_raw_text, metadata)
        
        # Save JSON if requested
        if save_output and output_path:
            save_json_output(json_data, output_path)
        
        return json_data
    
    except Exception as e:
        if not is_silent_mode():
            print(f"Error converting PDF from memory to JSON: {e}", file=sys.stderr)
        raise


def is_silent_mode() -> bool:
    """Check if the program is running in silent mode."""
    return "--silent" in sys.argv


def read_binary_stdin() -> bytes:
    """Read binary data from stdin, handling potential protocol messages."""
    try:
        # For Chrome extension native messaging, message format includes 4-byte length prefix
        if "--native-messaging" in sys.argv:
            # Read the message length (first 4 bytes)
            length_bytes = sys.stdin.buffer.read(4)
            if len(length_bytes) == 4:
                # Unpack length as a uint32 (little-endian)
                message_length = int.from_bytes(length_bytes, byteorder='little')
                # Read the actual message
                return sys.stdin.buffer.read(message_length)
        
        # Standard binary input (full stdin)
        return sys.stdin.buffer.read()
    except Exception as e:
        if not is_silent_mode():
            print(f"Error reading from stdin: {e}", file=sys.stderr)
        return b''


def write_native_message(json_data: Dict) -> None:
    """Write JSON with appropriate format for Chrome native messaging."""
    message_bytes = json.dumps(json_data).encode('utf-8')
    # Write message length as uint32 (little-endian)
    sys.stdout.buffer.write(len(message_bytes).to_bytes(4, byteorder='little'))
    # Write the message
    sys.stdout.buffer.write(message_bytes)
    sys.stdout.buffer.flush()


def main():
    """Main entry point for the program"""
    
    # Handle --help flag
    if "--help" in sys.argv or "-h" in sys.argv:
        print("PDF to JSON Converter")
        print("Usage:")
        print("  pdf_converter_single.py input.pdf [output.json]")
        print("  cat input.pdf | pdf_converter_single.py --stdin [output.json]")
        print("  pdf_converter_single.py --stdin --silent")
        print("  pdf_converter_single.py --stdin --native-messaging")
        print("\nOptions:")
        print("  --silent          Run without console output messages")
        print("  --stdin           Read PDF from standard input")
        print("  --native-messaging Use Chrome extension native messaging format")
        if getattr(sys, 'frozen', False):
            input("Press Enter to exit...")
        return 0
    
    # Check for silent mode flag (this suppresses console output)
    silent_mode = is_silent_mode()
    
    # Check for native messaging format
    native_messaging = "--native-messaging" in sys.argv
    
    try:
        # Handle stdin mode (for processing bytes)
        if "--stdin" in sys.argv:
            # Read PDF data from stdin
            pdf_bytes = read_binary_stdin()
            if not pdf_bytes:
                if not silent_mode:
                    print("Error: No data received from stdin", file=sys.stderr)
                return 1
            
            output_path = None
            # Check if an output path was specified
            for i, arg in enumerate(sys.argv):
                if arg not in ["--stdin", "--silent", "--native-messaging"] and not arg.startswith("-") and i > 0:
                    output_path = arg
                    break
            
            # Process PDF bytes
            json_data = convert_pdf_from_bytes(
                pdf_bytes, 
                filename="stdin.pdf",
                save_output=bool(output_path), 
                output_path=output_path
            )
            
            # Output result
            if native_messaging:
                write_native_message(json_data)
            else:
                print(json.dumps(json_data))
            
            if not silent_mode:
                print("Conversion from stdin completed successfully.", file=sys.stderr)
            
        # Handle file path mode
        elif len(sys.argv) >= 2 and not sys.argv[1].startswith("-"):
            pdf_path = sys.argv[1]
            output_path = None
            
            # Find output path if specified
            for i, arg in enumerate(sys.argv[2:], 2):
                if not arg.startswith("-"):
                    output_path = arg
                    break
            
            # Process PDF file
            json_data = convert_pdf_from_path(
                pdf_path, 
                save_output=True, 
                output_path=output_path
            )
            
            # Output result
            if native_messaging:
                write_native_message(json_data)
            else:
                print(json.dumps(json_data))
            
            if not silent_mode:
                print("Conversion completed successfully.", file=sys.stderr)
            
        # No valid input specified
        else:
            if not silent_mode:
                print("Error: No input specified. Use --help for usage information.", file=sys.stderr)
            return 1
        
    except Exception as e:
        if not silent_mode:
            print(f"Error: {e}", file=sys.stderr)
        return 1
    
    # Wait for user input if run by double-clicking (unless in silent mode)
    if getattr(sys, 'frozen', False) and not silent_mode and not native_messaging:
        input("Press Enter to exit...")
    
    return 0


if __name__ == "__main__":
    sys.exit(main())
