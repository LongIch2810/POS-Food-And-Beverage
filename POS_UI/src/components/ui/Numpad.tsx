// POS-F&B Touch Numpad per DESIGN.md §4.3 & §5.4 (phím 64px)

import React from 'react';
import { Delete } from 'lucide-react';

export interface NumpadProps {
  onDigit: (char: string) => void;
  onClear?: () => void;
  onBackspace: () => void;
}

export const Numpad: React.FC<NumpadProps> = ({ onDigit, onClear, onBackspace }) => {
  const keys = ['7', '8', '9', '4', '5', '6', '1', '2', '3', '0', '000', 'backspace'];

  return (
    <div className="numpad">
      {onClear && (
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button type="button" onClick={onClear} className="btn btn-sm btn-danger-outline">
            Xóa nhập lại
          </button>
        </div>
      )}
      <div className="numpad-grid">
        {keys.map((k) => {
          const isBackspace = k === 'backspace';
          return (
            <button
              key={k}
              type="button"
              aria-label={isBackspace ? 'Xóa lùi' : k === '000' ? 'Thêm ba số không' : `Số ${k}`}
              onClick={() => (isBackspace ? onBackspace() : onDigit(k))}
              className={`numpad-key${isBackspace ? ' is-muted' : ''}`}
            >
              {isBackspace ? <Delete size={24} /> : k}
            </button>
          );
        })}
      </div>
    </div>
  );
};
