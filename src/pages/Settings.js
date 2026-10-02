import { useState } from "react";
import { Link } from "react-router-dom";
import {
    EmailAuthProvider,
    deleteUser,
    reauthenticateWithCredential,
    sendEmailVerification,
    signOut,
    updatePassword,
    updateProfile,
} from "firebase/auth";
import {
    collection,
    doc,
    getDocs,
    query,
    where,
    writeBatch,
} from "firebase/firestore";
import { auth, db } from "../firebase/config";
import { errorMessage } from "../firebase/errors";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { useTransactions } from "../utils/useFinanceData";
import { exportCsv } from "../utils/csv";
import { toInputDate } from "../utils/format";

// ยืนยันตัวตนด้วยรหัสผ่านอีกครั้ง (Firebase บังคับก่อนเปลี่ยนรหัส/ลบบัญชี)
const reauth = (user, password) =>
    reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, password));

// ลบเอกสารทั้งหมดของผู้ใช้ใน collection (ทีละไม่เกิน 450 ต่อ batch)
async function deleteAllOwned(name, uid) {
    const snap = await getDocs(query(collection(db, name), where("userId", "==", uid)));
    for (let i = 0; i < snap.docs.length; i += 450) {
        const batch = writeBatch(db);
        snap.docs.slice(i, i + 450).forEach((d) => batch.delete(d.ref));
        await batch.commit();
    }
}

function Section({ title, children }) {
    return (
        <div className="card app-card p-3 mb-3">
            <h6 className="mb-3">{title}</h6>
            {children}
        </div>
    );
}

