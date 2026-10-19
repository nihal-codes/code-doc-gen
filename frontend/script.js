
const API_URL = "http://127.0.0.1:8000/upload";

// Upload limits should match your backend configuration.
const MAX_UPLOAD_FILES = 100;
const MAX_TOTAL_SIZE = 5 * 1024 * 1024;
const MAX_FILE_SIZE = 1 * 1024 * 1024;

// --------------------------------------------------
// DOM ELEMENTS
// --------------------------------------------------

const fileInput = document.getElementById("files");
const dropZone = document.getElementById("dropZone");
const browseBtn = document.getElementById("browseBtn");
const clearBtn = document.getElementById("clearBtn");
const generateBtn = document.getElementById("generateBtn");
const generateLabel = document.getElementById("generateLabel");
const generateArrow = document.getElementById("generateArrow");
const downloadBtn = document.getElementById("downloadBtn");

const selectedSection = document.getElementById("selectedSection");
const fileList = document.getElementById("fileList");
const fileCount = document.getElementById("fileCount");
const fileSummary = document.getElementById("fileSummary");
const statusMessage = document.getElementById("statusMessage");

const output = document.getElementById("output");
const outputSubtitle = document.getElementById("outputSubtitle");
const outputMeta = document.getElementById("outputMeta");

// --------------------------------------------------
// STATE
// --------------------------------------------------

let selectedFiles = [];
let generatedMarkdown = "";
let isGenerating = false;

// --------------------------------------------------
// FILE FILTER CONFIGURATION
// --------------------------------------------------

const IGNORED_DIRS = new Set([
    "node_modules",
    ".git",
    ".venv",
    "venv",
    "__pycache__",
    "dist",
    "build",
    ".next",
    ".nuxt",
    ".output",
    "coverage",
    ".pytest_cache",
    ".mypy_cache",
    ".ruff_cache",
    ".idea",
    ".vscode",
    "vendor",
    "target",
    ".turbo",
    ".cache",
    ".parcel-cache",
    ".svelte-kit",
    "bower_components",
    "Pods",
    "DerivedData",
]);

const IGNORED_FILES = new Set([
    ".ds_store",
    "thumbs.db",
    "desktop.ini",
    "package-lock.json.tmp",
]);

// Only source, documentation, and useful configuration extensions.
const ALLOWED_EXTENSIONS = new Set([
    ".py",
    ".js",
    ".jsx",
    ".ts",
    ".tsx",
    ".mjs",
    ".cjs",
    ".html",
    ".css",
    ".scss",
    ".sass",
    ".less",
    ".json",
    ".md",
    ".mdx",
    ".txt",
    ".yml",
    ".yaml",
    ".toml",
    ".xml",
    ".java",
    ".c",
    ".h",
    ".cpp",
    ".hpp",
    ".cs",
    ".go",
    ".rs",
    ".php",
    ".rb",
    ".sql",
    ".sh",
    ".bat",
    ".ps1",
    ".vue",
    ".svelte",
    ".kt",
    ".swift",
    ".ipynb",
    ".prisma",
    ".graphql",
    ".gql",
    ".dockerfile",
]);

// Important project files that may not have a normal extension.
const IMPORTANT_FILENAMES = new Set([
    "dockerfile",
    "makefile",
    "procfile",
    "license",
    "licence",
    ".gitignore",
    ".dockerignore",
    ".npmrc",
    ".nvmrc",
    ".editorconfig",
    ".prettierrc",
    ".eslintrc",
    ".env.example",
    "requirements.txt",
    "pipfile",
    "poetry.lock",
    "uv.lock",
    "package.json",
    "cargo.toml",
    "go.mod",
    "composer.json",
    "gemfile",
    "tsconfig.json",
    "jsconfig.json",
    "vite.config.js",
    "vite.config.ts",
    "vite.config.mjs",
    "next.config.js",
    "next.config.ts",
    "next.config.mjs",
    "webpack.config.js",
    "eslint.config.js",
    "postcss.config.js",
    "tailwind.config.js",
    "tailwind.config.ts",
    "astro.config.js",
    "astro.config.mjs",
    "svelte.config.js",
    "angular.json",
    "manage.py",
    "pyproject.toml",
    "setup.py",
    "setup.cfg",
    "wsgi.py",
    "asgi.py",
    "application.yml",
    "application.yaml",
]);

