import os
import re
import json
from pathlib import Path

ROOT = Path.cwd()

IGNORE_DIRS = {
    ".git",
    "node_modules",
    "dist",
    "build",
    ".venv",
    "graphify-out",
    "__pycache__",
    ".next",
    "coverage",
}

TEXT_EXTENSIONS = {
    ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs",
    ".json", ".css", ".scss", ".html", ".md"
}

SPECIAL_FILES = {
    "package.json",
    "vite.config.ts",
    "vite.config.js",
    "tsconfig.json",
    "tsconfig.app.json",
    "tsconfig.node.json",
    "tailwind.config.js",
    "tailwind.config.ts",
    "CLAUDE.md",
    ".env.example",
}

def relative(path):
    return path.relative_to(ROOT).as_posix()


def read_text(path):
    try:
        return path.read_text(encoding="utf-8", errors="replace")
    except Exception:
        return ""


def line_count(text):
    return text.count("\n") + (1 if text else 0)


def extract_imports(text):
    imports = []

    patterns = [
        r'import\s+(?:type\s+)?[\s\S]*?\s+from\s+[\'"]([^\'"]+)[\'"]',
        r'import\s+[\'"]([^\'"]+)[\'"]',
        r'require\s*\(\s*[\'"]([^\'"]+)[\'"]\s*\)',
    ]

    for pattern in patterns:
        for match in re.finditer(pattern, text):
            value = match.group(1)

            if value not in imports:
                imports.append(value)

    return imports


def extract_exports(text):
    exports = []

    patterns = [
        r'\bexport\s+(?:default\s+)?(?:async\s+)?function\s+([A-Za-z_$][\w$]*)',
        r'\bexport\s+(?:default\s+)?class\s+([A-Za-z_$][\w$]*)',
        r'\bexport\s+(?:const|let|var)\s+([A-Za-z_$][\w$]*)',
        r'\bexport\s+(?:interface|type|enum)\s+([A-Za-z_$][\w$]*)',
    ]

    for pattern in patterns:
        exports.extend(re.findall(pattern, text))

    # export { foo, bar }
    for match in re.finditer(
        r'\bexport\s*\{([^}]+)\}',
        text
    ):
        for item in match.group(1).split(","):
            item = item.strip()

            if " as " in item:
                item = item.split(" as ")[-1].strip()

            if item:
                exports.append(item)

    return list(dict.fromkeys(exports))


def extract_functions(text):
    functions = []

    patterns = [
        r'\bfunction\s+([A-Za-z_$][\w$]*)\s*\(',
        r'\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>',
        r'\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?[A-Za-z_$][\w$]*\s*=>',
    ]

    for pattern in patterns:
        functions.extend(re.findall(pattern, text))

    return list(dict.fromkeys(functions))


def extract_components(text):
    components = []

    patterns = [
        r'\bfunction\s+([A-Z][A-Za-z0-9_$]*)\s*\(',
        r'\b(?:const|let|var)\s+([A-Z][A-Za-z0-9_$]*)\s*=\s*(?:async\s*)?\(',
        r'\b(?:const|let|var)\s+([A-Z][A-Za-z0-9_$]*)\s*=\s*(?:async\s*)?[A-Za-z_$][\w$]*\s*=>',
    ]

    for pattern in patterns:
        components.extend(re.findall(pattern, text))

    return list(dict.fromkeys(components))


def extract_hooks(text):
    hooks = re.findall(
        r'\b(use[A-Z][A-Za-z0-9_$]*)\s*\(',
        text
    )

    return list(dict.fromkeys(hooks))


def extract_types(text):
    result = []

    patterns = [
        r'\binterface\s+([A-Za-z_$][\w$]*)',
        r'\btype\s+([A-Za-z_$][\w$]*)',
        r'\benum\s+([A-Za-z_$][\w$]*)',
    ]

    for pattern in patterns:
        result.extend(re.findall(pattern, text))

    return list(dict.fromkeys(result))


def detect_features(text):
    low = text.lower()

    feature_map = {
        "firebase": [
            "firebase",
            "firestore",
            "initializeapp",
            "getauth",
        ],
        "authentication": [
            "auth",
            "signin",
            "signout",
            "login",
            "logout",
        ],
        "payments": [
            "payment",
            "payments",
            "transaction",
        ],
        "pdf": [
            "pdf",
            "jspdf",
            "pdfgenerator",
        ],
        "contracts": [
            "contract",
            "contractbuilder",
        ],
        "templates": [
            "template",
            "templates",
        ],
        "sandbox": [
            "sandbox",
        ],
        "admin": [
            "admin",
        ],
        "customer": [
            "customer",
        ],
        "translation": [
            "translation",
            "translate",
            "i18n",
        ],
        "currency": [
            "currency",
            "formatprice",
            "exchange",
        ],
        "audio": [
            "audio",
            "sound",
        ],
        "signature": [
            "signature",
            "signaturepad",
        ],
        "storage": [
            "localstorage",
            "sessionstorage",
        ],
        "routing": [
            "router",
            "route",
            "navigate",
        ],
        "api": [
            "fetch(",
            "axios",
            "/api/",
        ],
    }

    detected = []

    for feature, keywords in feature_map.items():
        if any(keyword in low for keyword in keywords):
            detected.append(feature)

    return detected


