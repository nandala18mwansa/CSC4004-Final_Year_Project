import React from 'react';

const Modal = ({ title, children, footer, onClose, onSubmit }) => {
  const content = (
    <>
      <div className="modal-body">{children}</div>
      {footer && <div className="modal-footer">{footer}</div>}
    </>
  );

  return (
    <div className="modal-overlay" onClick={(event) => event.target === event.currentTarget && onClose()}>
      <div className="modal-content" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div className="modal-header">
          <h2 className="modal-title" id="modal-title">{title}</h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close modal">
            ×
          </button>
        </div>
        {onSubmit ? (
          <form onSubmit={(e) => { e.preventDefault(); onSubmit(e); }}>
            {content}
          </form>
        ) : (
          content
        )}
      </div>
    </div>
  );
};

export default Modal;
