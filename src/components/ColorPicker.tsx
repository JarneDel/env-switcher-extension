import React, { useState, useRef, useEffect } from 'react';

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  className?: string;
}

const ColorPicker: React.FC<ColorPickerProps> = ({ value, onChange, className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  // Predefined color palette
  const colors = [
    '#ef4444', '#f97316', '#eab308', '#22c55e', 
    '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899',
    '#6b7280', '#1f2937', '#000000', '#ffffff'
  ];

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