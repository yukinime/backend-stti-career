// controllers/authController.js
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { pool } = require("../config/database");

// ===== Helpers =====
const generateToken = (user) => {
  const accessToken = jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "24h" }
  );

  const refreshToken = jwt.sign(
    { id: user.id },
    (process.env.JWT_SECRET || "") + "_refresh",
    { expiresIn: "7d" }
  );

  return { accessToken, refreshToken };
};

// Sementara: simpan refresh token di memori (production -> simpan di DB/Redis)
let refreshTokens = [];

// ===== Register Pelamar =====
const registerPelamar = async (req, res) => {
  const {
    full_name,
    email,
    password,
    address = null,
    date_of_birth = null,
    phone = null,
  } = req.body;

  // Validasi lebih dulu (sebelum transaksi & koneksi)
  if (!full_name || !email || !password) {
    return res.status(400).json({
      success: false,
      message: "Nama lengkap, email, dan password wajib diisi",
    });
  }
  if (String(password).length < 6) {
    return res.status(400).json({
      success: false,
      message: "Password minimal 6 karakter",
    });
  }

  const cleanEmail = String(email).trim().toLowerCase();
  const conn = await pool.getConnection();

  try {
    // Cek email dulu
    const [exists] = await conn.execute(
      "SELECT id FROM users WHERE LOWER(email) = LOWER(?)",
      [cleanEmail]
    );
    if (exists.length) {
      conn.release();
      return res
        .status(409)
        .json({ success: false, message: "Email sudah terdaftar" });
    }

    await conn.beginTransaction();

    const hash = await bcrypt.hash(password, 12);

    // Insert user (role pelamar)
    const [ins] = await conn.execute(
      `INSERT INTO users
         (full_name, email, password, role, address, date_of_birth, phone, is_active, created_at, updated_at)
       VALUES (?, ?, ?, 'pelamar', ?, ?, ?, 1, NOW(), NOW())`,
      [full_name, cleanEmail, hash, address, date_of_birth, phone]
    );

    // JANGAN insert ke pelamar_profiles di sini jika kamu sudah pakai TRIGGER DB
    // (TRIGGER akan otomatis membuat baris profil untuk role 'pelamar').

    await conn.commit();
    conn.release();

    const user = {
      id: ins.insertId,
      email: cleanEmail,
      role: "pelamar",
      full_name,
    };
    const tokens = generateToken(user);
    refreshTokens.push(tokens.refreshToken);

    return res.status(201).json({
      success: true,
      message: "Registrasi pelamar berhasil",
      data: { user, tokens },
    });
  } catch (error) {
    try {
      await conn.rollback();
    } catch {}
    conn.release();

    if (
      error.code === "ER_DUP_ENTRY" &&
      /users/i.test(error.sqlMessage || "")
    ) {
      return res
        .status(409)
        .json({ success: false, message: "Email sudah terdaftar" });
    }
    if (
      error.code === "ER_DUP_ENTRY" &&
      /pelamar_profiles/i.test(error.sqlMessage || "")
    ) {
      // Jika trigger sempat membuat profil lalu app sempat mencoba juga (idempotent)
      return res
        .status(201)
        .json({ success: true, message: "Registrasi pelamar berhasil" });
    }

    console.error("Register pelamar error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Terjadi kesalahan server" });
  }
};

