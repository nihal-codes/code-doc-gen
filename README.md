# Docsy

## Overview

Docsy is an AI-powered source-code documentation generator. It accepts a set of source files via a web interface, processes them to extract relevant code content, and uses a large language model (via the Groq API) to generate a professional, structured `README.md` file.

The system is designed to produce accurate, source-grounded documentation by enforcing strict rules on the AI model: it must not invent features, endpoints, or dependencies, and it must base all claims on the provided source files.

## Key Features

*   **AI-Generated READMEs:** Generates a complete `README.md` file including sections for Overview, Architecture, Tech Stack, Installation, Usage, and API Reference.
*   **Source-Grounded Output:** The prompt engineering enforces that the AI only documents what is present in the uploaded code, preventing hallucinations of features or configurations.
*   **File Filtering & Sanitization:**
    *   Automatically ignores common dependency directories (e.g., `node_modules`, `.venv`) and secret files (e.g., `.env`, `id_rsa`).
    *   Filters files by extension to support a wide range of languages (Python, JavaScript, TypeScript, Java, Go, Rust, etc.).
    *   Prevents path traversal attacks by rejecting absolute paths and parent directory references.
*   **Rate Limit Handling:** Implements retry logic with backoff for Groq API rate limits (HTTP 429).
*   **Model Fallback:** Attempts to use a primary model and falls back to alternative models if the primary fails or returns empty content.
*   **Web Frontend:** A simple HTML interface for uploading files and viewing the generated Markdown.

## Architecture

The project consists of two main components:

1.  **Backend (`code-doc-gen/backend/main.py`):**
    *   A FastAPI application that exposes a REST API.
    *   **Ingestion:** Accepts multipart file uploads, validates file types, sizes, and paths, and filters out sensitive or irrelevant files.
    *   **Prompt Construction:** Builds a structured prompt containing the file inventory and source code content.
    *   **AI Integration:** Sends the prompt to the Groq API (OpenAI-compatible endpoint) using the `requests` library. It handles retries, rate limits, and model fallbacks.
    *   **Response:** Returns the generated Markdown string along with metadata about the processed files.

2.  **Frontend (`code-doc-gen/frontend/index.html`):**
    *   A static HTML page that serves as the user interface.
    *   Allows users to select and upload source files.
    *   Displays the generated Markdown documentation.

**Data Flow:**
1.  User uploads files via the frontend.
2.  Backend validates and filters files.
3.  Backend constructs a prompt with the source code.
4.  Backend calls the Groq API.
5.  Groq API returns generated Markdown.
6.  Backend returns the Markdown to the frontend.
7.  Frontend displays the Markdown.

## Tech Stack

*   **Backend:**
    *   Language: Python
    *   Framework: FastAPI
    *   Libraries: `requests`, `python-dotenv`
    *   AI Provider: Groq API (using Qwen models)
*   **Frontend:**
    *   Language: HTML, CSS, JavaScript (implied by standard web practices, though JS is not explicitly shown in the provided snippet)
    *   Fonts: Google Fonts

## Project Structure

```
code-doc-gen/
├── backend/
│   └── main.py          # FastAPI application, AI integration, file processing
└── frontend/
    └── index.html       # Web interface for file upload and documentation display
```

## Prerequisites

*   Python 3.x
*   Groq API Key
*   A web browser

## Installation

1.  **Install Dependencies:**
    The backend requires `fastapi`, `requests`, and `python-dotenv`. You can install them using `pip`:
    ```bash
    pip install fastapi requests python-dotenv
    ```
    *Note: A `requirements.txt` file was not provided in the source, so dependencies are inferred from imports.*

2.  **Configure Environment:**
    Create a `.env` file in the `backend/` directory (or the project root) with the following variable:
    ```env
    GROQ_API_KEY=your_groq_api_key_here
    ```
    Optionally, you can set `GROQ_MODEL` to specify a different model. The default is `qwen/qwen3.8-27b`.

3.  **Run the Backend:**
    Use a Uvicorn server to run the FastAPI application:
    ```bash
    uvicorn main:app --reload --port 8000
    ```
    *Note: The specific port and host for the backend are not explicitly defined in the code, but Uvicorn defaults to `localhost:8000`.*