// These files are often huge and usually unnecessary for README generation.
const IGNORED_LOCKFILES = new Set([
    "package-lock.json",
    "pnpm-lock.yaml",
    "yarn.lock",
    "bun.lock",
    "bun.lockb",
    "pipfile.lock",
    "poetry.lock",
    "uv.lock",
    "cargo.lock",
    "go.sum",
    "composer.lock",
    "gemfile.lock",
    "package-lock.json",
    "yarn.lock",
    "pnpm-lock.yaml",
    "bun.lock",
    "bun.lockb",
    "app.test.js",
    "app.test.jsx",
    "app.test.ts",
    "app.test.tsx",
    "setupTests.js",
    ".gitignore"
]);

// Prioritize these when a project contains more than the file limit.
const PRIORITY_FILENAMES = new Set([
    "requirements.txt",
    "pyproject.toml",
    "cargo.toml",
    "go.mod",
    "composer.json",
    "gemfile",
    "dockerfile",
    "makefile",
    "readme.md",
    "index.html",
    "main.py",
    "app.py",
    "server.py",
    "main.js",
    "main.ts",
    "index.js",
    "index.ts",
    "index.jsx",
    "index.tsx",
    "app.js",
    "app.ts",
    "app.jsx",
    "app.tsx",
    "server.js",
    "server.ts",
    "vite.config.js",
    "vite.config.ts",
    "next.config.js",
    "next.config.ts",
]);

// --------------------------------------------------
// FILE UTILITIES
// --------------------------------------------------

function getRelativePath(file) {
    return (file.webkitRelativePath || file.name)
        .replace(/\\/g, "/");
}

function getExtension(filename) {
    const name = filename.split("/").pop() || "";
    const index = name.lastIndexOf(".");

    return index === -1
        ? ""
        : name.slice(index).toLowerCase();
}