// ===== Register HR =====
const registerHR = async (req, res) => {
  const {
    full_name,
    email,
    password,
    company_name,
    company_address = null,
    position = null,
    phone = null,
  } = req.body;

  if (!full_name || !email || !password || !company_name) {
    return res.status(400).json({
      success: false,
      message: "Nama lengkap, email, password, dan nama perusahaan wajib diisi",
    });
  }
  if (String(password).length < 6) {
    return res.status(400).json({
      success: false,
      message: "Password minimal 6 karakter",
    });
  }

  const cleanEmail = String(email).trim().toLowerCase();
  const conn = await pool.getConnection();

  try {
    // Cek email dulu
    const [exists] = await conn.execute(
      "SELECT id FROM users WHERE LOWER(email) = LOWER(?)",
      [cleanEmail]
    );
    if (exists.length) {
      conn.release();
      return res
        .status(409)
        .json({ success: false, message: "Email sudah terdaftar" });
    }

    await conn.beginTransaction();

    const hash = await bcrypt.hash(password, 12);

    // Insert user (role HR)
    const [ins] = await conn.execute(
      `INSERT INTO users
         (full_name, email, password, role, company_name, company_address, position, phone, is_active, created_at, updated_at)
       VALUES (?, ?, ?, 'hr', ?, ?, ?, ?, 1, NOW(), NOW())`,
      [
        full_name,
        cleanEmail,
        hash,
        company_name,
        company_address,
        position,
        phone,
      ]
    );

    // === Jika TIDAK pakai trigger untuk hr_profiles, UNCOMMENT 4 baris di bawah: ===
    // await conn.execute(
    //   `INSERT INTO hr_profiles (user_id, company_name, company_address, position)
    //    VALUES (?, ?, ?, ?)`,
    //   [ins.insertId, company_name, company_address, position]
    // );

    await conn.commit();
    conn.release();

    const user = {
      id: ins.insertId,
      email: cleanEmail,
      role: "hr",
      full_name,
      company_name,
      position,
    };
    const tokens = generateToken(user);
    refreshTokens.push(tokens.refreshToken);

    return res.status(201).json({
      success: true,
      message: "Registrasi HR berhasil",
      data: { user, tokens },
    });
  } catch (error) {
    try {
      await conn.rollback();
    } catch {}
    conn.release();

    if (
      error.code === "ER_DUP_ENTRY" &&
      /users/i.test(error.sqlMessage || "")
    ) {
      return res
        .status(409)
        .json({ success: false, message: "Email sudah terdaftar" });
    }
    if (
      error.code === "ER_DUP_ENTRY" &&
      /hr_profiles/i.test(error.sqlMessage || "")
    ) {
      return res
        .status(409)
        .json({ success: false, message: "Profil HR sudah ada" });
    }

    console.error("Register HR error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Terjadi kesalahan server" });
  }
};

// ===== Login =====
const login = async (req, res) => {
  try {
    const cleanEmail = String(req.body.email || "")
      .trim()
      .toLowerCase();
    const password = req.body.password;

    if (!cleanEmail || !password) {
      return res
        .status(400)
        .json({ success: false, message: "Email dan password wajib diisi" });
    }

    const [rows] = await pool.execute(
      `SELECT id, full_name, email, password, role, company_name, position,
              address, date_of_birth, phone, is_active, created_at
       FROM users
       WHERE LOWER(email) = LOWER(?)`,
      [cleanEmail]
    );
    if (!rows.length) {
      return res
        .status(401)
        .json({ success: false, message: "Email atau password salah" });
    }

    const user = rows[0];
    if (!user.is_active) {
      return res
        .status(403)
        .json({ success: false, message: "Akun Anda dinonaktifkan" });
    }

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      return res
        .status(401)
        .json({ success: false, message: "Email atau password salah" });
    }

    const tokens = generateToken(user);
    refreshTokens.push(tokens.refreshToken);

    const { password: _, ...userWithoutPassword } = user;
    return res.json({
      success: true,
      message: "Login berhasil",
      data: { user: userWithoutPassword, tokens },
    });
  } catch (error) {
    console.error("Login error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Terjadi kesalahan server" });
  }
};

