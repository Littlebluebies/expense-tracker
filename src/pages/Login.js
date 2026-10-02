import { useState } from "react";
import {
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
} from "firebase/auth";
import { auth } from "../firebase/config";
import { errorMessage } from "../firebase/errors";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { expired } = useAuth();

  const [showReset, setShowReset] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetMsg, setResetMsg] = useState(null); // { ok, text }

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    try {
      setLoading(true);
      await signInWithEmailAndPassword(auth, email.trim(), password);
      // PublicRoute จะพาไป /dashboard เอง
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setResetMsg(null);
    try {
      setLoading(true);
      await sendPasswordResetEmail(auth, resetEmail.trim());
      setResetMsg({ ok: true, text: "📩 ส่งลิงก์รีเซ็ตรหัสผ่านไปที่อีเมลแล้ว" });
    } catch (err) {
      setResetMsg({ ok: false, text: errorMessage(err) });
    } finally {
      setLoading(false);
    }
  };

  const openReset = () => {
    setResetEmail(email);
    setResetMsg(null);
    setShowReset(true);
  };

  return (
    <>
      <div className="container d-flex justify-content-center align-items-center min-vh-100 py-4">
        <form className="card p-4 shadow auth-card" onSubmit={handleLogin}>
          <div className="text-center mb-3">
            <div className="fs-1">💸</div>
            <h3 className="fw-bold mb-0">เข้าสู่ระบบ</h3>
            <small className="text-body-secondary">บันทึกรายรับ-รายจ่ายของคุณ</small>
          </div>

          {error && <div className="alert alert-danger py-2 small">{error}</div>}
          {!error && expired && (
            <div className="alert alert-warning py-2 small">
              ⏱️ เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่อีกครั้ง
            </div>
          )}

          <input
            className="form-control mb-2"
            type="email"
            autoComplete="email"
            placeholder="อีเมล"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <input
            className="form-control mb-2"
            type="password"
            autoComplete="current-password"
            placeholder="รหัสผ่าน"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <div className="text-end mb-2">
            <button type="button" className="btn btn-link p-0 small" onClick={openReset}>
              ลืมรหัสผ่าน?
            </button>
          </div>

          <button type="submit" className="btn btn-primary w-100" disabled={loading}>
            {loading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
          </button>

          <p className="text-center mt-3 mb-0">
            ยังไม่มีบัญชี? <Link to="/register">สมัครสมาชิก</Link>
          </p>
        </form>
      </div>

      {showReset && (
        <div className="app-modal-backdrop" onClick={() => setShowReset(false)}>
          <form
            className="card p-4 shadow app-modal"
            onSubmit={handleResetPassword}
            onClick={(e) => e.stopPropagation()}
          >
            <h5 className="mb-3 text-center">รีเซ็ตรหัสผ่าน</h5>

            {resetMsg && (
              <div className={`alert py-2 small ${resetMsg.ok ? "alert-success" : "alert-danger"}`}>
                {resetMsg.text}
              </div>
            )}

            <input
              className="form-control mb-3"
              type="email"
              placeholder="อีเมลที่ใช้สมัคร"
              value={resetEmail}
              onChange={(e) => setResetEmail(e.target.value)}
              required
              autoFocus
            />

            <button type="submit" className="btn btn-primary w-100 mb-2" disabled={loading}>
              {loading ? "กำลังส่ง..." : "ส่งลิงก์รีเซ็ต"}
            </button>
            <button type="button" className="btn btn-secondary w-100" onClick={() => setShowReset(false)}>
              ปิด
            </button>
          </form>
        </div>
      )}
    </>
  );
}
