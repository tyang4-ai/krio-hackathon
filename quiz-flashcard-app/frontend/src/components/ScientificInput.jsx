import React, { useState, useRef } from 'react';

/**
 * ScientificInput - Rich text input with scientific notation support
 * Supports: superscripts, subscripts, arrows, Greek letters, math symbols
 * Perfect for chemistry, physics, math, and other scientific subjects
 */
function ScientificInput({ value, onChange, placeholder = "Enter your answer..." }) {
  const inputRef = useRef(null);

  const insertSymbol = (symbol) => {
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

  // Symbol categories
  const symbols = {
    superscripts: [
      { label: 'x⁰', value: '⁰' },
      { label: 'x¹', value: '¹' },
      { label: 'x²', value: '²' },
      { label: 'x³', value: '³' },
      { label: 'x⁴', value: '⁴' },
      { label: 'x⁵', value: '⁵' },
      { label: 'x⁶', value: '⁶' },
      { label: 'x⁷', value: '⁷' },
      { label: 'x⁸', value: '⁸' },
      { label: 'x⁹', value: '⁹' },
      { label: 'x⁺', value: '⁺' },
      { label: 'x⁻', value: '⁻' },
    ],
    subscripts: [
      { label: 'x₀', value: '₀' },
      { label: 'x₁', value: '₁' },
      { label: 'x₂', value: '₂' },
      { label: 'x₃', value: '₃' },
      { label: 'x₄', value: '₄' },
      { label: 'x₅', value: '₅' },
      { label: 'x₆', value: '₆' },
      { label: 'x₇', value: '₇' },
      { label: 'x₈', value: '₈' },
      { label: 'x₉', value: '₉' },
      { label: 'x₊', value: '₊' },
      { label: 'x₋', value: '₋' },
    ],
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
    math: [
      { label: '±', value: '±' },
      { label: '×', value: '×' },
      { label: '÷', value: '÷' },
      { label: '≈', value: '≈' },
      { label: '≠', value: '≠' },
      { label: '≤', value: '≤' },
      { label: '≥', value: '≥' },
      { label: '∞', value: '∞' },
      { label: '√', value: '√' },
      { label: '∑', value: '∑' },
      { label: '∫', value: '∫' },
      { label: '∂', value: '∂' },
      { label: '°', value: '°' },
      { label: '′', value: '′' },
      { label: '″', value: '″' },
    ],
    chemistry: [
      { label: 'H₂O', value: 'H₂O' },
      { label: 'CO₂', value: 'CO₂' },
      { label: 'O₂', value: 'O₂' },
      { label: 'N₂', value: 'N₂' },
      { label: 'NH₃', value: 'NH₃' },
      { label: 'CH₄', value: 'CH₄' },
      { label: 'H₂SO₄', value: 'H₂SO₄' },
      { label: 'NaCl', value: 'NaCl' },
      { label: 'Ca²⁺', value: 'Ca²⁺' },
      { label: 'Na⁺', value: 'Na⁺' },
      { label: 'Cl⁻', value: 'Cl⁻' },
      { label: 'OH⁻', value: 'OH⁻' },
    ],
    fractions: [
      { label: '½', value: '½' },
      { label: '⅓', value: '⅓' },
      { label: '¼', value: '¼' },
      { label: '¾', value: '¾' },
      { label: '⅕', value: '⅕' },
      { label: '⅙', value: '⅙' },
      { label: '⅛', value: '⅛' },
      { label: '⅔', value: '⅔' },
      { label: '⅖', value: '⅖' },
      { label: '⅗', value: '⅗' },
      { label: '⅘', value: '⅘' },
      { label: '⅚', value: '⅚' },
    ],
  };

  return (
    <div className="scientific-input-wrapper">
      {/* Symbol Toolbar */}
      <div className="bg-gray-50 border border-gray-200 rounded-t-lg p-2 overflow-x-auto">
        <div className="flex flex-wrap gap-2 min-w-max">
          {/* Superscripts */}
          <div className="flex items-center gap-1">
            <span className="text-xs font-medium text-gray-600 mr-1">Superscript:</span>
            {symbols.superscripts.map((sym) => (
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

          {/* Subscripts */}
          <div className="flex items-center gap-1">
            <span className="text-xs font-medium text-gray-600 mr-1">Subscript:</span>
            {symbols.subscripts.map((sym) => (
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

          <div className="h-8 w-px bg-gray-300" />

          {/* Math Symbols */}
          <div className="flex items-center gap-1">
            <span className="text-xs font-medium text-gray-600 mr-1">Math:</span>
            {symbols.math.map((sym) => (
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

          {/* Chemistry Common Formulas */}
          <div className="flex items-center gap-1">
            <span className="text-xs font-medium text-gray-600 mr-1">Chemistry:</span>
            {symbols.chemistry.map((sym) => (
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

          {/* Fractions */}
          <div className="flex items-center gap-1">
            <span className="text-xs font-medium text-gray-600 mr-1">Fractions:</span>
            {symbols.fractions.map((sym) => (
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
      </div>

      {/* Input Field */}
      <textarea
        ref={inputRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full p-3 border border-t-0 border-gray-200 rounded-b-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-lg min-h-[120px] resize-y"
        style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
      />
    </div>
  );
}

export default ScientificInput;
