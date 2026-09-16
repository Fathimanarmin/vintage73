import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { FiSearch, FiChevronDown } from 'react-icons/fi';
import { useTheme } from '@/context/ThemeContext';

const SearchableSelect = ({
    options,
    value,
    onChange,
    placeholder = "Select option",
    className = "",
    triggerClassName = "",
    direction = 'down',   // 'down' | 'up' | 'auto'
    zIndex = 100005,
}) => {
    const { theme } = useTheme();
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [panelStyle, setPanelStyle] = useState({});
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const wrapperRef = useRef(null);
    const panelRef  = useRef(null);
    const inputRef  = useRef(null);

    const selectedOption = (options || []).find(opt => opt.value == value);

    // ── Compute fixed-position coordinates ───────────────────────────────────
    const computePanel = useCallback(() => {
        if (!wrapperRef.current) return;
        const rect        = wrapperRef.current.getBoundingClientRect();
        const PANEL_MAX_H = 300;
        const GAP         = 4;

        const spaceBelow = window.innerHeight - rect.bottom - GAP;
        const spaceAbove = rect.top - GAP;

        const openAbove =
            direction === 'up'   ? true  :
            direction === 'down' ? false :
            (spaceBelow < PANEL_MAX_H && spaceAbove > spaceBelow);

        // Keep panel from overflowing the left or right edges of the screen
        const maxPanelW = window.innerWidth - 16; // 8px safety padding on each side
        const panelW    = Math.min(Math.max(rect.width, 180), maxPanelW);
        const left      = Math.max(8, Math.min(rect.left, window.innerWidth - panelW - 8));

        if (openAbove) {
            setPanelStyle({
                position: 'fixed',
                bottom  : window.innerHeight - rect.top + GAP,
                left,
                width   : panelW,
                zIndex  : zIndex,
            });
        } else {
            setPanelStyle({
                position: 'fixed',
                top     : rect.bottom + GAP,
                left,
                width   : panelW,
                zIndex  : zIndex,
            });
        }
    }, [direction, zIndex]);

    // Recompute when open / on scroll or resize
    useEffect(() => {
        if (!isOpen) return;
        computePanel();
        const handle = () => computePanel();
        window.addEventListener('scroll', handle, true);
        window.addEventListener('resize', handle);
        return () => {
            window.removeEventListener('scroll', handle, true);
            window.removeEventListener('resize', handle);
        };
    }, [isOpen, computePanel]);

    // Auto-focus the search input
    useEffect(() => {
        if (isOpen && inputRef.current) {
            const t = setTimeout(() => inputRef.current?.focus(), 50);
            return () => clearTimeout(t);
        }
    }, [isOpen]);

    // Close on outside click / touch (uses refs, not id)
    useEffect(() => {
        const handleOutside = (e) => {
            const inWrapper = wrapperRef.current?.contains(e.target);
            const inPanel   = panelRef.current?.contains(e.target);
            if (!inWrapper && !inPanel) {
                setIsOpen(false);
                setSearchTerm('');
            }
        };
        document.addEventListener('mousedown', handleOutside);
        document.addEventListener('touchstart', handleOutside);
        return () => {
            document.removeEventListener('mousedown', handleOutside);
            document.removeEventListener('touchstart', handleOutside);
        };
    }, []);

    const filteredOptions = (options || []).filter(opt =>
        (opt.label || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleSelect = (val) => {
        onChange(val);
        setIsOpen(false);
        setSearchTerm('');
    };

    const toggleOpen = () => {
        if (!isOpen) computePanel();
        setIsOpen(prev => !prev);
    };

    return (
        <>
            {/* ── Trigger ── */}
            <div className={`relative ${className}`} ref={wrapperRef}>
                <div
                    onClick={toggleOpen}
                    className={`w-full bg-white border rounded-lg px-4 flex items-center justify-between cursor-pointer transition-all shadow-sm ${
                        isOpen
                            ? 'border-primary ring-2 ring-primary/20'
                            : 'border-slate-200 hover:border-slate-300'
                    } ${triggerClassName || 'min-h-[48px]'}`}
                    style={isOpen ? { borderColor: theme.primaryColor, boxShadow: `0 0 0 2px ${theme.primaryColor}33` } : {}}
                >
                    <span className={`text-sm truncate ${selectedOption ? 'text-slate-800 font-semibold' : 'text-slate-400 font-medium'}`}>
                        {selectedOption ? selectedOption.label : placeholder}
                    </span>
                    <FiChevronDown
                        className={`text-slate-400 transition-transform duration-200 flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`}
                        size={16}
                    />
                </div>
            </div>

            {/* ── Fixed panel — escapes any overflow:hidden/auto ancestor ── */}
            {isOpen && mounted && typeof document !== 'undefined' && createPortal(
                <div
                    ref={panelRef}
                    style={{ ...panelStyle, maxHeight: PANEL_MAX_H }}
                    className="bg-white border border-slate-200 shadow-2xl rounded-xl overflow-hidden animate-in fade-in zoom-in-95 duration-100 flex flex-col"
                >
                    {/* Search bar */}
                    <div className="p-2 border-b border-slate-100 bg-slate-50 flex-shrink-0">
                        <div className="relative">
                            <FiSearch className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                            <input
                                ref={inputRef}
                                type="text"
                                className="w-full pl-8 pr-2 py-1.5 text-xs bg-white border border-slate-200 rounded focus:outline-none transition-all"
                                style={searchTerm ? { borderColor: theme.primaryColor, boxShadow: `0 0 0 1px ${theme.primaryColor}33` } : {}}
                                placeholder="Search..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                            />
                        </div>
                    </div>

                    {/* Options */}
                    <div className="overflow-y-auto custom-scrollbar py-1">
                        {filteredOptions.length > 0 ? (
                            filteredOptions.map((opt) => (
                                <div
                                    key={opt.value}
                                    onClick={() => handleSelect(opt.value)}
                                    className={`px-3 py-2.5 text-[12px] cursor-pointer transition-colors border-b border-slate-50 last:border-0 ${
                                        value == opt.value
                                            ? 'bg-slate-100 font-semibold'
                                            : 'hover:bg-slate-50 text-slate-700'
                                    }`}
                                    style={value == opt.value ? { color: theme.primaryColor } : {}}
                                >
                                    {opt.label}
                                </div>
                            ))
                        ) : (
                            <div className="px-3 py-8 text-center text-xs text-slate-400 italic">
                                No results found for "{searchTerm}"
                            </div>
                        )}
                    </div>
                </div>,
                document.body
            )}
        </>
    );
};

// Constant used in JSX above — defined here so linter is happy
const PANEL_MAX_H = 300;

export default SearchableSelect;
