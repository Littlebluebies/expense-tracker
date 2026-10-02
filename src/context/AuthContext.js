import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebase/config";

const AuthContext = createContext({ user: null, loading: true, refresh: () => {} });

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [, setVersion] = useState(0);

    useEffect(
        () =>
            onAuthStateChanged(auth, (u) => {
                setUser(u);
                setLoading(false);
            }),
        []
    );

    // updateProfile / user.reload() แก้ object เดิม ไม่ได้แจ้ง onAuthStateChanged
    // เรียก refresh() เพื่อให้หน้าจอแสดงชื่อ/สถานะยืนยันอีเมลล่าสุด
    const refresh = useCallback(async () => {
        if (auth.currentUser) await auth.currentUser.reload().catch(() => {});
        setVersion((v) => v + 1);
    }, []);

    return (
        <AuthContext.Provider value={{ user, loading, refresh }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
