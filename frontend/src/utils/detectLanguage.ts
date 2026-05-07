/**
 * IndAI — Language Detector
 * Detects programming language from code content using pattern matching.
 * Covers all 22 supported languages with weighted heuristics.
 */

interface LangPattern {
  keywords: RegExp[];
  structures: RegExp[];
  weight?: number;
}

const LANG_PATTERNS: Record<string, LangPattern> = {
  python: {
    keywords: [
      /\bdef\s+\w+\s*\(/,
      /\bimport\s+\w+/,
      /\bfrom\s+\w+\s+import\b/,
      /\bclass\s+\w+.*:/,
      /\bif\s+.*:/,
      /\belif\b/,
      /\bself\./,
      /\b__init__\b/,
      /\b__name__\b/,
      /\blambda\s/,
    ],
    structures: [
      /^\s*@\w+/m,                    // decorators
      /\bTrue\b|\bFalse\b|\bNone\b/,
      /:\s*$/m,                        // colon blocks
      /\bexcept\s+\w+/,
      /\bwith\s+\w+.*\bas\b/,
      /\bprint\s*\(/,
    ],
    weight: 1.15,
  },
  javascript: {
    keywords: [
      /\bconst\s+\w+\s*=/,
      /\blet\s+\w+\s*=/,
      /\bvar\s+\w+\s*=/,
      /\bfunction\s+\w+\s*\(/,
      /=>\s*[{(]/,
      /\bconsole\.(log|error|warn)\s*\(/,
      /\brequire\s*\(/,
      /\bmodule\.exports\b/,
      /\bdocument\.\w+/,
      /\bwindow\.\w+/,
      /<\w+[^>]*>/,                    // JSX elements
      /<\/\w+>/,                       // JSX closing tags
    ],
    structures: [
      /\basync\s+function\b/,
      /\bawait\s+/,
      /\.then\s*\(/,
      /\.catch\s*\(/,
      /\bnull\b/,
      /\bundefined\b/,
      /===|!==/,
      /\buse\w+\s*\(/,                 // React hooks like useState, useEffect
    ],
  },
  typescript: {
    keywords: [
      /:\s*(string|number|boolean|void|any)\b/,
      /\binterface\s+\w+/,
      /\btype\s+\w+\s*=/,
      /\benum\s+\w+/,
      /\bas\s+(string|number|boolean|any)\b/,
      /\<\w+\>/,                       // generics
    ],
    structures: [
      /\bReadonly\</, 
      /\bPartial\</,
      /\bRecord\</,
      /\bPromise\</,
      /\bexport\s+(interface|type)\b/,
      /\?:\s*\w+/,                     // optional properties
    ],
    weight: 1.3, // boost — TS patterns are very distinctive
  },
  php: {
    keywords: [
      /\$\w+\s*=/,
      /\becho\s+/,
      /\bfunction\s+\w+\s*\(/,
      /\b\-\>\w+/,
      /\b::\w+/,
      /\barray\s*\(/,
      /\bnew\s+\w+\s*\(/,
    ],
    structures: [
      /<\?php\b/,
      /\?\>/,
      /\$this\-\>/,
      /\buse\s+[\w\\]+;/,
      /\bnamespace\s+[\w\\]+;/,
      /\bpublic\s+function\b/,
    ],
    weight: 1.4,
  },
  java: {
    keywords: [
      /\bpublic\s+(static\s+)?void\s+main\b/,
      /\bSystem\.out\.print/,
      /\bpublic\s+class\s+\w+/,
      /\bprivate\s+(static\s+)?\w+\s+\w+/,
      /\bimport\s+java\.\w+/,
      /\bnew\s+\w+\s*\(/,
      /\b(int|boolean|double|float|long|char)\s+\w+/,
    ],
    structures: [
      /\bpackage\s+[\w.]+;/,
      /\bextends\s+\w+/,
      /\bimplements\s+\w+/,
      /@Override\b/,
      /\bthrows\s+\w+/,
      /\bString\[\]\s+args\b/,
    ],
    weight: 1.2,
  },
  csharp: {
    keywords: [
      /\busing\s+System/,
      /\bnamespace\s+\w+/,
      /\bConsole\.(Write|ReadLine)/,
      /\bvar\s+\w+\s*=\s*new\b/,
      /\bstring\[\]\s+args\b/,
    ],
    structures: [
      /\bpublic\s+(partial\s+)?class\b/,
      /\basync\s+Task\b/,
      /\bIEnumerable\b/,
      /\bLinq\b/,
      /\b\[.*\]\s*(public|private)/,   // attributes
      /=>\s*{/,
    ],
    weight: 1.2,
  },
  go: {
    keywords: [
      /\bfunc\s+\w+\s*\(/,
      /\bfmt\.\w+/,
      /\bpackage\s+main\b/,
      /\bimport\s+\(/,
      /\bgo\s+func\b/,
      /\bchan\s+\w+/,
      /\bdefer\s+/,
    ],
    structures: [
      /\bstruct\s*{/,
      /:=\s*/,                         // short assignment
      /\bgoroutine\b/,
      /\binterface\s*{/,
      /\bfunc\s+\(\w+\s+\*?\w+\)\s+\w+/,  // method receiver
    ],
    weight: 1.3,
  },
  ruby: {
    keywords: [
      /\bdef\s+\w+/,
      /\bend\s*$/m,
      /\bputs\s+/,
      /\brequire\s+['"]/,
      /\battr_(accessor|reader|writer)\b/,
      /\bdo\s*\|/,
    ],
    structures: [
      /\bclass\s+\w+\s*<\s*\w+/,
      /\bmodule\s+\w+/,
      /\byield\b/,
      /\b\w+\.\w+\s+do\b/,
      /#\{.*\}/,                       // string interpolation
    ],
  },
  sql: {
    keywords: [
      /\bSELECT\s+/i,
      /\bFROM\s+\w+/i,
      /\bWHERE\s+/i,
      /\bINSERT\s+INTO\b/i,
      /\bUPDATE\s+\w+\s+SET\b/i,
      /\bDELETE\s+FROM\b/i,
      /\bCREATE\s+TABLE\b/i,
      /\bALTER\s+TABLE\b/i,
      /\bDROP\s+TABLE\b/i,
    ],
    structures: [
      /\bINNER\s+JOIN\b/i,
      /\bLEFT\s+JOIN\b/i,
      /\bGROUP\s+BY\b/i,
      /\bORDER\s+BY\b/i,
      /\bHAVING\s+/i,
      /\bVARCHAR\s*\(/i,
    ],
    weight: 1.5,
  },
  bash: {
    keywords: [
      /^#!/m,                          // shebang
      /\b(echo|printf)\s+/,
      /\bif\s+\[\s*/,
      /\bfi\b/,
      /\bdo\b/,
      /\bdone\b/,
      /\besac\b/,
    ],
    structures: [
      /\$\(\w+/,                       // command substitution
      /\$\{\w+/,                       // variable expansion
      /\bgrep\b|\bsed\b|\bawk\b/,
      /\bchmod\b|\bchown\b/,
      /\|\s*\w+/,                      // pipes
      /^#!\/bin\/(bash|sh)/m,
    ],
    weight: 1.3,
  },
  powershell: {
    keywords: [
      /\$\w+\s*=/,
      /\bWrite-Host\b/,
      /\bGet-\w+/,
      /\bSet-\w+/,
      /\bNew-\w+/,
      /\b-eq\b|-ne\b|-gt\b|-lt\b/,
    ],
    structures: [
      /\bparam\s*\(/i,
      /\bfunction\s+\w+-\w+/,
      /\b\[CmdletBinding\b/,
      /\bForEach-Object\b/,
      /\bWhere-Object\b/,
      /\$PSScriptRoot\b/,
    ],
    weight: 1.4,
  },
  perl: {
    keywords: [
      /\bmy\s+\$\w+/,
      /\buse\s+strict\b/,
      /\buse\s+warnings\b/,
      /\bsub\s+\w+\s*{/,
      /\bprint\s+"/,
      /\bdie\s+"/,
    ],
    structures: [
      /\$_\b/,
      /\@_\b/,
      /%\w+\s*=/,
      /=~/,                            // regex match
      /\bqw\(/,
      /\bchomp\b/,
    ],
  },
  lua: {
    keywords: [
      /\blocal\s+\w+\s*=/,
      /\bfunction\s+\w+\s*\(/,
      /\bend\s*$/m,
      /\bprint\s*\(/,
      /\bthen\b/,
      /\belseif\b/,
    ],
    structures: [
      /\brequire\s*[("]/,
      /\btable\.\w+/,
      /\bstring\.\w+/,
      /\bmath\.\w+/,
      /\.\.\s/,                        // concatenation
      /~=/,                            // not equal
    ],
  },
  rust: {
    keywords: [
      /\bfn\s+\w+\s*\(/,
      /\blet\s+mut\s+\w+/,
      /\blet\s+\w+:\s*\w+/,
      /\bimpl\s+\w+/,
      /\bpub\s+fn\b/,
      /\bmatch\s+\w+/,
    ],
    structures: [
      /\buse\s+std::/,
      /\bprintln!\s*\(/,
      /\bvec!\s*\[/,
      /\b->\s*\w+/,                    // return type
      /\bOption\<|\bResult\</,
      /\b&mut\s+\w+/,
      /\bstruct\s+\w+/,
    ],
    weight: 1.4,
  },
  swift: {
    keywords: [
      /\bvar\s+\w+:\s*\w+/,
      /\blet\s+\w+:\s*\w+/,
      /\bfunc\s+\w+\s*\(/,
      /\bguard\s+let\b/,
      /\bif\s+let\b/,
      /\bimport\s+UIKit\b/,
    ],
    structures: [
      /\bprotocol\s+\w+/,
      /\bextension\s+\w+/,
      /\bstruct\s+\w+/,
      /\benum\s+\w+/,
      /\bprint\s*\(/,
      /\b@IBOutlet\b|\b@IBAction\b/,
    ],
  },
  kotlin: {
    keywords: [
      /\bfun\s+\w+\s*\(/,
      /\bval\s+\w+/,
      /\bvar\s+\w+/,
      /\bprintln\s*\(/,
      /\bwhen\s*\(/,
      /\bdata\s+class\b/,
    ],
    structures: [
      /\bcompanion\s+object\b/,
      /\bobject\s+\w+/,
      /\bsealed\s+class\b/,
      /\b->\s*{/,
      /\bimport\s+kotlin\.\w+/,
      /\b:\s*\w+\s*\{/,
    ],
    weight: 1.2,
  },
  c: {
    keywords: [
      /\b#include\s*<\w+\.h>/,
      /\bint\s+main\s*\(/,
      /\bprintf\s*\(/,
      /\bscanf\s*\(/,
      /\bmalloc\s*\(/,
      /\bfree\s*\(/,
    ],
    structures: [
      /\btypedef\s+struct\b/,
      /\bsizeof\s*\(/,
      /\b(int|char|float|double|void)\s+\*?\w+/,
      /\bNULL\b/,
      /\b#define\s+\w+/,
      /\b#ifndef\b/,
    ],
  },
  cpp: {
    keywords: [
      /\b#include\s*<iostream>/,
      /\bstd::\w+/,
      /\bcout\s*<</,
      /\bcin\s*>>/,
      /\bclass\s+\w+\s*{/,
      /\bnamespace\s+\w+/,
    ],
    structures: [
      /\btemplate\s*</,
      /\bvector\s*</,
      /\busing\s+namespace\b/,
      /\bvirtual\s+\w+/,
      /\b~\w+\s*\(\)/,                 // destructor
      /\bnew\s+\w+/,
    ],
    weight: 1.2,
  },
  r: {
    keywords: [
      /\b<-\s*/,                       // assignment
      /\blibrary\s*\(/,
      /\bdata\.frame\s*\(/,
      /\bfunction\s*\(/,
      /\bplot\s*\(/,
      /\bggplot\s*\(/,
    ],
    structures: [
      /\bc\s*\(/,
      /\bmatrix\s*\(/,
      /\bsummary\s*\(/,
      /\bprint\s*\(/,
      /\bfor\s*\(\w+\s+in\b/,
      /\bTRUE\b|\bFALSE\b/,
    ],
  },
  xml: {
    keywords: [
      /<\?xml\s+/,
      /<\/?\w+[\s>]/,
      /\bxmlns\s*=/,
    ],
    structures: [
      /<!\-\-/,
      /<!\[CDATA\[/,
      /<\/\w+>/,
      /\bencoding\s*="/,
    ],
    weight: 1.5,
  },
  html: {
    keywords: [
      /<!DOCTYPE\s+html/i,
      /<html\b/i,
      /<head\b/i,
      /<body\b/i,
      /<div\b/i,
      /<script\b/i,
      /<link\b/i,
    ],
    structures: [
      /<\/html>/i,
      /<\/body>/i,
      /<meta\b/i,
      /class\s*="/i,
      /id\s*="/i,
      /<style\b/i,
    ],
    weight: 1.3,
  },
  yaml: {
    keywords: [
      /^\w+:\s+/m,
      /^\s*-\s+\w+/m,
      /^\s+\w+:\s+/m,
    ],
    structures: [
      /^---\s*$/m,
      /^\.\.\.\s*$/m,
      /\b(true|false)\b/,
      /\bnull\b/,
    ],
  },
};

/**
 * Detect the programming language of a code snippet.
 * Returns the best-match language value from the LANGUAGES list, or null.
 */
export function detectLanguage(code: string): string | null {
  if (!code || code.trim().length < 10) return null;

  const scores: Record<string, number> = {};

  for (const [lang, pattern] of Object.entries(LANG_PATTERNS)) {
    let score = 0;
    const weight = pattern.weight || 1;

    for (const regex of pattern.keywords) {
      const matches = code.match(new RegExp(regex.source, regex.flags + (regex.flags.includes("g") ? "" : "g")));
      if (matches) score += matches.length * 2;
    }

    for (const regex of pattern.structures) {
      const matches = code.match(new RegExp(regex.source, regex.flags + (regex.flags.includes("g") ? "" : "g")));
      if (matches) score += matches.length * 3;
    }

    scores[lang] = score * weight;
  }

  // Find highest score
  let bestLang: string | null = null;
  let bestScore = 0;

  for (const [lang, score] of Object.entries(scores)) {
    if (score > bestScore) {
      bestScore = score;
      bestLang = lang;
    }
  }

  // Minimum confidence threshold
  if (bestScore < 4) return null;

  return bestLang;
}
