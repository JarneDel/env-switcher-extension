import React, { useState, useRef, useEffect } from 'react';
import { getColorPalette } from '../libs/colorUtils';
import { cn } from '../lib/utils';

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  className?: string;
  triggerClassName?: string;
}

const ColorPicker: React.FC<ColorPickerProps> = ({ value, onChange, className = '', triggerClassName }) => {
  const [isOpen, setIsOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  const colors = getColorPalette();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleColorSelect = (color: string) => {
    onChange(color);
    setIsOpen(false);
  };

  return (
    <div className={cn('relative flex items-center', className)} ref={pickerRef}>
      <button
        type="button"
        className={cn(
          'size-6 rounded-sm border border-border cursor-pointer transition-colors hover:border-muted-foreground focus-visible:ring-2 focus-visible:ring-ring shrink-0',
          triggerClassName
        )}
        onClick={() => setIsOpen(!isOpen)}
        style={{ backgroundColor: value }}
        title="Select color"
      />

      {isOpen && (
        <div className="absolute top-[calc(100%+4px)] left-0 z-50 bg-card border border-border rounded-md p-2 shadow-lg w-[132px]">
          <div className="grid grid-cols-4 gap-1.5">
            {colors.map((color) => (
              <button
                key={color}
                type="button"
                className={cn(
                  'size-6 rounded-sm border cursor-pointer transition-all hover:scale-110',
                  value === color
                    ? 'border-primary border-2 scale-110 ring-2 ring-primary/30'
                    : 'border-border hover:border-muted-foreground'
                )}
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