4.  **Run the Frontend:**
    The frontend is a static HTML file. You can serve it using any static file server. For example, using Python's built-in server:
    ```bash
    cd frontend
    python -m http.server 5000
    ```
    The CORS middleware in the backend is configured to allow requests from `http://localhost:5000`, `http://127.0.0.1:5000`, and other common development ports.

## Configuration

The backend reads configuration from environment variables, typically loaded from a `.env` file.

| Variable | Description | Default |
| :--- | :--- | :--- |
| `GROQ_API_KEY` | API key for the Groq service. **Required.** | None |
| `GROQ_MODEL` | The primary model to use for documentation generation. | `qwen/qwen3.8-27b` |

**Internal Limits:**
The following limits are hardcoded in `main.py` and can be adjusted by modifying the source code:
*   `MAX_FILE_SIZE`: 1 MiB per file.
*   `MAX_TOTAL_SIZE`: 5 MiB total upload size.
*   `MAX_CODE_CHARS`: 15,000 characters sent to the model.
*   `MAX_FILES`: 100 files per upload.

## Usage

1.  Start the backend server.
2.  Start the frontend server.
3.  Open the frontend URL in your browser (e.g., `http://localhost:5000`).
4.  Select one or more source files from your project.
5.  Click the upload button.
6.  Wait for the AI to generate the documentation.
7.  View the generated `README.md` content in the browser.

## API Reference

### `GET /`
Health check endpoint.

**Response:**
```json
{
  "status": "running",
  "service": "Docsy API",
  "version": "2.0.0"
}
```

### `POST /upload`
Uploads source files and generates documentation.

**Request:**
*   **Content-Type:** `multipart/form-data`
*   **Body:** A list of files under the field name `files`.

**Response:**
*   **200 OK:**
    ```json
    {
      "markdown": "# Project Name\n\n## Overview\n...",
      "files_processed": 5,
      "characters_processed": 12000
    }
    ```
*   **400 Bad Request:** No supported files found or no files uploaded.
*   **413 Payload Too Large:** File or total size exceeds limits.
*   **500 Internal Server Error:** `GROQ_API_KEY` is not configured.
*   **502 Bad Gateway:** Error connecting to Groq API or invalid response.
*   **504 Gateway Timeout:** Groq API request timed out.

## Example

*Note: The following is an illustrative example of the API response. The actual Markdown content will vary based on the uploaded source code.*

**Request:**
```bash
curl -X POST http://localhost:8000/upload \
  -F "files=@main.py" \
  -F "files=@utils.py"
```

**Response:**
```json
{
  "markdown": "# My Project\n\n## Overview\nMy Project is a tool for...",
  "files_processed": 2,
  "characters_processed": 4500
}
```

## Error Handling and Limitations

*   **Rate Limiting:** The backend implements retry logic for Groq rate limits (HTTP 429). It waits for the duration specified in the error message (or 40 seconds by default) before retrying.
*   **Model Fallback:** If the primary model fails or returns empty content, the backend attempts to use fallback models (`qwen/qwen3.8-27b`, `allam-2-7b`).
*   **File Filtering:** Files with extensions not in `ALLOWED_EXT` are ignored. Files in `IGNORED_DIRS` or with names in `IGNORED_NAMES` are also ignored.
*   **Secrets:** Files starting with `.env` are explicitly skipped to prevent sending secrets to the AI service. However, the code notes that a more comprehensive secret scanner is recommended for production.
*   **Character Limit:** The total number of characters sent to the model is capped at 15,000. If the uploaded files exceed this limit, only the first portion of the files is included in the prompt.

## Security Considerations

*   **Path Traversal Prevention:** The backend rejects file paths that are absolute or contain `..` to prevent directory traversal attacks.
*   **Secrets Filtering:** Common secret files (`.env`, `id_rsa`, etc.) are filtered out before being sent to the AI service.
*   **CORS:** The backend is configured to allow requests only from specific local development origins. For production, this should be restricted to the actual frontend domain.
*   **Input Validation:** File sizes and types are validated to prevent abuse and ensure only supported files are processed.

## Contributing

Contributions are welcome. Please ensure that any changes adhere to the existing code style and do not introduce security vulnerabilities.

## License

The license for this project could not be determined from the provided source files.