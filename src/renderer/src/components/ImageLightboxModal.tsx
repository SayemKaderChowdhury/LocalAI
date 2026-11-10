import React from 'react';
import { X, ZoomIn } from 'lucide-react';

interface ImageLightboxModalProps {
  imageUrl: string | null;
  onClose: () => void;
}

export const ImageLightboxModal: React.FC<ImageLightboxModalProps> = ({ imageUrl, onClose }) => {
  if (!imageUrl) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
    >
      <div className="relative max-w-4xl max-h-[90vh] flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={onClose}
          className="absolute -top-10 right-0 p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition"
          title="Close (Esc)"
        >
          <X className="w-5 h-5" />
        </button>
        <img
          src={imageUrl.startsWith('data:') ? imageUrl : `data:image/png;base64,${imageUrl}`}
          alt="Zoomed attachment"
          className="max-h-[85vh] max-w-full rounded-xl object-contain shadow-2xl border border-white/10"
        />
      </div>
    </div>
  );
};

