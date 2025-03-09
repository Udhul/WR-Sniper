"""
Single PDF to JSON Converter

A simplified version of the PDF converter that converts a single PDF file to JSON.
This script is designed to be compiled into a standalone executable.

Usage:
    - Command line: pdf_converter_single.py input.pdf [output.json]
    - Drag and drop a PDF file onto the executable
"""

import sys
import json
import datetime
import hashlib
from pathlib import Path
import fitz  # PyMuPDF for text extraction
from typing import Dict, List, Tuple


def extract_text_from_pdf(pdf_path: Path) -> Tuple[List[Dict], str]:
    """
    Extract text content from PDF, preserving line breaks.
    
    Args:
        pdf_path: Path to PDF file
        
    Returns:
        List of dictionaries containing text lines and their positions
        String containing all the raw text in the pdf file
    """
    document_blocks: List[Dict] = []
    document_raw_text = ""

    try:
        # Open the PDF with PyMuPDF
        doc = fitz.open(str(pdf_path))

        # Process each page, storing blocks
        for page_num, page in enumerate(doc):
            # Get text blocks with position information
            blocks = page.get_text("blocks")

            # Process each block
            for block in blocks:
                text = block[4].strip("\n")  # Block text in one string
                current_block_dict = {
                    "page": page_num + 1,
                    "text": text,
                    "position": block[:4],
                    "table": {}  # To be populated by blocks with multiple lines
                }
                texts = text.split("\n")  # Create a list of lines from the block text
                if len(texts) > 1:
                    current_block_dict["table"] = {
                        "key": texts[0],
                        "value": texts[1],
                        "values": texts[1:]
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
            document_raw_text += block["text"] + "\n"
        document_raw_text = document_raw_text.rstrip("\n")
            
        doc.close()
        print(f"Extracted {len(document_blocks)} text blocks from {pdf_path}")
    except Exception as e:
        print(f"Error extracting text from {pdf_path}: {e}")
        raise
    
    return document_blocks, document_raw_text


def convert_pdf_to_json(pdf_path: Path) -> Dict:
    """
    Convert a PDF file to a structured JSON format.
    
    Args:
        pdf_path: Path to the PDF file
            
    Returns:
        Dictionary containing structured PDF content
    """
    try:
        # Extract file metadata
        file_hash = hashlib.md5(open(pdf_path, 'rb').read()).hexdigest()
        filename = pdf_path.name
        
        # Extract text content with line breaks preserved
        document_lines, document_raw_text = extract_text_from_pdf(pdf_path)
        
        # Create JSON structure
        json_data = {
            "metadata": {
                "filename": filename,
                "file_path": str(pdf_path),
                "file_hash": file_hash,
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
        
        return json_data
    
    except Exception as e:
        print(f"Error converting {pdf_path} to JSON: {e}")
        raise


def process_pdf(pdf_path: str, output_path: str = None) -> None:
    """
    Process a single PDF file and save the result to JSON.
    
    Args:
        pdf_path: Path to the PDF file
        output_path: Path where to save the JSON output. If None, will use the PDF name with .json extension
    """
    pdf_path = Path(pdf_path)
    
    if not pdf_path.exists():
        print(f"Error: File {pdf_path} does not exist.")
        return
    
    if pdf_path.suffix.lower() != '.pdf':
        print(f"Error: File {pdf_path} is not a PDF file.")
        return
    
    try:
        print(f"Processing PDF file: {pdf_path}")
        
        # If output_path is not specified, use the same name with .json extension
        if not output_path:
            output_path = pdf_path.with_suffix('.json')
        else:
            output_path = Path(output_path)
            # If output is a directory, use it with the pdf filename
            if output_path.is_dir():
                output_path = output_path / pdf_path.with_suffix('.json').name
        
        # Convert PDF to JSON
        json_data = convert_pdf_to_json(pdf_path)
        
        # Save JSON
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(json_data, f, indent=2, ensure_ascii=False)
        
        print(f"Successfully converted {pdf_path} to {output_path}")
    
    except Exception as e:
        print(f"Failed to process {pdf_path}: {e}")
        raise


def main():
    """Main entry point for the program"""
    
    if len(sys.argv) < 2:
        print("Usage: pdf_converter_single.py input.pdf [output.json]")
        print("  or drag and drop a PDF file onto the executable")
        # Wait for input before closing if this is run by double-clicking
        input("Press Enter to exit...")
        return
    
    pdf_path = sys.argv[1]
    output_path = sys.argv[2] if len(sys.argv) > 2 else None
    
    try:
        process_pdf(pdf_path, output_path)
    except Exception as e:
        print(f"Error: {e}")
    
    # If likely run by double clicking, wait for input before closing
    if getattr(sys, 'frozen', False):
        input("Press Enter to exit...")


if __name__ == "__main__":
    main()