function formatBytes(bytes) {
    if (bytes < 1024) {
        return `${bytes} B`;
    }

    if (bytes < 1024 * 1024) {
        return `${(bytes / 1024).toFixed(1)} KB`;
    }

    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function shouldIncludeFile(file) {
    const relativePath = getRelativePath(file);
    const parts = relativePath.split("/");
    const filename = parts[parts.length - 1];
    const lowerFilename = filename.toLowerCase();

    // Exclude dependency, build, cache, and generated directories.
    if (
        parts.some((part) =>
            IGNORED_DIRS.has(part.toLowerCase())
        )
    ) {
        return false;
    }

    // Do not upload real environment files or credentials.
    if (
        lowerFilename === ".env" ||
        (
            lowerFilename.startsWith(".env.") &&
            lowerFilename !== ".env.example"
        ) ||
        /\.(pem|key|p12|pfx|crt|cer)$/i.test(filename) ||
        /^(id_rsa|id_ed25519)(\.pub)?$/i.test(filename)
    ) {
        return false;
    }

    // Exclude common irrelevant files.
    if (IGNORED_FILES.has(lowerFilename)) {
        return false;
    }

    // Lockfiles are not needed for the initial documentation workflow.
    if (IGNORED_LOCKFILES.has(lowerFilename)) {
        return false;
    }

    // Exclude hidden directories, but retain GitHub workflows.
    const hiddenDirectory = parts
        .slice(0, -1)
        .some((part) =>
            part.startsWith(".") &&
            part.toLowerCase() !== ".github"
        );

    if (hiddenDirectory) {
        return false;
    }

    // Avoid uploading oversized files.
    if (file.size > MAX_FILE_SIZE) {
        return false;
    }

    // Keep important extensionless files.
    if (IMPORTANT_FILENAMES.has(lowerFilename)) {
        return true;
    }

    return ALLOWED_EXTENSIONS.has(getExtension(filename));
}

function getPriority(file) {
    const path = getRelativePath(file);
    const filename = path.split("/").pop().toLowerCase();

    if (PRIORITY_FILENAMES.has(filename)) {
        return 0;
    }

    if (
        filename.startsWith("main.") ||
        filename.startsWith("app.") ||
        filename.startsWith("server.") ||
        filename.startsWith("index.")
    ) {
        return 1;
    }

    if (
        filename.includes("config") ||
        filename.includes("route") ||
        filename.includes("model") ||
        filename.includes("schema")
    ) {
        return 2;
    }

    if (
        filename.endsWith(".md") ||
        filename === ".gitignore" ||
        filename === "dockerfile"
    ) {
        return 3;
    }

    return 4;
}

function getRelevantFiles(files) {
    return Array.from(files)
        .filter(shouldIncludeFile)
        .sort((a, b) => {
            const priorityDifference =
                getPriority(a) - getPriority(b);

            if (priorityDifference !== 0) {
                return priorityDifference;
            }

            return getRelativePath(a).localeCompare(
                getRelativePath(b)
            );
        });
}

// --------------------------------------------------
// STATUS AND UI
// --------------------------------------------------

function setStatus(message, type = "normal") {
    statusMessage.className = "status-message";

    if (type === "loading") {
        statusMessage.classList.add("is-loading");
    }

    if (type === "error") {
        statusMessage.classList.add("is-error");
    }

    if (type === "success") {
        statusMessage.classList.add("is-success");
    }

    statusMessage.replaceChildren();

    const dot = document.createElement("span");
    dot.className = "status-dot";

    const text = document.createElement("span");
    text.textContent = message;

    statusMessage.append(dot, text);
}

function createFileElement(file) {
    const item = document.createElement("div");
    item.className = "file-item";

    const extension = getExtension(file.name)
        .replace(".", "") || "file";

    const icon = document.createElement("div");
    icon.className = "file-type-icon";
    icon.textContent = extension.slice(0, 4);

    const info = document.createElement("div");
    info.className = "file-info";

    const name = document.createElement("div");
    name.className = "file-name";
    name.textContent = file.name;
    name.title = file.name;

    const path = document.createElement("div");
    path.className = "file-path";
    path.textContent = getRelativePath(file);
    path.title = path.textContent;

    info.append(name, path);

    const size = document.createElement("span");
    size.className = "file-size";
    size.textContent = formatBytes(file.size);

    item.append(icon, info, size);

    return item;
}

function renderFileList() {
    fileList.replaceChildren();

    const fragment = document.createDocumentFragment();

    selectedFiles.forEach((file) => {
        fragment.appendChild(createFileElement(file));
    });

    fileList.appendChild(fragment);

    const totalBytes = selectedFiles.reduce(
        (total, file) => total + file.size,
        0
    );

    fileCount.textContent = selectedFiles.length;

    fileSummary.textContent = selectedFiles.length
        ? `${formatBytes(totalBytes)} total · Review before generating`
        : "No relevant files selected";

    selectedSection.classList.toggle(
        "hidden",
        selectedFiles.length === 0
    );

    generateBtn.disabled =
        selectedFiles.length === 0 || isGenerating;
}

function resetOutput() {
    generatedMarkdown = "";
    downloadBtn.disabled = true;

    outputSubtitle.textContent =
        "Your generated documentation will appear here";

    outputMeta.textContent = "Markdown preview";

    output.innerHTML = `
        <div class="empty-state">
            <div class="empty-icon">
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path
                        d="M6 3.75h8l4 4v12.5H6a2 2 0 0 1-2-2v-12.5a2 2 0 0 1 2-2Z"
                        stroke="currentColor"
                        stroke-width="1.5"
                        stroke-linejoin="round"
                    />
                    <path
                        d="M14 3.75v4h4M8 12h8M8 15.5h5"
                        stroke="currentColor"
                        stroke-width="1.5"
                        stroke-linecap="round"
                    />
                </svg>
            </div>
            <h3>Your README starts here</h3>
            <p>
                Select your project files and generate documentation.
                Your output will appear here.
            </p>
        </div>
    `;
}

// --------------------------------------------------
// ADD AND FILTER FILES
// --------------------------------------------------

function addFiles(fileCollection) {
    if (isGenerating) return;

    const incoming = Array.from(fileCollection || []);

    if (!incoming.length) return;

    const relevantIncoming = getRelevantFiles(incoming);
    const incomingExcluded =
        incoming.length - relevantIncoming.length;

    const merged = new Map();

    [...selectedFiles, ...relevantIncoming].forEach((file) => {
        const key = getRelativePath(file);

        if (!merged.has(key)) {
            merged.set(key, file);
        }
    });

    let mergedFiles = Array.from(merged.values());

    // Keep important project files first when limiting the selection.
    mergedFiles.sort((a, b) => {
        const difference = getPriority(a) - getPriority(b);

        if (difference !== 0) {
            return difference;
        }

        return getRelativePath(a).localeCompare(
            getRelativePath(b)
        );
    });

    const totalRelevant = mergedFiles.length;
    const filesTrimmed = Math.max(
        0,
        totalRelevant - MAX_UPLOAD_FILES
    );

    selectedFiles = mergedFiles.slice(0, MAX_UPLOAD_FILES);

    renderFileList();
    resetOutput();

    if (filesTrimmed > 0) {
        setStatus(
            `${totalRelevant} relevant files found. ` +
            `${filesTrimmed} lower-priority files excluded; ` +
            `${selectedFiles.length} selected.`,
            "error"
        );
    } else if (incomingExcluded > 0) {
        setStatus(
            `${incomingExcluded} irrelevant or oversized files skipped. ` +
            `${selectedFiles.length} relevant file(s) ready.`,
            "success"
        );
    } else {
        setStatus(
            `${selectedFiles.length} relevant file(s) ready for documentation`,
            "success"
        );
    }

    if (totalRelevant === 0 && selectedFiles.length === 0) {
        setStatus(
            "No supported source or configuration files were found.",
            "error"
        );
    }
}

// --------------------------------------------------
// FILE PICKER AND DRAG/DROP
// --------------------------------------------------

browseBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    fileInput.click();
});

