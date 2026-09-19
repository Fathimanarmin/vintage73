import React from 'react';
import { FiX } from 'react-icons/fi';

const Modal = ({ isOpen = true, onClose, title, children, maxWidth = 'max-w-lg' }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className={`bg-white rounded-2xl shadow-2xl w-full ${maxWidth} overflow-hidden transform transition-all animate-in zoom-in-95 duration-200 border border-slate-100 flex flex-col max-h-[90vh]`}>
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10">
                    <h3 className="text-lg font-semibold text-slate-800">{title}</h3>
                    <button 
                        onClick={onClose} 
                        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all"
                    >
                        <FiX size={20} />
                    </button>
                </div>
                
                {/* Body */}
                <div className="p-6 overflow-y-auto">
                    {children}
                </div>
            </div>
        </div>
    );
};

export default Modal;