def classify_file(path):
    p = path.as_posix().lower()

    if "/components/admin/" in p:
        return "admin-component"

    if "/components/sandbox/templates/" in p:
        return "sandbox-template"

    if "/components/sandbox/" in p:
        return "sandbox-component"

    if "/components/" in p:
        return "react-component"

    if "/lib/" in p:
        return "library"

    if "/data/" in p:
        return "data"

    if "/assets/" in p:
        return "asset"

    if path.name == "package.json":
        return "package-config"

    if path.name.startswith("vite.config"):
        return "build-config"

    if path.name.startswith("tsconfig"):
        return "typescript-config"

    if path.suffix.lower() == ".css":
        return "stylesheet"

    if path.suffix.lower() == ".mjs":
        return "build-script"

    return "source"


# ---------------------------------------------------------
# COLLECT FILES
# ---------------------------------------------------------

files = []

for path in ROOT.rglob("*"):

    if not path.is_file():
        continue

    if any(part in IGNORE_DIRS for part in path.parts):
        continue

    if (
        path.suffix.lower() not in TEXT_EXTENSIONS
        and path.name not in SPECIAL_FILES
    ):
        continue

    text = read_text(path)

    files.append({
        "file": relative(path),
        "type": classify_file(path),
        "bytes": path.stat().st_size,
        "lines": line_count(text),
        "imports": extract_imports(text),
        "exports": extract_exports(text),
        "functions": extract_functions(text),
        "components": extract_components(text),
        "hooks": extract_hooks(text),
        "types": extract_types(text),
        "features": detect_features(text),
    })


file_names = {
    x["file"]
    for x in files
}


# ---------------------------------------------------------
# RESOLVE LOCAL IMPORT RELATIONSHIPS
# ---------------------------------------------------------

relationships = []


for item in files:

    source = Path(item["file"])

    for imp in item["imports"]:

        if not imp.startswith("."):
            continue

        base = ROOT / source.parent / imp

        candidates = [
            base,
            Path(str(base) + ".ts"),
            Path(str(base) + ".tsx"),
            Path(str(base) + ".js"),
            Path(str(base) + ".jsx"),
            Path(str(base) + ".mjs"),
            base / "index.ts",
            base / "index.tsx",
        ]

        target = None

        for candidate in candidates:

            try:
                candidate_rel = relative(candidate)
            except Exception:
                continue

            if candidate_rel in file_names:
                target = candidate_rel
                break

        if target:

            relationships.append({
                "from": item["file"],
                "to": target,
                "type": "imports"
            })


# ---------------------------------------------------------
# PACKAGE.JSON
# ---------------------------------------------------------

package_data = {}

package_path = ROOT / "package.json"

if package_path.exists():

    try:
        package_data = json.loads(
            read_text(package_path)
        )
    except Exception:
        package_data = {
            "error": "Could not parse package.json"
        }


# ---------------------------------------------------------
# FEATURE INDEX
# ---------------------------------------------------------

features = {}

all_features = [
    "firebase",
    "authentication",
    "payments",
    "pdf",
    "contracts",
    "templates",
    "sandbox",
    "admin",
    "customer",
    "translation",
    "currency",
    "audio",
    "signature",
    "storage",
    "routing",
    "api",
]

for feature in all_features:

    features[feature] = [
        x["file"]
        for x in files
        if feature in x["features"]
    ]


# ---------------------------------------------------------
# ENTRY POINTS
# ---------------------------------------------------------

entry_names = {
    "main.ts",
    "main.tsx",
    "index.ts",
    "index.tsx",
    "App.tsx",
    "App.jsx",
}

entry_points = [
    x["file"]
    for x in files
    if Path(x["file"]).name in entry_names
]


# ---------------------------------------------------------
# BUILD MARKDOWN
# ---------------------------------------------------------

out = ROOT / "PROJECT_SNAPSHOT.md"

