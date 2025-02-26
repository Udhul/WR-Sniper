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

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("pdf_processing.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger("PDFConverter")

class PDFConverter:
    """
    Converts PDF files to structured JSON format that is suitable for annotation.
    Extracts text by line.
    """
    
    def __init__(self, output_dir: Union[str, Path] = None, include_positions: bool = False):
        """
        Initialize the PDF converter.
        
        Args:
            output_dir: Optional directory where JSON files will be saved.
                        If None, JSONs won't be automatically saved.
            include_positions: Whether to include position coordinates for text blocks
        """
        self.output_dir = Path(output_dir) if output_dir else None
        self.include_positions = include_positions
        
        if self.output_dir:
            self.output_dir.mkdir(exist_ok=True, parents=True)
    
    def extract_text_from_pdf(self, pdf_path: Path) -> List[Dict]:
        """
        Extract text content from PDF, preserving line breaks.
        
        Args:
            pdf_path: Path to PDF file
            
        Returns:
            List of dictionaries containing text lines and their positions
        """
        text_blocks = []
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
                        text_block = {
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
                                text_block["position"] = position
                        
                        text_blocks.append(text_block)
            
            doc.close()
            logger.info(f"Extracted {len(text_blocks)} text lines from {pdf_path}")
        except Exception as e:
            logger.error(f"Error extracting text from {pdf_path}: {e}")
        
        return text_blocks
    
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
            text_blocks = self.extract_text_from_pdf(pdf_path)
            
            # Create JSON structure
            json_data = {
                "metadata": {
                    "filename": filename,
                    "file_path": file_path,
                    "file_hash": file_hash,
                    "processed_date": datetime.datetime.now().isoformat(),
                    "page_count": len(set(block["page"] for block in text_blocks)) if text_blocks else 0,
                    "include_positions": self.include_positions
                },
                "content": {
                    "text_blocks": text_blocks
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
    parser.add_argument("input", help="Input PDF file or directory")
    parser.add_argument("--output", "-o", help="Output directory for JSON files", default="pdf_json_output")
    parser.add_argument("--recursive", "-r", action="store_true", help="Recursively process directories")
    parser.add_argument("--limit", "-l", type=int, help="Limit number of files to process")
    parser.add_argument("--include-positions", "-p", action="store_true", 
                        help="Include position coordinates for text blocks (default: False)")
    
    args = parser.parse_args()
    
    converter = PDFConverter(output_dir=args.output, include_positions=args.include_positions)
    input_path = Path(args.input)
    
    if input_path.is_file():
        # Process single file
        if input_path.suffix.lower() != '.pdf':
            print(f"Error: {input_path} is not a PDF file")
            return
        
        converter.process_file(input_path)
        print(f"Processed 1 PDF file. Output saved to {args.output}")
    
    elif input_path.is_dir():
        # Process directory
        results = converter.process_directory(
            input_path, 
            recursive=args.recursive, 
            limit=args.limit
        )
        
        success_count = sum(1 for _, success in results if success)
        print(f"Processed {len(results)} PDF files ({success_count} successful)")
        print(f"Output saved to {args.output}")
    
    else:
        print(f"Error: {input_path} does not exist")


if __name__ == "__main__":
    main()
