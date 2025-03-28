"""
PDF to JSON Converter Module

This module converts PDF documents to structured JSON format for annotation and analysis.
It preserves text line structure, positions, and raw content while handling batch processing.

Key features:
- Extract text content from PDFs with position data
- Convert individual files or recursively process directories
- Skip files with reserved names (e.g., 'index', 'config')
- Configurable output locations and overwrite behavior
- Comprehensive logging of processing activities

Usage:
    - As a CLI tool: `python pdf_converter.py [path] [options]`
    - As a library: Import PDFConverter class and use process_file/process_directory

The output JSON contains:
- metadata: file information and processing details
- content: structured text lines with position data and raw text
- annotations: placeholder for future labeling
"""

import json
from pathlib import Path
import datetime
import hashlib
from typing import Dict, List, Optional, Union, Tuple
import logging
import fitz  # PyMuPDF for text extraction
from fitz import Document, Page
from tqdm import tqdm

import pdf_converter # Use the functions from local module pdf_converter.py

# File names which overlap with system files in the destination folder
DISALLOWED_FILE_NAMES = ["index", "config", "db", "log", "error", "temp", "backup", "label", "labels", "json"]

def setup_logging(log_dir: Union[str, Path]):
    """
    Configure logging to file and console.
    
    Args:
        log_dir: Directory where log files will be saved
    """
    log_dir = Path(log_dir)
    log_dir.mkdir(exist_ok=True, parents=True)
    
    # Get list of existing log files
    existing_logs = list(log_dir.glob("pdf_processing_*.log"))
    
    # Sort by creation/modification time (oldest first)
    existing_logs.sort(key=lambda f: f.stat().st_mtime)
    
    # Remove oldest logs if we have 5 or more
    max_logs = 5
    while len(existing_logs) >= max_logs:
        oldest_log = existing_logs.pop(0)
        oldest_log.unlink()  # Delete the file
        
    log_file = log_dir / f"pdf_processing_{datetime.datetime.now().strftime('%Y%m%d_%H%M%S')}.log"
    
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        handlers=[
            logging.FileHandler(log_file),
            logging.StreamHandler()
        ]
    )
    return logging.getLogger("PDFConverter")

