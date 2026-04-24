type CalcHelpModalProps = {
  content: { title: string; lines: string[] } | null;
  onClose: () => void;
};

export function CalcHelpModal({ content, onClose }: CalcHelpModalProps) {
  if (!content) {
    return null;
  }

  return (
    <div className="calcModalBackdrop" role="presentation" onClick={onClose}>
      <section
        className="calcModal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="calc-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="calcModalHeader">
          <h2 id="calc-modal-title">{content.title}</h2>
          <button
            type="button"
            className="calcModalClose"
            aria-label="ปิดวิธีคำนวณ"
            onClick={onClose}
          >
            ปิด
          </button>
        </div>
        <div className="calcModalBody">
          {content.lines.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>
      </section>
    </div>
  );
}
