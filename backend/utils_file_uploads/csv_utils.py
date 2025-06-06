"""
Utilities for CSV file cleaning.
"""

import io
from typing import Union
import pandas as pd
from utils_logging import LOGGER
from .excel_utils import ExcelUtils


class CSVUtils:
    """Utilities for CSV file cleaning."""
    
    @staticmethod
    async def read_csv(csv_buffer: Union[bytes, str]) -> pd.DataFrame:
        """
        Read a CSV file into a pandas DataFrame without cleaning.
        Automatically detects common delimiters like commas, semicolons, tabs.
        """
        try:
            # Convert buffer to string if needed
            if isinstance(csv_buffer, bytes):
                csv_string = csv_buffer.decode("utf-8")
            else:
                csv_string = csv_buffer
            
            # Check the first few lines to detect delimiter
            sample_lines = '\n'.join(csv_string.split('\n')[:5])
            
            # Common delimiters to check
            delimiters = [',', ';', '\t', '|']
            delimiter_counts = {}
            
            for delimiter in delimiters:
                if delimiter in sample_lines:
                    # Count occurrences in each line and find the average
                    lines = [line for line in sample_lines.split('\n') if line.strip()]
                    counts = [line.count(delimiter) for line in lines]
                    if counts:
                        delimiter_counts[delimiter] = sum(counts) / len(counts)
            
            # Choose the most frequent delimiter
            if delimiter_counts:
                detected_delimiter = max(delimiter_counts, key=delimiter_counts.get)
                LOGGER.info(f"Detected delimiter: '{detected_delimiter}'")
            else:
                # Default to comma if no other delimiter is found
                detected_delimiter = ','
                LOGGER.info("No delimiter detected, defaulting to comma")
                
            # Read CSV into DataFrame with detected delimiter
            df = pd.read_csv(io.StringIO(csv_string), sep=detected_delimiter)
            return df
            
        except Exception as e:
            LOGGER.error(f"Error reading CSV: {e}")
            # If delimiter detection failed, try comma as fallback
            try:
                if isinstance(csv_buffer, bytes):
                    csv_string = csv_buffer.decode("utf-8")
                else:
                    csv_string = csv_buffer
                LOGGER.info("Trying with default comma delimiter")
                df = pd.read_csv(io.StringIO(csv_string))
                return df
            except Exception:
                # If that also fails, raise the original error
                raise e
    
    @staticmethod
    async def clean_csv_pd(csv_buffer: Union[bytes, str]) -> pd.DataFrame:
        """
        Cleans a CSV file using pandas by:
        - converting common NULL string representations to NaN
        - removing empty rows and columns
        - filling NaN values with empty strings
        """
        try:
            # Read the raw CSV data
            df = await CSVUtils.read_csv(csv_buffer)
            
            # Define common NULL/NA string representations
            null_values = [
                "NULL", "null", 
                "NA", "N/A", "n/a", "N.A.", "n.a.",
                "-", "--", "---",
                "#N/A", "#NA", "#NULL",
                "NaN", "nan",
                "None", "none",
                "", " ", "  "
            ]
            
            # Replace NULL string representations with NaN
            df = df.replace(null_values, pd.NA)
            
            # Trim trailing whitespace from string columns
            for col in df.columns:
                if df[col].dtype == 'object':
                    df[col] = df[col].apply(lambda x: x.strip() if isinstance(x, str) else x)
            
            # Drop rows and columns that are all NaN
            df = df.dropna(how="all")
            df = df.dropna(axis=1, how="all")
            
            # Fill NaN values with empty strings for better readability
            df = df.fillna("")
            
            LOGGER.info(f"CSV after cleaning: {df.shape[0]} rows, {df.shape[1]} columns")
            
            return df
        except Exception as e:
            LOGGER.error(f"Error cleaning CSV with pandas: {e}")
            raise
            
    @staticmethod
    async def clean_csv_openai(table_name: str, df: pd.DataFrame) -> pd.DataFrame:
        """
        Further cleans a dataframe (from a CSV file) using OpenAI's Code Interpreter.
        This method delegates to ExcelUtils.clean_excel_openai which works for both CSV and Excel data.
        """
        return await ExcelUtils.clean_excel_openai(table_name, df)