class PDFConverter:
    """
    Converts PDF files to structured JSON format that is suitable for annotation.
    Extracts text by line.
    """
    
    def __init__(self, output_dir: Union[str, Path] = None, overwrite: bool = False):
        """
        Initialize the PDF converter.
        
        Args:
            output_dir: Optional directory where JSON files will be saved.
                        If None, JSONs won't be automatically saved.
            overwrite: Whether to overwrite existing JSON files (default: False)
        """
        self.output_dir = Path(output_dir) if output_dir else None
        self.overwrite = overwrite
        
        if self.output_dir:
            self.output_dir.mkdir(exist_ok=True, parents=True)
    
    def extract_text_from_pdf(self, pdf_path: Path) -> Tuple[List[Dict], str]:
        """
        Extract text content from PDF using pdf_converter.extract_text_from_pdf_path
        
        Args:
            pdf_path: Path to PDF file
                
        Returns:
            List of dictionaries containing text blocks and their positions
            String containing all the raw text in the pdf file
        """
        try:
            return pdf_converter.extract_text_from_pdf_path(pdf_path)
        except Exception as e:
            logger.error(f"Error extracting text from {pdf_path}: {e}")
            raise

    def convert_pdf_to_json(self, pdf_path: Path, base_dir: Path = None) -> Dict:
        """
        Convert a PDF file to a structured JSON format.
        
        Args:
            pdf_path: Path to the PDF file
            base_dir: Optional base directory for calculating relative file paths
                
        Returns:
            Dictionary containing structured PDF content
        """
        try:
            # Extract file metadata
            with open(pdf_path, 'rb') as f:
                file_hash = hashlib.sha256(f.read()).hexdigest()
            
            # Calculate relative path if base_dir is provided
            if base_dir:
                try:
                    file_path = str(pdf_path.relative_to(base_dir))
                except ValueError:
                    file_path = str(pdf_path)
            else:
                file_path = str(pdf_path)
            
            # Extract text content with blocks and positions preserved
            document_blocks, document_raw_text = self.extract_text_from_pdf(pdf_path)
            
            # Create metadata dictionary
            metadata = {
                "filename": pdf_path.name,
                "file_path": file_path,
                "file_hash": file_hash,
            }
            
            # Use the shared function to create the JSON structure
            return pdf_converter.create_json_structure(document_blocks, document_raw_text, metadata)
        
        except Exception as e:
            logger.error(f"Error converting {pdf_path} to JSON: {e}")
            raise

    # def extract_text_from_pdf(self, pdf_path: Path) -> Tuple[List[Dict], str]:
    #     """
    #     Extract text content from PDF, preserving line breaks.
        
    #     Args:
    #         pdf_path: Path to PDF file
            
    #     Returns:
    #         List of dictionaries containing text lines and their positions
    #         String containing all the raw text in the pdf file, concatenated using newline character '\n'.
    #     """
    #     document_blocks: List[Dict] = []

    #     try:
    #         # Open the PDF with PyMuPDF
    #         doc:Document = fitz.open(str(pdf_path))

    #         # Process each page, storing blocks
    #         for page_num, page in enumerate(doc):
    #             page:Page
                
    #             # Get text blocks with position information
    #             blocks = page.get_text("blocks")

    #             # Process each block
    #             for block in blocks:
    #                 text = block[4].strip("\n") # Block text in one string (strip beginning and ending newlines)
    #                 current_block_dict = {
    #                     "page": page_num + 1,
    #                     "lines": text.split("\n"),
    #                     # "text": text,
    #                     "position": block[:4],
    #                     # "table": {} # To be populated by blocks with multiple lines (they correspond to a table in the original pdf)
    #                 }
    #                 # texts = text.split("\n") # Create a list of lines from the block text
    #                 # if len(texts) > 1:
    #                 #     current_block_dict["table"] = {
    #                 #         "key": texts[0], # First cell in the table row (key, explains the subject of the cell data)
    #                 #         "value": texts[1], # second list item (for this pdf dataset, there would normally only be two table cells in a table row)
    #                 #         "values": texts[1:] # In case there are more than 2 cells, all value cells can be accessed here
    #                 #     } # TODO: Maybe make the table "value" just be either a str or list depending on whether there are multiple value cells, and drop "values" as it create repeated data storage
    #                 document_blocks.append(current_block_dict)
            
    #         # Sort blocks by page, then by y-coordinate (position[1]), then by x-coordinate (position[0])
    #         def sort_key(block):
    #             page = block.get("page", 0)
    #             position = block.get("position")
    #             # If position is available, use y-coordinate (position[1]) and x-coordinate (position[0])
    #             if position:
    #                 return (page, position[1], position[0])
    #             else:
    #                 logger.error(f"Missing position information for block: {block}")
    #                 return (page, 0, 0)
            
    #         # Sort document blocks
    #         document_blocks.sort(key=sort_key)

    #         # Set block numbers after sorting
    #         for block_index, block in enumerate(document_blocks):
    #             block["block_index"] = block_index

    #         # Build document_raw_text from blocks text lines
    #         document_raw_text = ""
    #         for block in document_blocks:
    #             document_raw_text += "\n".join(t for t in block["texts"]) + "\n"
    #         document_raw_text = document_raw_text.rstrip("\n")
                
    #         doc.close()
    #         logger.info(f"Extracted {len(document_blocks)} text blocks from {pdf_path}")
    #     except Exception as e:
    #         logger.error(f"Error extracting text from {pdf_path}: {e}")
        
    #     return document_blocks, document_raw_text

    # def convert_pdf_to_json(self, pdf_path: Path, base_dir: Path = None) -> Dict:
    #     """
    #     Convert a PDF file to a structured JSON format.
        
    #     Args:
    #         pdf_path: Path to the PDF file
    #         base_dir: Optional base directory for calculating relative file paths
            
    #     Returns:
    #         Dictionary containing structured PDF content
    #     """
    #     try:
    #         # Extract file metadata
    #         file_hash = hashlib.sha256(open(pdf_path, 'rb').read()).hexdigest()
    #         filename = pdf_path.name
            
    #         # Calculate relative path if base_dir is provided
    #         if base_dir:
    #             try:
    #                 file_path = str(pdf_path.relative_to(base_dir))
    #             except ValueError:
    #                 file_path = str(pdf_path)
    #         else:
    #             file_path = str(pdf_path)
            
    #         # Extract text content with line breaks preserved
    #         document_blocks, document_raw_text = self.extract_text_from_pdf(pdf_path)
            
    #         # Create JSON structure
    #         json_data = {
    #             "metadata": {
    #                 "filename": filename,
    #                 "file_path": file_path,
    #                 "file_hash": file_hash,
    #                 "processed_date": datetime.datetime.now().isoformat(),
    #                 "page_count": len(set(block["page"] for block in document_blocks)) if document_blocks else 0,
    #             },
    #             "content": {
    #                 "lines": document_blocks,
    #                 "raw": document_raw_text
    #             },
    #             "annotations": {
    #                 "labeled": False,
    #                 "relevant_lines": [],
    #                 "extracted_data": {}
    #             }
    #         }
            
    #         return json_data
        
    #     except Exception as e:
    #         logger.error(f"Error converting {pdf_path} to JSON: {e}")
    #         raise
    
    def save_json(self, json_data: Dict, file_id: str) -> Path:
        """
        Save JSON data to file.
        
        Args:
            json_data: JSON data to save
            file_id: ID for the file (used for filename)
            
        Returns:
            Path to the saved JSON file
        """
        if not self.output_dir:
            raise ValueError("Output directory not set.")
        
        json_path = self.output_dir / f"{file_id}.json"
        with open(json_path, 'w', encoding='utf-8') as f:
            json.dump(json_data, f, indent=2, ensure_ascii=False)
        
        return json_path
    
    def process_file(self, pdf_path: Path, base_dir: Path = None, save: bool = True) -> Optional[Dict]:
        """
        Process a single PDF file and convert to JSON.
        
        Args:
            pdf_path: Path to the PDF file
            base_dir: Optional base directory for calculating relative paths
            save: Whether to save the JSON file
            
        Returns:
            The JSON data as a dictionary or None if skipped
        """
        logger.info(f"Processing PDF file: {pdf_path}")
        
        # Check if output file already exists
        if save and self.output_dir:
            file_id = pdf_path.stem
            json_path = self.output_dir / f"{file_id}.json"
            
            if json_path.exists() and not self.overwrite:
                logger.info(f"Skipping {pdf_path} - output file {json_path} already exists")
                return None
        
        try:
            # Convert PDF to JSON
            json_data = self.convert_pdf_to_json(pdf_path, base_dir)
            
            # Save if requested
            if save and self.output_dir:
                file_id = pdf_path.stem
                self.save_json(json_data, file_id)
                logger.info(f"Saved JSON for {pdf_path} as {file_id}.json")
            
            return json_data
        
        except Exception as e:
            logger.error(f"Failed to process {pdf_path}: {e}")
            raise
    
    def process_directory(self, 
                        pdf_dir: Union[str, Path], 
                        recursive: bool = True, 
                        limit: Optional[int] = None) -> List[Tuple[Path, str]]:
        """
        Process all PDF files in a directory.
        
        Args:
            pdf_dir: Directory containing PDF files
            recursive: Whether to search subdirectories
            limit: Maximum number of files to process
            
        Returns:
            List of (file_path, success) tuples
        """
        pdf_dir = Path(pdf_dir)
        
        # Find all PDF files
        pattern = "**/*.pdf" if recursive else "*.pdf"
        pdf_files = list(pdf_dir.glob(pattern))
        
        if limit:
            pdf_files = pdf_files[:limit]
        
        logger.info(f"Found {len(pdf_files)} PDF files in {pdf_dir}")
        
        # Process each file
        results = []
        skipped = 0
        for pdf_path in tqdm(pdf_files, desc="Converting PDFs to JSON"):
            try:
                result = self.process_file(pdf_path, base_dir=pdf_dir)
                if result is None:  # File was skipped
                    skipped += 1
                    results.append((pdf_path, "skipped"))
                else:
                    results.append((pdf_path, "success"))
            except Exception:
                results.append((pdf_path, "failed"))
        
        # Summarize results
        successful = [r for r in results if r[1] == "success"]
        failed = [r for r in results if r[1] == "failed"]
        
        logger.info(f"Successfully processed {len(successful)} out of {len(results)} PDF files")
        logger.info(f"Failed: {len(failed)}, Skipped (already exist): {skipped}")
        
        return results

