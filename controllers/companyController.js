const db = require('../config/database');

// Mendapatkan semua perusahaan
exports.getAllCompanies = async (req, res) => {
  try {
    const [rows, fields] = await db.query('SELECT * FROM companies');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
};

// Mendapatkan perusahaan berdasarkan ID
exports.getCompanyById = async (req, res) => {
  const companyId = req.params.id;
  try {
    const [rows, fields] = await db.query('SELECT * FROM companies WHERE id_companies = ?', [companyId]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Company not found' });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
};

// Membuat perusahaan baru
exports.createCompany = async (req, res) => {
  const { nama_companies, email_companies, nomor_telepon, website, alamat, logo } = req.body;

  if (!nama_companies || !email_companies) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const [result] = await db.query(
      'INSERT INTO companies (nama_companies, email_companies, nomor_telepon, website, alamat, logo) VALUES (?, ?, ?, ?, ?, ?)',
      [nama_companies, email_companies, nomor_telepon, website, alamat, logo]
    );
    res.status(201).json({ id_companies: result.insertId, ...req.body });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
};

// Mengupdate perusahaan berdasarkan ID
exports.updateCompany = async (req, res) => {
  const companyId = req.params.id;
  const { nama_companies, email_companies, nomor_telepon, website, alamat, logo } = req.body;

  if (!nama_companies || !email_companies) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const [result] = await db.query(
      'UPDATE companies SET nama_companies = ?, email_companies = ?, nomor_telepon = ?, website = ?, alamat = ?, logo = ? WHERE id_companies = ?',
      [nama_companies, email_companies, nomor_telepon, website, alamat, logo, companyId]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Company not found' });
    }
    res.json({ message: 'Company updated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
};

// Menghapus perusahaan berdasarkan ID
exports.deleteCompany = async (req, res) => {
  const companyId = req.params.id;
  try {
    const [result] = await db.query('DELETE FROM companies WHERE id_companies = ?', [companyId]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Company not found' });
    }
    res.json({ message: 'Company deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
};