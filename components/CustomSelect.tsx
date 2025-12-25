import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { springConfig } from '../lib/animations';

interface Option {
  value: string;
  label: string;
}

interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  icon?: string;
}

const CustomSelect: React.FC<CustomSelectProps> = ({
  value,
  onChange,
  options,
  placeholder = 'Seleccionar...',
  className = '',
  disabled = false,
  icon
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find(opt => opt.value === value);

  // Calculate dropdown position when opening
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + 8,
        left: rect.left,
        width: rect.width
      });
    }
  }, [isOpen]);

  // Update position on scroll/resize
  useEffect(() => {
    if (!isOpen) return;

    const updatePosition = () => {
      if (buttonRef.current) {
        const rect = buttonRef.current.getBoundingClientRect();
        setDropdownPosition({
          top: rect.bottom + 8,
          left: rect.left,
          width: rect.width
        });
      }
    };

    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);

    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node) &&
        listRef.current &&
        !listRef.current.contains(e.target as Node)
      ) {
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

  useEffect(() => {
    if (isOpen && highlightedIndex >= 0 && listRef.current) {
      const scrollContainer = listRef.current.querySelector('.overflow-y-auto');
      if (scrollContainer) {
        const item = scrollContainer.children[highlightedIndex] as HTMLElement;
        if (item) {
          item.scrollIntoView({ block: 'nearest' });
        }
      }
    }
  }, [highlightedIndex, isOpen]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    switch (e.key) {
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (isOpen && highlightedIndex >= 0) {
          onChange(options[highlightedIndex].value);
          setIsOpen(false);
        } else {
          setIsOpen(true);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        break;
      case 'ArrowDown':
        e.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
        } else {
          setHighlightedIndex(prev =>
            prev < options.length - 1 ? prev + 1 : 0
          );
        }
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (isOpen) {
          setHighlightedIndex(prev =>
            prev > 0 ? prev - 1 : options.length - 1
          );
        }
        break;
    }
  };

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
  };

  const dropdownContent = (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={listRef}
          style={{
            position: 'fixed',
            top: dropdownPosition.top,
            left: dropdownPosition.left,
            width: dropdownPosition.width,
            zIndex: 99999
          }}
          className="glass-darker border border-white/10 rounded-xl shadow-apple-lg overflow-hidden"
          initial={{ opacity: 0, y: -8, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.96 }}
          transition={springConfig.snappy}
        >
          <div className="max-h-60 overflow-y-auto py-1">
            {options.map((option, index) => (
              <button
                key={option.value}
                type="button"
                onClick={() => handleSelect(option.value)}
                onMouseEnter={() => setHighlightedIndex(index)}
                className={`
                  w-full px-3 py-2.5 text-sm text-left flex items-center justify-between
                  apple-transition
                  ${option.value === value
                    ? 'text-primary bg-primary/10'
                    : 'text-white hover:bg-white/5'
                  }
                  ${highlightedIndex === index ? 'bg-white/10' : ''}
                `}
              >
                <span className="truncate">{option.label}</span>
                {option.value === value && (
                  <motion.span
                    className="material-icons-round text-primary text-lg"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={springConfig.snappy}
                  >
                    check
                  </motion.span>
                )}
              </button>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <div
      ref={containerRef}
      className={`relative ${className}`}
    >
      <button
        ref={buttonRef}
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        className={`
          w-full flex items-center justify-between gap-2
          glass border border-white/10 rounded-xl px-3 py-2.5
          text-sm text-left apple-transition
          focus:outline-none focus:ring-2 focus:ring-primary/50
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-white/20'}
          ${isOpen ? 'ring-2 ring-primary/50 border-primary/50' : ''}
        `}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {icon && (
            <span className="material-icons-round text-muted-dark text-lg">{icon}</span>
          )}
          <span className={`truncate ${selectedOption ? 'text-white' : 'text-muted-dark'}`}>
            {selectedOption?.label || placeholder}
          </span>
        </div>
        <motion.span
          className="material-icons-round text-muted-dark text-lg flex-shrink-0"
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={springConfig.snappy}
        >
          expand_more
        </motion.span>
      </button>

      {createPortal(dropdownContent, document.body)}
    </div>
  );
};

export default CustomSelect;