dropZone.addEventListener("click", (event) => {
    if (event.target.closest("button")) return;

    fileInput.click();
});

dropZone.addEventListener("keydown", (event) => {
    if (event.target !== dropZone) return;

    if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        fileInput.click();
    }
});

fileInput.addEventListener("change", () => {
    addFiles(fileInput.files);

    // Allow selecting the same folder again.
    fileInput.value = "";
});

["dragenter", "dragover"].forEach((eventName) => {
    dropZone.addEventListener(eventName, (event) => {
        event.preventDefault();
        dropZone.classList.add("dragging");
    });
});

["dragleave", "drop"].forEach((eventName) => {
    dropZone.addEventListener(eventName, (event) => {
        event.preventDefault();
        dropZone.classList.remove("dragging");
    });
});

dropZone.addEventListener("drop", (event) => {
    if (event.dataTransfer?.files) {
        addFiles(event.dataTransfer.files);
    }
});

// --------------------------------------------------
// CLEAR SELECTION
// --------------------------------------------------

clearBtn.addEventListener("click", () => {
    if (isGenerating) return;

    selectedFiles = [];
    fileInput.value = "";

    renderFileList();
    resetOutput();

    setStatus("Waiting for your project files");
});

// --------------------------------------------------
// GENERATE DOCUMENTATION
// --------------------------------------------------

generateBtn.addEventListener("click", uploadFiles);