with out.open("w", encoding="utf-8") as f:

    f.write("# PROJECT SNAPSHOT\n\n")

    f.write(
        "Generated automatically from the project source tree.\n\n"
    )

    # SUMMARY

    f.write("## 1. PROJECT SUMMARY\n\n")

    f.write(f"- Root: `{ROOT}`\n")
    f.write(f"- Files analyzed: **{len(files)}**\n")
    f.write(f"- Relationships discovered: **{len(relationships)}**\n\n")

    f.write("### Entry Points\n\n")

    for x in entry_points:
        f.write(f"- `{x}`\n")

    f.write("\n")

    # DIRECTORY STRUCTURE

    f.write("## 2. DIRECTORY / FILE STRUCTURE\n\n")

    for x in sorted(files, key=lambda z: z["file"]):
        f.write(
            f"- `{x['file']}` "
            f"({x['type']}, {x['lines']} lines, {x['bytes']} bytes)\n"
        )

    f.write("\n")

    # FEATURES

    f.write("## 3. FEATURE → FILE INDEX\n\n")

    for feature, paths in features.items():

        f.write(f"### {feature}\n\n")

        if paths:

            for path in paths:
                f.write(f"- `{path}`\n")

        else:
            f.write("- None detected\n")

        f.write("\n")

    # RELATIONSHIPS

    f.write("## 4. FILE IMPORT RELATIONSHIPS\n\n")

    for edge in sorted(
        relationships,
        key=lambda x: (x["from"], x["to"])
    ):

        f.write(
            f"- `{edge['from']}` "
            f"→ `{edge['to']}` "
            f"[{edge['type']}]\n"
        )

    f.write("\n")

    # DETAILED FILE INFORMATION

    f.write("## 5. DETAILED FILE INFORMATION\n\n")

    for item in sorted(files, key=lambda x: x["file"]):

        f.write(f"### `{item['file']}`\n\n")

        f.write(f"- Type: `{item['type']}`\n")
        f.write(f"- Lines: `{item['lines']}`\n")
        f.write(f"- Bytes: `{item['bytes']}`\n")

        f.write("\n#### Imports\n\n")

        if item["imports"]:
            for x in item["imports"]:
                f.write(f"- `{x}`\n")
        else:
            f.write("- None\n")

        f.write("\n#### Exports\n\n")

        if item["exports"]:
            for x in item["exports"]:
                f.write(f"- `{x}`\n")
        else:
            f.write("- None\n")

        f.write("\n#### Functions\n\n")

        if item["functions"]:
            for x in item["functions"]:
                f.write(f"- `{x}`\n")
        else:
            f.write("- None\n")

        f.write("\n#### React Components\n\n")

        if item["components"]:
            for x in item["components"]:
                f.write(f"- `{x}`\n")
        else:
            f.write("- None\n")

        f.write("\n#### Hooks\n\n")

        if item["hooks"]:
            for x in item["hooks"]:
                f.write(f"- `{x}`\n")
        else:
            f.write("- None\n")

        f.write("\n#### Types / Interfaces\n\n")

        if item["types"]:
            for x in item["types"]:
                f.write(f"- `{x}`\n")
        else:
            f.write("- None\n")

        f.write("\n#### Detected Features\n\n")

        if item["features"]:
            for x in item["features"]:
                f.write(f"- `{x}`\n")
        else:
            f.write("- None\n")

        f.write("\n")

    # PACKAGE

    f.write("## 6. PACKAGE.JSON\n\n")

    if package_data:

        f.write("```json\n")
        f.write(
            json.dumps(
                package_data,
                indent=2,
                ensure_ascii=False
            )
        )
        f.write("\n```\n\n")

    # RAW CONFIG FILES

    f.write("## 7. IMPORTANT CONFIGURATION FILES\n\n")

    config_names = {
        "vite.config.ts",
        "vite.config.js",
        "tsconfig.json",
        "tsconfig.app.json",
        "tsconfig.node.json",
        "tailwind.config.js",
        "tailwind.config.ts",
        "CLAUDE.md",
    }

    for path in sorted(files, key=lambda x: x["file"]):

        if Path(path["file"]).name not in config_names:
            continue

        real_path = ROOT / path["file"]

        if not real_path.exists():
            continue

        text = read_text(real_path)

        f.write(f"### `{path['file']}`\n\n")
        f.write("```text\n")
        f.write(text)
        f.write("\n```\n\n")


print()
print("=" * 60)
print("PROJECT SNAPSHOT CREATED")
print("=" * 60)
print(f"Files analyzed       : {len(files)}")
print(f"Relationships found  : {len(relationships)}")
print(f"Entry points         : {len(entry_points)}")
print(f"Output               : {out}")
print(f"Output size          : {out.stat().st_size:,} bytes")
print("=" * 60)
print()