import React, { useState, useRef, ChangeEvent } from 'react';

interface ScientificInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

type FormatMode = 'superscript' | 'subscript' | null;

interface Symbol {
  label: string;
  value: string;
}

/**
 * ScientificInput - Rich text input with scientific notation support
 * Features:
 * - Toggle buttons for superscript/subscript formatting
 * - Auto-convert ^ to superscripts (e.g., x^2 → x²)
 * - Auto-convert / to fractions with superscript numerator and subscript denominator
 * - Arrows and Greek letters for scientific notation
 * Perfect for chemistry, physics, math, and other scientific subjects
 */
function ScientificInput({ value, onChange, placeholder = "Enter your answer..." }: ScientificInputProps): React.ReactElement {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [formatMode, setFormatMode] = useState<FormatMode>(null);

  // Character mappings
  const normalToSuperscript: Record<string, string> = {
    '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
    '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
    '+': '⁺', '-': '⁻', '=': '⁼', '(': '⁽', ')': '⁾',
    'n': 'ⁿ', 'a': 'ᵃ', 'b': 'ᵇ', 'c': 'ᶜ', 'd': 'ᵈ',
    'e': 'ᵉ', 'f': 'ᶠ', 'g': 'ᵍ', 'h': 'ʰ', 'i': 'ⁱ',
    'j': 'ʲ', 'k': 'ᵏ', 'l': 'ˡ', 'm': 'ᵐ', 'o': 'ᵒ',
    'p': 'ᵖ', 'r': 'ʳ', 's': 'ˢ', 't': 'ᵗ', 'u': 'ᵘ',
    'v': 'ᵛ', 'w': 'ʷ', 'x': 'ˣ', 'y': 'ʸ', 'z': 'ᶻ'
  };

  const normalToSubscript: Record<string, string> = {
    '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄',
    '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉',
    '+': '₊', '-': '₋', '=': '₌', '(': '₍', ')': '₎',
    'a': 'ₐ', 'e': 'ₑ', 'h': 'ₕ', 'i': 'ᵢ', 'j': 'ⱼ',
    'k': 'ₖ', 'l': 'ₗ', 'm': 'ₘ', 'n': 'ₙ', 'o': 'ₒ',
    'p': 'ₚ', 'r': 'ᵣ', 's': 'ₛ', 't': 'ₜ', 'u': 'ᵤ',
    'v': 'ᵥ', 'x': 'ₓ'
  };

  const insertSymbol = (symbol: string): void => {
    const input = inputRef.current;
    if (!input) return;

    const start = input.selectionStart;
    const end = input.selectionEnd;
    const newValue = value.substring(0, start) + symbol + value.substring(end);

    onChange(newValue);

    // Restore cursor position after insertion
    setTimeout(() => {
      input.focus();
      const newPos = start + symbol.length;
      input.setSelectionRange(newPos, newPos);
    }, 0);
  };

  const toggleFormat = (mode: 'superscript' | 'subscript'): void => {
    const input = inputRef.current;
    if (!input) return;

    const start = input.selectionStart;
    const end = input.selectionEnd;

    // If no text selected, toggle mode for future typing
    if (start === end) {
      setFormatMode(formatMode === mode ? null : mode);
      return;
    }

    // Convert selected text
    const selectedText = value.substring(start, end);
    const mapping = mode === 'superscript' ? normalToSuperscript : normalToSubscript;
    const convertedText = selectedText.split('').map(char => mapping[char] || char).join('');

    const newValue = value.substring(0, start) + convertedText + value.substring(end);
    onChange(newValue);

    setTimeout(() => {
      input.focus();
      input.setSelectionRange(start, start + convertedText.length);
    }, 0);
  };

  const convertToSuperscript = (text: string): string => {
    return text.split('').map(char => normalToSuperscript[char] || char).join('');
  };

  const convertToSubscript = (text: string): string => {
    return text.split('').map(char => normalToSubscript[char] || char).join('');
  };

  const handleInputChange = (e: ChangeEvent<HTMLTextAreaElement>): void => {
    let newValue = e.target.value;
    const cursorPos = e.target.selectionStart;

    // Auto-convert ^ to superscript
    if (newValue.includes('^')) {
      const beforeCursor = newValue.substring(0, cursorPos);
      const afterCursor = newValue.substring(cursorPos);

      // Find the last ^ before cursor
      const lastCaretIndex = beforeCursor.lastIndexOf('^');
      if (lastCaretIndex !== -1) {
        // Get the number/characters after ^
        const afterCaret = beforeCursor.substring(lastCaretIndex + 1);
        const beforeCaret = beforeCursor.substring(0, lastCaretIndex);

        // Convert to superscript
        const converted = convertToSuperscript(afterCaret);
        newValue = beforeCaret + converted + afterCursor;

        // Update value and cursor position
        onChange(newValue);
        setTimeout(() => {
          const newPos = lastCaretIndex + converted.length;
          inputRef.current?.setSelectionRange(newPos, newPos);
        }, 0);
        return;
      }
    }

    // Auto-convert / to fraction (numerator as superscript, denominator as subscript)
    if (newValue.includes('/')) {
      const beforeCursor = newValue.substring(0, cursorPos);
      const afterCursor = newValue.substring(cursorPos);

      // Find the last / before cursor
      const lastSlashIndex = beforeCursor.lastIndexOf('/');
      if (lastSlashIndex !== -1) {
        const afterSlash = beforeCursor.substring(lastSlashIndex + 1);

        // Only convert if we have something after the slash (denominator)
        if (afterSlash.length > 0) {
          // Find the numerator - go back to find digits/letters before the /
          let numeratorStart = lastSlashIndex - 1;
          while (numeratorStart >= 0 && /[0-9a-zA-Z]/.test(beforeCursor[numeratorStart])) {
            numeratorStart--;
          }
          numeratorStart++; // Move to the first digit/letter

          const beforeNumerator = beforeCursor.substring(0, numeratorStart);
          const numerator = beforeCursor.substring(numeratorStart, lastSlashIndex);
          const denominator = afterSlash;

          // Convert numerator to superscript and denominator to subscript
          const convertedNumerator = convertToSuperscript(numerator);
          const convertedDenominator = convertToSubscript(denominator);

          // Create the fraction: ⁿᵘᵐ⁄ₐₑₙ
          newValue = beforeNumerator + convertedNumerator + '⁄' + convertedDenominator + afterCursor;

          // Update value and cursor position
          onChange(newValue);
          setTimeout(() => {
            const newPos = beforeNumerator.length + convertedNumerator.length + 1 + convertedDenominator.length;
            inputRef.current?.setSelectionRange(newPos, newPos);
          }, 0);
          return;
        }
      }
    }

    // Apply format mode if active
    if (formatMode && cursorPos > 0) {
      const lastChar = newValue.charAt(cursorPos - 1);
      const mapping = formatMode === 'superscript' ? normalToSuperscript : normalToSubscript;

      if (mapping[lastChar]) {
        const before = newValue.substring(0, cursorPos - 1);
        const after = newValue.substring(cursorPos);
        newValue = before + mapping[lastChar] + after;

        onChange(newValue);
        setTimeout(() => {
          inputRef.current?.setSelectionRange(cursorPos, cursorPos);
        }, 0);
        return;
      }
    }

    onChange(newValue);
  };

  // Symbol categories
  const symbols: Record<string, Symbol[]> = {
    arrows: [
      { label: '→', value: '→' },
      { label: '←', value: '←' },
      { label: '↑', value: '↑' },
      { label: '↓', value: '↓' },
      { label: '↔', value: '↔' },
      { label: '⇌', value: '⇌' },
      { label: '⇒', value: '⇒' },
      { label: '⇐', value: '⇐' },
    ],
    greek: [
      { label: 'α', value: 'α' },
      { label: 'β', value: 'β' },
      { label: 'γ', value: 'γ' },
      { label: 'δ', value: 'δ' },
      { label: 'ε', value: 'ε' },
      { label: 'θ', value: 'θ' },
      { label: 'λ', value: 'λ' },
      { label: 'μ', value: 'μ' },
      { label: 'π', value: 'π' },
      { label: 'σ', value: 'σ' },
      { label: 'τ', value: 'τ' },
      { label: 'φ', value: 'φ' },
      { label: 'Δ', value: 'Δ' },
      { label: 'Σ', value: 'Σ' },
      { label: 'Ω', value: 'Ω' },
    ],
  };

  return (
    <div className="scientific-input-wrapper">
      {/* Symbol Toolbar */}
      <div className="bg-gray-50 border border-gray-200 rounded-t-lg p-2">
        <div className="flex flex-wrap gap-2 items-center">
          {/* Format Toggle Buttons */}
          <div className="flex items-center gap-1">
            <span className="text-xs font-medium text-gray-600 mr-1">Format:</span>
            <button
              type="button"
              onClick={() => toggleFormat('superscript')}
              className={`px-3 py-1.5 text-sm font-medium rounded transition-colors ${
                formatMode === 'superscript'
                  ? 'bg-blue-500 text-white border-blue-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-blue-50'
              } border`}
              title="Toggle superscript (or type ^ for auto-convert)"
            >
              x<sup>2</sup>
            </button>
            <button
              type="button"
              onClick={() => toggleFormat('subscript')}
              className={`px-3 py-1.5 text-sm font-medium rounded transition-colors ${
                formatMode === 'subscript'
                  ? 'bg-blue-500 text-white border-blue-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-blue-50'
              } border`}
              title="Toggle subscript"
            >
              H<sub>2</sub>O
            </button>
            {formatMode && (
              <span className="text-xs text-blue-600 ml-1">
                {formatMode === 'superscript' ? 'Superscript mode active' : 'Subscript mode active'}
              </span>
            )}
          </div>

          <div className="h-8 w-px bg-gray-300" />

          {/* Arrows */}
          <div className="flex items-center gap-1">
            <span className="text-xs font-medium text-gray-600 mr-1">Arrows:</span>
            {symbols.arrows.map((sym) => (
              <button
                key={sym.value}
                type="button"
                onClick={() => insertSymbol(sym.value)}
                className="px-2 py-1 text-sm bg-white border border-gray-300 rounded hover:bg-blue-50 hover:border-blue-400 transition-colors"
                title={`Insert ${sym.label}`}
              >
                {sym.label}
              </button>
            ))}
          </div>

          <div className="h-8 w-px bg-gray-300" />

          {/* Greek Letters */}
          <div className="flex items-center gap-1">
            <span className="text-xs font-medium text-gray-600 mr-1">Greek:</span>
            {symbols.greek.map((sym) => (
              <button
                key={sym.value}
                type="button"
                onClick={() => insertSymbol(sym.value)}
                className="px-2 py-1 text-sm bg-white border border-gray-300 rounded hover:bg-blue-50 hover:border-blue-400 transition-colors"
                title={`Insert ${sym.label}`}
              >
                {sym.label}
              </button>
            ))}
          </div>
        </div>

        {/* Help Text */}
        <div className="mt-2 text-xs text-gray-600 bg-blue-50 border border-blue-200 rounded px-2 py-1">
          <strong>Tips:</strong> Type <code className="bg-white px-1 rounded">^</code> for superscripts (e.g., x^2 → x²)
          • Type <code className="bg-white px-1 rounded">/</code> for fractions (e.g., 3/4 → ³⁄₄)
          • Select text and click format buttons to convert
        </div>
      </div>

      {/* Input Field */}
      <textarea
        ref={inputRef}
        value={value}
        onChange={handleInputChange}
        placeholder={placeholder}
        className="w-full p-3 border border-t-0 border-gray-200 rounded-b-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-lg min-h-[120px] resize-y"
        style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
      />
    </div>
  );
}

export default ScientificInput;