def detect_files_to_process(base_dir: Path, input_path: Path, recursive: bool = False) -> List[Path]:
    """
    Detect the set of PDF files to process based on the base directory and input path.
    
    Args:
        base_dir: Base directory which may contain PDF files
        input_path: Specified input path (file or directory)
        recursive: Whether to search subdirectories of input_path
    
    Returns:
        List of PDF file paths to process (with duplicates removed)
    """
    pdf_files = []
    
    # Case 1: Input path is a specific PDF file
    if input_path.is_file():
        if input_path.suffix.lower() == '.pdf':
            if input_path.stem.lower() in DISALLOWED_FILE_NAMES:
                logger.error(f"Error: '{input_path.stem}.pdf' uses a reserved filename. Please rename this file.")
                print(f"ERROR: '{input_path.stem}.pdf' uses a reserved filename. Please rename this file to continue.")
                return []
            return [input_path]
        else:
            logger.error(f"Error: {input_path} is not a PDF file")
            return []
    
    # Track processed files to avoid duplicates
    processed_files = set()
    
    # Case 2: Process PDFs in base_dir (only if it exists and input_path is not the same as base_dir)
    if base_dir.exists() and base_dir != input_path:
        logger.info(f"Looking for PDF files in base directory: {base_dir}")
        base_pdf_files = [f for f in base_dir.glob("*.pdf") if f.is_file()]
        
        # Filter out files with disallowed names
        disallowed_files = [f for f in base_pdf_files if f.stem.lower() in DISALLOWED_FILE_NAMES]
        for f in disallowed_files:
            logger.error(f"Skipping '{f.name}' - filename '{f.stem}' is reserved for system files. Please rename the file.")
            print(f"ERROR: '{f.name}' uses a reserved filename. Please rename this file to continue.")
        
        base_pdf_files = [f for f in base_pdf_files if f.stem.lower() not in DISALLOWED_FILE_NAMES]
        
        if base_pdf_files:
            logger.info(f"Found {len(base_pdf_files)} PDF files in base directory")
            pdf_files.extend(base_pdf_files)
            processed_files.update(base_pdf_files)
    
    # Case 3: Process PDFs in input directory (if it exists and is a directory)
    if input_path.exists() and input_path.is_dir():
        logger.info(f"Looking for PDF files in input directory: {input_path}")
        
        # Find all PDF files in the input directory
        pattern = "**/*.pdf" if recursive else "*.pdf"
        input_pdf_files = list(input_path.glob(pattern))
        
        # Filter out files with disallowed names
        disallowed_files = [f for f in input_pdf_files if f.stem.lower() in DISALLOWED_FILE_NAMES]
        for f in disallowed_files:
            logger.error(f"Skipping '{f.name}' - filename '{f.stem}' is reserved for system files. Please rename the file.")
            print(f"ERROR: '{f.name}' uses a reserved filename. Please rename this file to continue.")
        
        input_pdf_files = [f for f in input_pdf_files if f.stem.lower() not in DISALLOWED_FILE_NAMES]
        
        if input_pdf_files:
            logger.info(f"Found {len(input_pdf_files)} PDF files in input directory")
            
            # Add only files that haven't been processed yet
            new_files = [f for f in input_pdf_files if f not in processed_files]
            pdf_files.extend(new_files)
    
    elif not input_path.exists():
        logger.error(f"Error: {input_path} does not exist")
        print(f"Creating input directory: {input_path}")
        input_path.mkdir(parents=True, exist_ok=True)
    
    return pdf_files