async function uploadFiles() {
    if (!selectedFiles.length || isGenerating) return;

    const totalBytes = selectedFiles.reduce(
        (total, file) => total + file.size,
        0
    );

    if (selectedFiles.length > MAX_UPLOAD_FILES) {
        setStatus(
            `Please select no more than ${MAX_UPLOAD_FILES} files.`,
            "error"
        );
        return;
    }

    if (totalBytes > MAX_TOTAL_SIZE) {
        setStatus(
            `The selected files total ${formatBytes(totalBytes)}. ` +
            `The maximum upload size is ${formatBytes(MAX_TOTAL_SIZE)}. ` +
            `Please select a smaller project.`,
            "error"
        );
        return;
    }

    isGenerating = true;

    generateBtn.disabled = true;
    browseBtn.disabled = true;
    clearBtn.disabled = true;
    fileInput.disabled = true;

    generateLabel.textContent = "Generating documentation...";
    generateArrow.classList.add("hidden");

    setStatus(
        `Uploading ${selectedFiles.length} filtered files and generating your README...`,
        "loading"
    );

    output.innerHTML = `
        <div class="empty-state">
            <div class="upload-icon">
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path
                        d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5"
                        stroke="currentColor"
                        stroke-width="1.8"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                    />
                    <path
                        d="M5 14.5v3.75A1.75 1.75 0 0 0 6.75 20h10.5A1.75 1.75 0 0 0 19 18.25V14.5"
                        stroke="currentColor"
                        stroke-width="1.8"
                        stroke-linecap="round"
                    />
                </svg>
            </div>
            <h3>Working on your documentation</h3>
            <p>
                Your relevant files are being processed.
                This can take a little while for larger projects.
            </p>
        </div>
    `;

    try {
        const formData = new FormData();

        selectedFiles.forEach((file) => {
            // Preserve the directory structure for the backend.
            formData.append(
                "files",
                file,
                getRelativePath(file)
            );
        });

        console.log("Files selected:", selectedFiles.length);
        console.log("Total upload size:", formatBytes(totalBytes));
        console.log(
            "Files being uploaded:",
            selectedFiles.map(getRelativePath)
        );

        const response = await fetch(API_URL, {
            method: "POST",
            body: formData,
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            const detail =
                data.detail || data.error || response.statusText;

            throw new Error(
                `Request failed (${response.status}): ${
                    typeof detail === "string"
                        ? detail
                        : JSON.stringify(detail)
                }`
            );
        }

        if (
            typeof data.markdown !== "string" ||
            !data.markdown.trim()
        ) {
            throw new Error(
                "The backend returned no generated Markdown."
            );
        }

        // Support older backend versions that return errors as strings.
        if (data.markdown.startsWith("ERROR FROM API:")) {
            throw new Error(data.markdown);
        }

        if (
            typeof marked === "undefined" ||
            typeof DOMPurify === "undefined"
        ) {
            throw new Error(
                "Markdown rendering libraries did not load. " +
                "Check the script tags in index.html."
            );
        }

        generatedMarkdown = data.markdown;

        const rendered = await marked.parse(generatedMarkdown);

        // Generated Markdown is untrusted content.
        // Sanitize its HTML before rendering.
        output.innerHTML = DOMPurify.sanitize(rendered);

        outputSubtitle.textContent =
            "Documentation generated successfully";

        const processedCount =
            Number.isFinite(data.files_processed)
                ? data.files_processed
                : selectedFiles.length;

        outputMeta.textContent =
            `${generatedMarkdown.length.toLocaleString()} characters · ` +
            `${processedCount} files processed · Markdown`;

        downloadBtn.disabled = false;

        setStatus(
            "Documentation generated successfully",
            "success"
        );

        document.querySelector(".output-section")?.scrollIntoView({
            behavior: "smooth",
            block: "start",
        });
    } catch (error) {
        console.error(
            "Documentation generation failed:",
            error
        );

        output.replaceChildren();

        const errorState = document.createElement("div");
        errorState.className = "empty-state";

        const heading = document.createElement("h3");
        heading.textContent =
            "Couldn't generate documentation";

        const message = document.createElement("p");
        message.textContent =
            error instanceof Error
                ? error.message
                : "An unexpected error occurred.";

        errorState.append(heading, message);
        output.appendChild(errorState);

        outputSubtitle.textContent = "Generation failed";
        outputMeta.textContent = "Check the error and try again";

        setStatus(message.textContent, "error");
    } finally {
        isGenerating = false;

        browseBtn.disabled = false;
        clearBtn.disabled = false;
        fileInput.disabled = false;

        generateLabel.textContent = "Generate documentation";
        generateArrow.classList.remove("hidden");

        generateBtn.disabled = selectedFiles.length === 0;
    }
}

// --------------------------------------------------
// DOWNLOAD README
// --------------------------------------------------

downloadBtn.addEventListener("click", () => {
    if (!generatedMarkdown) return;

    const blob = new Blob([generatedMarkdown], {
        type: "text/markdown;charset=utf-8",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "README.md";

    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);
});

// --------------------------------------------------
// INITIAL STATE
// --------------------------------------------------

renderFileList();
resetOutput();
setStatus("Waiting for your project files");