// ===== Refresh Token =====
const refreshToken = async (req, res) => {
  try {
    const { refreshToken: rt } = req.body;
    if (!rt) {
      return res
        .status(401)
        .json({ success: false, message: "Refresh token diperlukan" });
    }
    if (!refreshTokens.includes(rt)) {
      return res
        .status(403)
        .json({ success: false, message: "Refresh token tidak valid" });
    }

    jwt.verify(
      rt,
      (process.env.JWT_SECRET || "") + "_refresh",
      async (err, decoded) => {
        if (err) {
          return res.status(403).json({
            success: false,
            message: "Refresh token tidak valid atau kedaluwarsa",
          });
        }

        const [[u]] = await pool.execute(
          "SELECT id, email, role, is_active FROM users WHERE id = ?",
          [decoded.id]
        );
        if (!u || !u.is_active) {
          return res
            .status(403)
            .json({
              success: false,
              message: "User tidak ditemukan atau tidak aktif",
            });
        }

        // Rotasi token
        const tokens = generateToken(u);
        refreshTokens = refreshTokens.filter((t) => t !== rt);
        refreshTokens.push(tokens.refreshToken);

        return res.json({
          success: true,
          message: "Token berhasil diperbarui",
          data: { tokens },
        });
      }
    );
  } catch (error) {
    console.error("Refresh token error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Terjadi kesalahan server" });
  }
};

// ===== Logout =====
const logout = async (req, res) => {
  try {
    const { refreshToken: rt } = req.body;
    if (rt) refreshTokens = refreshTokens.filter((t) => t !== rt);
    return res.json({ success: true, message: "Logout berhasil" });
  } catch (error) {
    console.error("Logout error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Terjadi kesalahan server" });
  }
};

// ===== Get Profile =====
const getProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    const [[user]] = await pool.execute(
      `SELECT id, full_name, email, role, company_name, company_address, position,
              address, date_of_birth, phone, created_at, updated_at, is_active
       FROM users WHERE id = ?`,
      [userId]
    );
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User tidak ditemukan" });
    }

    if (user.role === "pelamar") {
      const [[p]] = await pool.execute(
        `SELECT education_level, major, institution_name, gpa,
                entry_year, graduation_year, profile_photo,
                cv_file, cover_letter_file, portfolio_file
         FROM pelamar_profiles WHERE user_id = ?`,
        [userId]
      );
      user.profile = p || {};
    }

    if (user.role === "hr") {
      const [[p]] = await pool.execute(
        `SELECT department, employee_count, company_description
         FROM hr_profiles WHERE user_id = ?`,
        [userId]
      );
      user.profile = p || {};
    }

    return res.json({ success: true, data: user });
  } catch (error) {
    console.error("Get profile error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Terjadi kesalahan server" });
  }
};

// ===== Change Password =====
const changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const userId = req.user.id;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({
      success: false,
      message: "Password lama dan baru wajib diisi",
    });
  }
  if (String(newPassword).length < 6) {
    return res.status(400).json({
      success: false,
      message: "Password baru minimal 6 karakter",
    });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [[row]] = await conn.execute(
      "SELECT password FROM users WHERE id = ?",
      [userId]
    );
    if (!row) {
      await conn.rollback();
      conn.release();
      return res
        .status(404)
        .json({ success: false, message: "User tidak ditemukan" });
    }

    const ok = await bcrypt.compare(currentPassword, row.password);
    if (!ok) {
      await conn.rollback();
      conn.release();
      return res
        .status(401)
        .json({ success: false, message: "Password lama tidak sesuai" });
    }

    const hash = await bcrypt.hash(newPassword, 12);
    await conn.execute(
      "UPDATE users SET password = ?, updated_at = NOW() WHERE id = ?",
      [hash, userId]
    );

    await conn.commit();
    conn.release();
    return res.json({ success: true, message: "Password berhasil diubah" });
  } catch (error) {
    try {
      await conn.rollback();
    } catch {}
    conn.release();
    console.error("Change password error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Terjadi kesalahan server" });
  }
};

module.exports = {
  registerPelamar,
  registerHR,
  login,
  refreshToken,
  logout,
  getProfile,
  changePassword,
};