def main():
    """Main entry point for the CLI"""
    import argparse
    
    parser = argparse.ArgumentParser(description="Convert PDF files to structured JSON format")
    parser.add_argument("path", nargs="?", help="Path to a PDF file or a directory. If directory, interpreted as base-dir if --base-dir is not set, otherwise as input directory")
    parser.add_argument("--base-dir", "-d", help="Base dataset directory (default: 'dataset')")
    parser.add_argument("--input", "-i", help="Input PDF file or directory (default: {base-dir}/pdf)")
    parser.add_argument("--output", "-o", help="Output directory for JSON files (default: {base-dir}/converted)")
    parser.add_argument("--log-dir", help="Directory for log files (default: {base-dir}/log)")
    parser.add_argument("--recursive", "-r", action="store_true", help="Recursively process directories")
    parser.add_argument("--limit", "-l", type=int, help="Limit number of files to process")
    parser.add_argument("--overwrite", action="store_true", help="Overwrite existing JSON files")
    
    args = parser.parse_args()
    
    # Handle the unnamed argument logic
    if args.path:
        path = Path(args.path)
        
        if path.is_file() and path.suffix.lower() == '.pdf':
            # If path is a PDF file, always use it as input file
            args.input = str(path)
        elif path.is_dir():
            # If path is a directory and base-dir is not set, use as base-dir
            if not args.base_dir:
                args.base_dir = str(path)
            # Otherwise, use as input directory
            else:
                args.input = str(path)
    
    # Set up directory structure
    base_dir = Path(args.base_dir) if args.base_dir else Path("dataset")
    
    # Define default paths if not specified
    input_path = Path(args.input) if args.input else base_dir / "pdf"
    output_dir = Path(args.output) if args.output else base_dir / "converted"
    log_dir = Path(args.log_dir) if args.log_dir else base_dir / "log"
    
    # Set up logging
    global logger
    logger = setup_logging(log_dir)
    
    logger.info(f"Base directory: {base_dir}")
    logger.info(f"Input path: {input_path}")
    logger.info(f"Output directory: {output_dir}")
    logger.info(f"Log directory: {log_dir}")
    logger.info(f"Overwrite existing files: {args.overwrite}")
    
    # Create converter and process files
    converter = PDFConverter(output_dir=output_dir, overwrite=args.overwrite)
    
    # Detect files to process
    pdf_files_to_process = detect_files_to_process(base_dir, input_path, args.recursive)
    
    # Apply limit if specified
    if args.limit and len(pdf_files_to_process) > args.limit:
        logger.info(f"Limiting to {args.limit} files (out of {len(pdf_files_to_process)} detected)")
        pdf_files_to_process = pdf_files_to_process[:args.limit]
    
    if not pdf_files_to_process:
        logger.info("No PDF files found to process")
        return
    
    # Process files
    results = []
    for pdf_path in tqdm(pdf_files_to_process, desc="Converting PDFs to JSON"):
        try:
            result = converter.process_file(pdf_path, base_dir=base_dir)
            status = "skipped" if result is None else "success"
            results.append((pdf_path, status))
        except Exception as e:
            logger.error(f"Failed to process {pdf_path}: {e}")
            results.append((pdf_path, "failed"))
    
    # Summarize results
    success_count = sum(1 for _, status in results if status == "success")
    skipped_count = sum(1 for _, status in results if status == "skipped")
    failed_count = sum(1 for _, status in results if status == "failed")
    
    logger.info(f"Processed {len(results)} PDF files in total:")
    logger.info(f"  - Successfully converted: {success_count}")
    logger.info(f"  - Skipped (already exist): {skipped_count}")
    logger.info(f"  - Failed: {failed_count}")
    
    if success_count > 0:
        logger.info(f"Output saved to {output_dir}")

if __name__ == "__main__":
    main()


# TODO and Awareness:
# Make onefile compiled executable that can be used with CLI/API from another app, which packs all the necessary dependencies. Input pdf, output json

# Done:
# Update line and block extraction, to ensure they follow the best and most consistent approach. Maybe blocks alone can be used to infer lines, instead of splitting lines by \n first.
# Order lines by page, then by first y-coordinate, then by first x-coordinate. Update/set line numbers according to this sorting
# Skip disallowed names
# Unnamed argument logic interpreted as input file if PDF, base directory if directory, unless --base-dir is set, then the dir is interpreted as input-dir
# Skip existing files unless --overwrite is set.
# limit log files to 5
# Add one raw text key to the json, which contains all the lines in one string, using newline seperator "\n" for each line.