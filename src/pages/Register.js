import { useState } from "react";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { auth } from "../firebase/config";
import { errorMessage } from "../firebase/errors";
import { Link } from "react-router-dom";

export default function Register() {
    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleRegister = async (e) => {
        e.preventDefault();
        setError("");

        if (!username.trim()) {
            setError("กรุณากรอกชื่อผู้ใช้");
            return;
        }
        if (password.length < 6) {
            setError("รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร");
            return;
        }
        if (password !== confirmPassword) {
            setError("รหัสผ่านไม่ตรงกัน");
            return;
        }

        try {
            setLoading(true);
            const { user } = await createUserWithEmailAndPassword(
                auth,
                email.trim(),
                password
            );
            await updateProfile(user, { displayName: username.trim() });
        } catch (err) {
            setError(errorMessage(err));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container d-flex justify-content-center align-items-center min-vh-100 py-4">
            <form className="card p-4 shadow auth-card" onSubmit={handleRegister}>
                <h3 className="text-center mb-3 fw-bold">สมัครสมาชิก</h3>

                {error && <div className="alert alert-danger py-2 small">{error}</div>}

                <input
                    className="form-control mb-2"
                    placeholder="ชื่อผู้ใช้"
                    autoComplete="nickname"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                />
                <input
                    className="form-control mb-2"
                    type="email"
                    placeholder="อีเมล"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                />
                <input
                    className="form-control mb-2"
                    type="password"
                    placeholder="รหัสผ่าน (อย่างน้อย 6 ตัว)"
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                />
                <input
                    className="form-control mb-3"
                    type="password"
                    placeholder="ยืนยันรหัสผ่าน"
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                />

                <button type="submit" className="btn btn-success w-100" disabled={loading}>
                    {loading ? "กำลังสร้างบัญชี..." : "สมัครสมาชิก"}
                </button>

                <p className="text-center mt-3 mb-0">
                    มีบัญชีอยู่แล้ว? <Link to="/">เข้าสู่ระบบ</Link>
                </p>
            </form>
        </div>
    );
}
