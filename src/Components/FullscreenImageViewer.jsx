import React from "react";

export default function FullscreenImageViewer({
    src,
    onClose,
    title = "Profile photo",
    isMine = false,
    onEdit,
    onDelete
}) {
    if (!src) return null;

    return (
        <div className="fixed inset-0 z-[30000] bg-black/95 backdrop-blur-3xl flex flex-col items-center justify-center animate-in fade-in duration-300">
            {/* Header */}
            <div className="absolute top-0 left-0 right-0 p-8 flex items-center justify-between text-white z-10 bg-gradient-to-b from-black/60 to-transparent">
                <div className="flex items-center gap-4">
                    <button onClick={onClose} className="w-12 h-12 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors">
                        <span className="material-symbols-outlined">arrow_back</span>
                    </button>
                    <div>
                        <h3 className="text-lg font-bold">{title}</h3>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {isMine && onDelete && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onDelete(); }}
                            className="w-12 h-12 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors text-red-400"
                            title="Delete photo"
                        >
                            <span className="material-symbols-outlined">delete</span>
                        </button>
                    )}
                    <button onClick={onClose} className="w-12 h-12 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>
            </div>

            {/* Image Container */}
            <div className="relative w-full max-w-4xl max-h-[80vh] flex items-center justify-center p-4" onClick={(e) => e.stopPropagation()}>
                <img
                    src={src}
                    alt="Full size"
                    className="max-w-full max-h-full object-contain shadow-2xl rounded-sm"
                    onError={(e) => {
                        console.warn("Fullscreen image failed to load, falling back to default.");
                        e.target.src = "/profile_image.jpg";
                    }}
                />
            </div>

            {/* Bottom Actions */}
            {isMine && onEdit && (
                <div className="absolute bottom-12 flex gap-4">
                    <button
                        onClick={(e) => { e.stopPropagation(); onEdit(); }}
                        className="bg-white/10 backdrop-blur-md text-white px-8 py-3 rounded-2xl font-bold border border-white/20 hover:bg-white/20 transition-all flex items-center gap-2"
                    >
                        <span className="material-symbols-outlined">edit</span>
                        Edit Photo
                    </button>
                </div>
            )}
        </div>
    );
}
