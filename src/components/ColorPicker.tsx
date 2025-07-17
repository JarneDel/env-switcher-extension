import React, { useState, useRef, useEffect } from 'react';
import { getColorPalette } from '../libs/colorUtils';

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  className?: string;
}

const ColorPicker: React.FC<ColorPickerProps> = ({ value, onChange, className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  // Get colors from the centralized utility
  const colors = getColorPalette();

  // Close picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleColorSelect = (color: string) => {
    onChange(color);
    setIsOpen(false);
  };

  return (
    <div className={`custom-color-picker ${className}`} ref={pickerRef}>
      <button
        type="button"
        className="color-preview"
        onClick={() => setIsOpen(!isOpen)}
        style={{ backgroundColor: value }}
        title="Select color"
      >
      </button>
      
      {isOpen && (
        <div className="color-palette">
          <div className="color-grid">
            {colors.map((color) => (
              <button
                key={color}
                type="button"
                className={`color-option ${value === color ? 'selected' : ''}`}
                style={{ backgroundColor: color }}
                onClick={() => handleColorSelect(color)}
                title={color}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ColorPicker;