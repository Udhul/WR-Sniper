"""
PDF to JSON Converter Module

This module handles the conversion of PDF files to structured JSON format,
preserving text line structure.
"""

import json
from pathlib import Path
import datetime
import hashlib
from typing import Dict, List, Optional, Union, Tuple
import logging
import fitz  # PyMuPDF for text extraction
from tqdm import tqdm

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
    
    def __init__(self, output_dir: Union[str, Path] = None):
        """
        Initialize the PDF converter.
        
        Args:
            output_dir: Optional directory where JSON files will be saved.
                        If None, JSONs won't be automatically saved.
        """
        self.output_dir = Path(output_dir) if output_dir else None
        self.include_positions = True # For now, let's always include positions
        
        if self.output_dir:
            self.output_dir.mkdir(exist_ok=True, parents=True)
    
    def extract_text_from_pdf(self, pdf_path: Path) -> Tuple[List[Dict], str]:
        """
        Extract text content from PDF, preserving line breaks.
        
        Args:
            pdf_path: Path to PDF file
            
        Returns:
            List of dictionaries containing text lines and their positions
            String containing all the raw text in the pdf file, concatenated using newline character '\n'.
        """
        document_lines: List[Dict] = []
        document_raw_text: str = ""

        try:
            # Open the PDF with PyMuPDF
            doc = fitz.open(str(pdf_path))
            
            for page_num, page in enumerate(doc):
                # Get the text with line breaks preserved
                text = page.get_text("text")
                lines = text.split("\n")
                
                # Get text blocks with position information if needed
                blocks = page.get_text("blocks") if self.include_positions else []
                
                # Process each line
                for line_num, line in enumerate(lines):
                    line = line.strip()
                    if line:  # Skip empty lines
                        # Create the text block
                        text_line = {
                            "page": page_num + 1,
                            "line_num": line_num + 1,
                            "text": line
                        }
                        
                        # Add position data if requested
                        if self.include_positions:
                            position = None
                            for block in blocks:
                                if isinstance(block, tuple) and len(block) >= 5:
                                    block_text = block[4]
                                    if line in block_text:
                                        # Store position coordinates (x0, y0, x1, y1)
                                        position = block[:4]
                                        break
                            
                            if position:
                                text_line["position"] = position
                        
                        document_lines.append(text_line)
                document_raw_text += text + "\n"
            
            doc.close()
            logger.info(f"Extracted {len(document_lines)} text lines from {pdf_path}")
        except Exception as e:
            logger.error(f"Error extracting text from {pdf_path}: {e}")
        
        return document_lines, document_raw_text
    
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
            file_hash = hashlib.md5(open(pdf_path, 'rb').read()).hexdigest()
            filename = pdf_path.name
            
            # Calculate relative path if base_dir is provided
            if base_dir:
                try:
                    file_path = str(pdf_path.relative_to(base_dir))
                except ValueError:
                    file_path = str(pdf_path)
            else:
                file_path = str(pdf_path)
            
            # Extract text content with line breaks preserved
            document_lines, document_raw_text = self.extract_text_from_pdf(pdf_path)
            
            # Create JSON structure
            json_data = {
                "metadata": {
                    "filename": filename,
                    "file_path": file_path,
                    "file_hash": file_hash,
                    "processed_date": datetime.datetime.now().isoformat(),
                    "page_count": len(set(block["page"] for block in document_lines)) if document_lines else 0,
                    "include_positions": self.include_positions
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
            logger.error(f"Error converting {pdf_path} to JSON: {e}")
            raise
    
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
    
    def process_file(self, pdf_path: Path, base_dir: Path = None, save: bool = True) -> Dict:
        """
        Process a single PDF file and convert to JSON.
        
        Args:
            pdf_path: Path to the PDF file
            base_dir: Optional base directory for calculating relative paths
            save: Whether to save the JSON file
            
        Returns:
            The JSON data as a dictionary
        """
        logger.info(f"Processing PDF file: {pdf_path}")
        
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
                          limit: Optional[int] = None) -> List[Tuple[Path, bool]]:
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
        for pdf_path in tqdm(pdf_files, desc="Converting PDFs to JSON"):
            try:
                self.process_file(pdf_path, base_dir=pdf_dir)
                results.append((pdf_path, True))
            except Exception:
                results.append((pdf_path, False))
        
        # Summarize results
        successful = [r for r in results if r[1]]
        logger.info(f"Successfully processed {len(successful)} out of {len(results)} PDF files")
        
        return results


def main():
    """Main entry point for the CLI"""
    import argparse
    
    parser = argparse.ArgumentParser(description="Convert PDF files to structured JSON format")
    parser.add_argument("--base-dir", "-d", help="Base dataset directory", default="dataset")
    parser.add_argument("--input", "-i", help="Input PDF file or directory (default: {base-dir}/pdf)")
    parser.add_argument("--output", "-o", help="Output directory for JSON files (default: {base-dir}/converted)")
    parser.add_argument("--log-dir", help="Directory for log files (default: {base-dir}/log)")
    parser.add_argument("--recursive", "-r", action="store_true", help="Recursively process directories")
    parser.add_argument("--limit", "-l", type=int, help="Limit number of files to process")
    
    args = parser.parse_args()
    
    # Set up directory structure
    base_dir = Path(args.base_dir)
    
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
    
    # Create converter and process files
    converter = PDFConverter(output_dir=output_dir)
    
    if input_path.is_file():
        # Process single file
        if input_path.suffix.lower() != '.pdf':
            logger.error(f"Error: {input_path} is not a PDF file")
            return
        
        converter.process_file(input_path)
        logger.info(f"Processed 1 PDF file. Output saved to {output_dir}")
    
    elif input_path.is_dir():
        # Process directory
        results = converter.process_directory(
            input_path, 
            recursive=args.recursive, 
            limit=args.limit
        )
        
        success_count = sum(1 for _, success in results if success)
        logger.info(f"Processed {len(results)} PDF files ({success_count} successful)")
        logger.info(f"Output saved to {output_dir}")
    
    else:
        logger.error(f"Error: {input_path} does not exist")
        print(f"Creating input directory: {input_path}")
        input_path.mkdir(parents=True, exist_ok=True)


if __name__ == "__main__":
    main()
