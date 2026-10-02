import { createContext, useCallback, useContext, useRef, useState } from "react";

const ToastContext = createContext(() => {});

// notify(ข้อความ, "success" | "danger" | ..., { label, onClick }?)
// ถ้ามี action (เช่น "เลิกทำ") จะค้างไว้นานขึ้นให้กดทัน
export function ToastProvider({ children }) {
    const [toast, setToast] = useState(null);
    const timer = useRef();

    const notify = useCallback((text, variant = "success", action = null) => {
        clearTimeout(timer.current);
        setToast({ text, variant, action });
        timer.current = setTimeout(() => setToast(null), action ? 5000 : 2500);
    }, []);

    const runAction = () => {
        const { action } = toast;
        clearTimeout(timer.current);
        setToast(null);
        action.onClick();
    };

    return (
        <ToastContext.Provider value={notify}>
            {children}
            {toast && (
                <div className="app-toast" role="status" aria-live="polite">
                    <div
                        className={`alert alert-${toast.variant} shadow mb-0 py-2 d-flex align-items-center gap-3`}
                    >
                        <span>{toast.text}</span>
                        {toast.action && (
                            <button
                                type="button"
                                className="btn btn-sm btn-link p-0 fw-semibold text-nowrap"
                                onClick={runAction}
                            >
                                {toast.action.label}
                            </button>
                        )}
                    </div>
                </div>
            )}
        </ToastContext.Provider>
    );
}

export const useToast = () => useContext(ToastContext);