export default function Settings() {
    const { user, refresh } = useAuth();
    const notify = useToast();
    const { transactions } = useTransactions(user.uid);

    // โปรไฟล์
    const [name, setName] = useState(user.displayName || "");
    const saveName = async (e) => {
        e.preventDefault();
        if (!name.trim()) return notify("กรุณากรอกชื่อ", "danger");
        try {
            await updateProfile(user, { displayName: name.trim() });
            await refresh();
            notify("บันทึกชื่อแล้ว");
        } catch (err) {
            notify(errorMessage(err), "danger");
        }
    };

    // ยืนยันอีเมล
    const [sending, setSending] = useState(false);
    const sendVerify = async () => {
        try {
            setSending(true);
            await sendEmailVerification(user);
            notify("📩 ส่งอีเมลยืนยันแล้ว กรุณาเช็คกล่องจดหมาย (และโฟลเดอร์ Spam)");
        } catch (err) {
            notify(errorMessage(err), "danger");
        } finally {
            setSending(false);
        }
    };
    const checkVerified = async () => {
        await refresh();
        notify(
            auth.currentUser?.emailVerified ? "✅ ยืนยันอีเมลเรียบร้อย" : "ยังไม่ได้ยืนยัน กรุณากดลิงก์ในอีเมลก่อน",
            auth.currentUser?.emailVerified ? "success" : "warning"
        );
    };

    // เปลี่ยนรหัสผ่าน
    const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
    const [pwBusy, setPwBusy] = useState(false);
    const changePassword = async (e) => {
        e.preventDefault();
        if (pw.next.length < 6) return notify("รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร", "danger");
        if (pw.next !== pw.confirm) return notify("รหัสผ่านใหม่ไม่ตรงกัน", "danger");
        try {
            setPwBusy(true);
            await reauth(user, pw.current);
            await updatePassword(user, pw.next);
            setPw({ current: "", next: "", confirm: "" });
            notify("เปลี่ยนรหัสผ่านแล้ว");
        } catch (err) {
            notify(errorMessage(err), "danger");
        } finally {
            setPwBusy(false);
        }
    };

    // ลบบัญชี
    const [del, setDel] = useState({ password: "", confirm: "" });
    const [delBusy, setDelBusy] = useState(false);
    const deleteAccount = async (e) => {
        e.preventDefault();
        if (!navigator.onLine) return notify("ต้องเชื่อมต่ออินเทอร์เน็ตก่อนลบบัญชี", "danger");
        if (del.confirm !== "ลบบัญชี") return notify('กรุณาพิมพ์คำว่า "ลบบัญชี" ให้ถูกต้อง', "danger");
        try {
            setDelBusy(true);
            await reauth(user, del.password);
            await deleteAllOwned("transactions", user.uid);
            await deleteAllOwned("recurring", user.uid);
            const batch = writeBatch(db);
            batch.delete(doc(db, "budgets", user.uid));
            await batch.commit();
            await deleteUser(user);
            notify("ลบบัญชีและข้อมูลทั้งหมดแล้ว");
        } catch (err) {
            notify(errorMessage(err), "danger");
            setDelBusy(false);
        }
    };

    return (
        <div className="app-bg min-vh-100">
            <div className="app-container py-3">
                <div className="d-flex align-items-center mb-3 gap-2">
                    <Link to="/dashboard" className="btn btn-outline-secondary" aria-label="กลับ">
                        ‹
                    </Link>
                    <h5 className="mb-0 fw-bold">⚙️ ตั้งค่าบัญชี</h5>
                </div>

                <Section title="👤 โปรไฟล์">
                    <form onSubmit={saveName}>
                        <label className="form-label small text-body-secondary" htmlFor="name">
                            ชื่อที่แสดง
                        </label>
                        <div className="input-group">
                            <input
                                id="name"
                                className="form-control"
                                maxLength={50}
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                            />
                            <button type="submit" className="btn btn-primary">
                                บันทึก
                            </button>
                        </div>
                    </form>

                    <div className="mt-3 small">
                        <div className="text-body-secondary">อีเมล</div>
                        <div className="d-flex flex-wrap align-items-center gap-2">
                            <span className="text-break">{user.email}</span>
                            {user.emailVerified ? (
                                <span className="badge text-bg-success">✅ ยืนยันแล้ว</span>
                            ) : (
                                <span className="badge text-bg-warning">⚠️ ยังไม่ยืนยัน</span>
                            )}
                        </div>
                        {!user.emailVerified && (
                            <div className="d-flex gap-2 mt-2">
                                <button
                                    className="btn btn-sm btn-outline-primary"
                                    onClick={sendVerify}
                                    disabled={sending}
                                >
                                    {sending ? "กำลังส่ง..." : "ส่งอีเมลยืนยัน"}
                                </button>
                                <button className="btn btn-sm btn-outline-secondary" onClick={checkVerified}>
                                    ฉันยืนยันแล้ว
                                </button>
                            </div>
                        )}
                    </div>
                </Section>

                <Section title="🔑 เปลี่ยนรหัสผ่าน">
                    <form onSubmit={changePassword}>
                        {/* ช่อง username ซ่อนไว้ให้ password manager รู้ว่าบัญชีไหน */}
                        <input type="email" autoComplete="username" value={user.email} readOnly hidden />
                        <input
                            className="form-control mb-2"
                            type="password"
                            autoComplete="current-password"
                            placeholder="รหัสผ่านปัจจุบัน"
                            value={pw.current}
                            onChange={(e) => setPw({ ...pw, current: e.target.value })}
                            required
                        />
                        <input
                            className="form-control mb-2"
                            type="password"
                            autoComplete="new-password"
                            placeholder="รหัสผ่านใหม่ (อย่างน้อย 6 ตัว)"
                            value={pw.next}
                            onChange={(e) => setPw({ ...pw, next: e.target.value })}
                            required
                        />
                        <input
                            className="form-control mb-2"
                            type="password"
                            autoComplete="new-password"
                            placeholder="ยืนยันรหัสผ่านใหม่"
                            value={pw.confirm}
                            onChange={(e) => setPw({ ...pw, confirm: e.target.value })}
                            required
                        />
                        <button type="submit" className="btn btn-primary w-100" disabled={pwBusy}>
                            {pwBusy ? "กำลังบันทึก..." : "เปลี่ยนรหัสผ่าน"}
                        </button>
                    </form>
                </Section>

                <Section title="📦 ข้อมูลของฉัน">
                    <p className="small text-body-secondary mb-2">
                        ดาวน์โหลดรายการทั้งหมด {transactions.length.toLocaleString("th-TH")} รายการ เป็นไฟล์ CSV
                    </p>
                    <button
                        className="btn btn-outline-secondary w-100"
                        disabled={transactions.length === 0}
                        onClick={() =>
                            exportCsv(transactions, `transactions-all-${toInputDate(new Date())}.csv`)
                        }
                    >
                        ⬇️ ส่งออกข้อมูลทั้งหมด (CSV)
                    </button>
                </Section>

                <button className="btn btn-outline-danger w-100 mb-3" onClick={() => signOut(auth)}>
                    ออกจากระบบ
                </button>

                <div className="card app-card p-3 mb-3 border border-danger-subtle">
                    <h6 className="mb-2 text-danger-emphasis">🗑️ ลบบัญชี</h6>
                    <p className="small mb-2">
                        ลบบัญชีและข้อมูลทั้งหมด (รายการ งบประมาณ รายการประจำ) อย่างถาวร
                        <strong> กู้คืนไม่ได้</strong> แนะนำให้ส่งออกข้อมูลเก็บไว้ก่อน
                    </p>
                    <form onSubmit={deleteAccount}>
                        <input
                            className="form-control mb-2"
                            type="password"
                            autoComplete="current-password"
                            placeholder="รหัสผ่านปัจจุบัน"
                            value={del.password}
                            onChange={(e) => setDel({ ...del, password: e.target.value })}
                            required
                        />
                        <input
                            className="form-control mb-2"
                            placeholder='พิมพ์คำว่า "ลบบัญชี" เพื่อยืนยัน'
                            value={del.confirm}
                            onChange={(e) => setDel({ ...del, confirm: e.target.value })}
                            required
                        />
                        <button
                            type="submit"
                            className="btn btn-danger w-100"
                            disabled={delBusy || del.confirm !== "ลบบัญชี"}
                        >
                            {delBusy ? "กำลังลบ..." : "ลบบัญชีถาวร"}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
