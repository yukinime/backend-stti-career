-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Waktu pembuatan: 12 Okt 2025 pada 08.22
-- Versi server: 10.4.32-MariaDB
-- Versi PHP: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `stti-career`
--

-- --------------------------------------------------------

--
-- Struktur dari tabel `admin_activity_logs`
--

CREATE TABLE `admin_activity_logs` (
  `id` int(11) NOT NULL,
  `admin_id` int(11) NOT NULL,
  `action` enum('verify_job','reject_job','activate_user','deactivate_user','delete_user') NOT NULL,
  `target_type` enum('job_post','user') NOT NULL,
  `target_id` int(11) NOT NULL,
  `note` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data untuk tabel `admin_activity_logs`
--

INSERT INTO `admin_activity_logs` (`id`, `admin_id`, `action`, `target_type`, `target_id`, `note`, `created_at`) VALUES
(1, 13, 'verify_job', 'job_post', 15, NULL, '2025-10-12 05:24:41'),
(2, 13, 'reject_job', 'job_post', 16, NULL, '2025-10-12 05:24:48'),
(3, 13, 'verify_job', 'job_post', 17, NULL, '2025-10-12 05:28:07'),
(4, 13, 'reject_job', 'job_post', 18, NULL, '2025-10-12 05:28:13');

-- --------------------------------------------------------

--
-- Struktur dari tabel `applications`
--

CREATE TABLE `applications` (
  `id` int(11) NOT NULL,
  `job_id` int(11) DEFAULT NULL,
  `pelamar_id` int(11) DEFAULT NULL,
  `status` enum('pending','accepted','rejected') DEFAULT 'pending',
  `cover_letter` text DEFAULT NULL,
  `applied_at` timestamp NULL DEFAULT current_timestamp(),
  `resume_file` varchar(255) DEFAULT NULL,
  `cover_letter_file` text DEFAULT NULL,
  `portfolio_file` text DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `reviewed_at` datetime DEFAULT NULL,
  `reviewed_by` int(11) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data untuk tabel `applications`
--

INSERT INTO `applications` (`id`, `job_id`, `pelamar_id`, `status`, `cover_letter`, `applied_at`, `resume_file`, `cover_letter_file`, `portfolio_file`, `notes`, `reviewed_at`, `reviewed_by`, `created_at`, `updated_at`) VALUES
(24, 35, 48, 'pending', '', '2025-10-11 10:53:40', 'cv_file-1759456665284-110703845.pdf', 'cover_letter_file-1759456665286-144829751.pdf', 'portfolio_file-1759456665282-231794470.pdf', '', NULL, NULL, '2025-10-12 13:11:45', '2025-10-11 10:53:40'),
(27, 15, 48, 'pending', '', '2025-10-12 05:56:01', 'cv_file-1759456665284-110703845.pdf', 'cover_letter_file-1759456665286-144829751.pdf', 'portfolio_file-1759456665282-231794470.pdf', '', NULL, NULL, '2025-10-12 13:11:45', '2025-10-12 12:56:01');

-- --------------------------------------------------------

--
-- Struktur dari tabel `bookmarks`
--

CREATE TABLE `bookmarks` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `job_id` int(11) NOT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data untuk tabel `bookmarks`
--

INSERT INTO `bookmarks` (`id`, `user_id`, `job_id`, `created_at`) VALUES
(3, 38, 15, '2025-10-11 10:53:40'),
(4, 38, 16, '2025-10-11 10:53:40'),
(5, 31, 34, '2025-10-11 10:53:40'),
(8, 31, 35, '2025-10-11 10:53:40');

-- --------------------------------------------------------

--
-- Struktur dari tabel `certificates`
--

CREATE TABLE `certificates` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `certificate_name` varchar(255) DEFAULT NULL,
  `issuer` varchar(255) DEFAULT NULL,
  `issue_date` date DEFAULT NULL,
  `expiry_date` date DEFAULT NULL,
  `certificate_file` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data untuk tabel `certificates`
--

INSERT INTO `certificates` (`id`, `user_id`, `certificate_name`, `issuer`, `issue_date`, `expiry_date`, `certificate_file`, `created_at`, `updated_at`) VALUES
(10, 31, 'aws', 'aws service', '2025-10-02', '2025-10-11', 'certificate_file-1759596834449-355859752.jpg', '2025-10-11 10:53:40', '2025-10-11 10:53:40');

-- --------------------------------------------------------

--
-- Struktur dari tabel `companies`
--

CREATE TABLE `companies` (
  `id` int(11) NOT NULL,
  `nama_companies` varchar(150) NOT NULL,
  `email_companies` varchar(150) NOT NULL,
  `nomor_telepon` varchar(20) DEFAULT NULL,
  `website` varchar(150) DEFAULT NULL,
  `alamat` text DEFAULT NULL,
  `logo` varchar(255) DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data untuk tabel `companies`
--

INSERT INTO `companies` (`id`, `nama_companies`, `email_companies`, `nomor_telepon`, `website`, `alamat`, `logo`, `is_active`, `created_at`, `updated_at`) VALUES
(1, 'PT Dewan Perwakilan Rakyat1', 'pdip@ac.id', '08', NULL, 'Kompleks Parlemen, Jalan Jenderal Gatot Subroto, Senayan, Jakarta Pusat, 10270.', NULL, 1, '2025-10-11 10:53:40', '2025-10-11 10:53:40'),
(3, 'PT Keren', 'contact@keren.co', '021-1234567', 'https://keren.co', 'Jakarta', '1759322404637-24243493-Screenshot_2025-09-08_185004.png', 1, '2025-10-11 10:53:40', '2025-10-11 10:53:40'),
(9, 'PT Keren sekali', 'pdip@pdip.ac.id', '021-1234567', 'https://keren.co', 'Jakarta', '1759322404637-24243493-Screenshot_2025-09-08_185004.png', 1, '2025-10-11 10:53:40', '2025-10-11 10:53:40'),
(11, 'PT Teknologi Indonesia Maju', 'no-reply+t14@example.com', NULL, NULL, NULL, NULL, 1, '2025-10-11 10:53:40', '2025-10-11 10:53:40'),
(12, 'PT Heri Jaya Abadi', 'no-reply+t37@example.com', NULL, NULL, NULL, NULL, 1, '2025-10-11 10:53:40', '2025-10-11 10:53:40'),
(13, 'PT. Teknologi Indonesia Maju', 'no-reply+14@example.com', NULL, NULL, NULL, NULL, 1, '2025-10-11 10:53:40', '2025-10-11 10:53:40'),
(14, 'hr', 'no-reply+33@example.com', NULL, NULL, NULL, NULL, 1, '2025-10-11 10:53:40', '2025-10-11 10:53:40'),
(15, 'pt.heri jaya abadi', 'no-reply+37@example.com', NULL, NULL, NULL, NULL, 1, '2025-10-11 10:53:40', '2025-10-11 10:53:40'),
(26, 'PT Dewan Perwakilan Rakyat', 'no-reply+41@example.com', NULL, NULL, NULL, NULL, 1, '2025-10-11 10:53:40', '2025-10-11 10:53:40'),
(30, 'PT Kepala Kerbau', 'pdip@pdip.com', '032-1234567', 'https://www.dpr.go.id/', 'Jakarta, Indonesia', '1759322404637-24243493-Screenshot_2025-09-08_185004.png', 1, '2025-10-11 10:53:40', '2025-10-11 10:53:40'),
(33, 'PT Dewan Perwakilan Rakyat20', 'pdip@ac.id.com', '08', 'https://www.dpr.go.id/', 'Kompleks Parlemen, Jalan Jenderal Gatot Subroto, Senayan, Jakarta Pusat, 10270.', NULL, 1, '2025-10-11 10:53:40', '2025-10-11 10:53:40'),
(40, 'PT test', 'test@test.com', '08', '', 'Kompleks Parlemen, Jalan Jenderal Gatot Subroto, Senayan, Jakarta Pusat, 10270.', NULL, 1, '2025-10-11 10:53:40', '2025-10-11 10:53:40');

-- --------------------------------------------------------

--
-- Struktur dari tabel `hr_profiles`
--

CREATE TABLE `hr_profiles` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `company_name` varchar(255) NOT NULL,
  `company_address` text DEFAULT NULL,
  `position` varchar(255) DEFAULT NULL,
  `department` varchar(255) DEFAULT NULL,
  `employee_count` varchar(50) DEFAULT NULL,
  `company_description` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `company_id` int(11) DEFAULT NULL,
  `profile_photo` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data untuk tabel `hr_profiles`
--

INSERT INTO `hr_profiles` (`id`, `user_id`, `company_name`, `company_address`, `position`, `department`, `employee_count`, `company_description`, `created_at`, `updated_at`, `company_id`, `profile_photo`) VALUES
(1, 14, 'PT. Teknologi Indonesia Maju', 'Gedung Cyber 2 Tower, Jl. HR. Rasuna Said Blok X-5 Kav. 13, Jakarta Selatan 12950', 'HR Manager - IT Recruitment', NULL, NULL, NULL, '2025-10-11 10:53:40', '2025-10-11 10:53:40', 11, NULL),
(2, 37, 'pt.heri jaya abadi', 'Munjul Kidul', 'rt 012', NULL, NULL, NULL, '2025-10-11 10:53:40', '2025-10-11 10:53:40', 12, 'photo-1758909163940-973329370.png'),
(4, 39, 'PT Keren sekali', NULL, NULL, NULL, NULL, NULL, '2025-10-11 10:53:40', '2025-10-11 10:53:40', 9, NULL),
(5, 41, 'PT Dewan Perwakilan Rakyat', NULL, NULL, NULL, NULL, NULL, '2025-10-11 10:53:40', '2025-10-11 10:53:40', 26, NULL);

--
-- Trigger `hr_profiles`
--
DELIMITER $$
CREATE TRIGGER `hr_profiles_bi` BEFORE INSERT ON `hr_profiles` FOR EACH ROW BEGIN
  SET NEW.company_name = (
    SELECT nama_companies FROM companies WHERE id = NEW.company_id LIMIT 1
  );
END
$$
DELIMITER ;
DELIMITER $$
CREATE TRIGGER `hr_profiles_bu` BEFORE UPDATE ON `hr_profiles` FOR EACH ROW BEGIN
  IF NEW.company_id <> OLD.company_id THEN
    SET NEW.company_name = (
      SELECT nama_companies FROM companies WHERE id = NEW.company_id LIMIT 1
    );
  END IF;
END
$$
DELIMITER ;

-- --------------------------------------------------------

--
-- Struktur dari tabel `job_categories`
--

CREATE TABLE `job_categories` (
  `id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `slug` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `icon` varchar(50) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data untuk tabel `job_categories`
--

INSERT INTO `job_categories` (`id`, `name`, `slug`, `description`, `icon`, `is_active`, `created_at`) VALUES
(1, 'Engineering', '', NULL, NULL, 1, '2025-10-11 10:53:40'),
(2, 'Design', '', NULL, NULL, 1, '2025-10-11 10:53:40'),
(3, 'Marketing', '', NULL, NULL, 1, '2025-10-11 10:53:40'),
(4, 'Engineering', '', NULL, NULL, 1, '2025-10-11 10:53:40'),
(5, 'Design', '', NULL, NULL, 1, '2025-10-11 10:53:40'),
(6, 'Marketing', '', NULL, NULL, 1, '2025-10-11 10:53:40'),
(7, 'Finance', '', NULL, NULL, 1, '2025-10-11 10:53:40'),
(8, 'HR', '', NULL, NULL, 1, '2025-10-11 10:53:40');

-- --------------------------------------------------------

--
-- Struktur dari tabel `job_posts`
--

CREATE TABLE `job_posts` (
  `id` int(11) NOT NULL,
  `hr_id` int(11) DEFAULT NULL,
  `title` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `requirements` text DEFAULT NULL,
  `salary_range` varchar(100) DEFAULT NULL,
  `location` varchar(255) DEFAULT NULL,
  `work_type` enum('on_site','remote','hybrid','field') DEFAULT NULL,
  `work_time` enum('full_time','part_time','freelance','internship','contract','volunteer','seasonal') DEFAULT NULL,
  `salary_min` int(11) DEFAULT NULL,
  `salary_max` int(11) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `company_id` int(11) NOT NULL,
  `category_id` int(11) DEFAULT NULL,
  `verification_status` enum('pending','verified','rejected') NOT NULL DEFAULT 'pending',
  `verification_by` int(11) DEFAULT NULL,
  `verification_at` datetime DEFAULT NULL,
  `rejection_reason` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data untuk tabel `job_posts`
--

INSERT INTO `job_posts` (`id`, `hr_id`, `title`, `description`, `requirements`, `salary_range`, `location`, `work_type`, `work_time`, `salary_min`, `salary_max`, `is_active`, `company_id`, `category_id`, `verification_status`, `verification_by`, `verification_at`, `rejection_reason`, `created_at`, `updated_at`) VALUES
(15, 14, 'Anjay kerenn Developer', 'anjayyyy', NULL, '0', 'Jakarta Selatan (Hybrid - WFH 3 hari, WFO 2 hari)', 'on_site', 'full_time', 5000, 6000, 1, 11, NULL, 'verified', 13, '2025-10-12 12:24:41', NULL, '2025-09-11 10:53:40', '2025-09-12 05:24:41'),
(16, 14, 'Frontend Engineer', 'Membangun dashboard admin.', NULL, '0', 'Jakarta', 'on_site', 'full_time', 8000000, 15000000, 1, 11, NULL, 'rejected', 13, '2025-10-12 12:24:48', NULL, '2025-10-11 10:53:40', '2025-10-12 05:24:48'),
(17, 14, 'Backend Developer (Node.js)', 'Bangun API high-traffic dengan Node.js dan MySQL.', NULL, '0', 'Jakarta Selatan (Hybrid: 2 WFO / 3 WFH)', 'hybrid', 'contract', 8000000, 15000000, 1, 11, 2, 'verified', 13, '2025-10-12 12:28:07', NULL, '2025-10-11 10:53:40', '2025-10-12 05:28:07'),
(18, 14, 'Backend Developer (Node.js)', 'Bangun API high-traffic dengan Node.js dan MySQL.', '- Minimal 2 tahun pengalaman Node.js\n- Paham MySQL & Redis\n- Familiar dengan arsitektur REST', 'Rp 8–15 jt/bulan', 'Jakarta Selatan (Hybrid: 2 WFO / 3 WFH)', 'hybrid', 'contract', 8000000, 15000000, 1, 11, 2, 'rejected', 13, '2025-10-12 12:28:13', NULL, '2025-10-11 10:53:40', '2025-10-12 05:28:13'),
(19, 14, 'Backend Developer (Node.js)', 'Bangun API high-traffic dengan Node.js dan MySQL.', '- Minimal 2 tahun pengalaman Node.js\n- Paham MySQL & Redis\n- Familiar dengan arsitektur REST', 'Rp 8–15 jt/bulan', 'Jakarta Selatan (Hybrid: 2 WFO / 3 WFH)', 'hybrid', 'contract', 8000000, 15000000, 1, 11, 2, 'pending', NULL, NULL, NULL, '2025-10-11 10:53:40', '2025-10-11 10:53:40'),
(30, 37, 'Admin Finance', 'Input transaksi, rekonsiliasi, arsip dokumen.', '- Teliti\n- Excel basic\n- Komunikatif', '4000000 - 6000000', 'Bekasi', 'on_site', 'part_time', 4000000, 6000000, 1, 12, 1, 'pending', NULL, NULL, NULL, '2025-10-11 10:53:40', '2025-10-11 10:53:40'),
(31, 37, 'Awdasdasddmin wadsda', 'Input wadasd, rekonsiliasi, dsfgdfgd dokumen.', '- asdafgdsfg\n- sdfgdf basic\n- Komunikatif', '4000000 - 6000000', 'Bekasi', 'on_site', 'part_time', 4000000, 6000000, 1, 12, 1, 'pending', NULL, NULL, NULL, '2025-10-11 10:53:40', '2025-10-11 10:53:40'),
(32, 37, 'Awdasdasddmin wadsda', 'Input wadasd, rekonsiliasi, dsfgdfgd dokumen.', '- asdafgdsfg\n- sdfgdf basic\n- Komunikatif', '4000000 - 6000000', 'Bekasi', 'on_site', 'part_time', 4000000, 6000000, 1, 12, 1, 'pending', NULL, NULL, NULL, '2025-10-11 10:53:40', '2025-10-11 10:53:40'),
(33, 37, 'Awdfgfghfgasdasddmin wadsda', 'Inpugfhfght wadasd, fghfgh, dsfgdfgd dokumen.', '- fghfg\n- sdfgdf basic\n- Komunikatif', '4000000 - 6000000', 'Bekasi', 'on_site', 'part_time', 4000000, 6000000, 1, 12, 1, 'rejected', NULL, NULL, NULL, '2025-10-11 10:53:40', '2025-10-12 04:46:08'),
(34, 41, 'Backend Eng (Senior)', 'menjadi programer website', 'pengalaman 10 tahun, dan expert PHP', '1000000 - 2000000', 'Karawang, Indonesia', 'on_site', 'full_time', 1000000, 2000000, 1, 30, 1, 'verified', NULL, NULL, NULL, '2025-10-11 10:53:40', '2025-10-11 10:53:40'),
(35, 41, 'Mobile Developer', 'membangun aplikasi mobile', '1 tahun pengalaman, expert flutter', '2000 - 4000', 'Cikarang, Indonesia', 'on_site', 'full_time', 2000, 4000, 1, 30, 1, 'verified', NULL, NULL, NULL, '2025-10-11 10:53:40', '2025-10-11 11:02:40'),
(37, 41, 'Frontend Engineer', 'Membangun interface aplikasi web', 'Minimal 1 tahun pengalaman React.js', '3000 - 5000', 'Bekasi, Indonesia', 'on_site', 'full_time', 3000, 5000, 1, 30, 1, 'pending', NULL, NULL, NULL, '2025-11-12 06:01:08', '2025-11-12 06:01:08');

--
-- Trigger `job_posts`
--
DELIMITER $$
CREATE TRIGGER `trg_job_posts_block_non_hr_ins` BEFORE INSERT ON `job_posts` FOR EACH ROW BEGIN
  DECLARE r VARCHAR(20);
  IF NEW.hr_id IS NOT NULL THEN
    SELECT role INTO r FROM users WHERE id = NEW.hr_id LIMIT 1;
    IF r <> 'hr' THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Only HR can create job_posts';
    END IF;
  END IF;
END
$$
DELIMITER ;
DELIMITER $$
CREATE TRIGGER `trg_job_posts_block_non_hr_upd` BEFORE UPDATE ON `job_posts` FOR EACH ROW BEGIN
  DECLARE r VARCHAR(20);
  IF NEW.hr_id IS NOT NULL AND NEW.hr_id <> OLD.hr_id THEN
    SELECT role INTO r FROM users WHERE id = NEW.hr_id LIMIT 1;
    IF r <> 'hr' THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Only HR can own job_posts';
    END IF;
  END IF;
END
$$
DELIMITER ;
DELIMITER $$
CREATE TRIGGER `trg_job_posts_set_company_id_ins` BEFORE INSERT ON `job_posts` FOR EACH ROW BEGIN
  IF NEW.company_id IS NULL THEN
    SET NEW.company_id = (
      SELECT COALESCE(u.company_id, hp.company_id)
      FROM users u
      LEFT JOIN hr_profiles hp ON hp.user_id = u.id
      WHERE u.id = NEW.hr_id
      LIMIT 1
    );
  END IF;
END
$$
DELIMITER ;
DELIMITER $$
CREATE TRIGGER `trg_job_posts_set_company_id_upd` BEFORE UPDATE ON `job_posts` FOR EACH ROW BEGIN
  IF NEW.company_id IS NULL THEN
    SET NEW.company_id = (
      SELECT COALESCE(u.company_id, hp.company_id)
      FROM users u
      LEFT JOIN hr_profiles hp ON hp.user_id = u.id
      WHERE u.id = NEW.hr_id
      LIMIT 1
    );
  END IF;
END
$$
DELIMITER ;

-- --------------------------------------------------------

--
-- Struktur dari tabel `job_posts_extra`
--

CREATE TABLE `job_posts_extra` (
  `id` int(11) NOT NULL,
  `company_name` varchar(150) NOT NULL,
  `company_logo` varchar(255) DEFAULT NULL,
  `job_title` varchar(150) NOT NULL,
  `description` text NOT NULL,
  `required_qualification` text NOT NULL,
  `work_type` enum('Remote','On-site','Hybrid') NOT NULL,
  `location` varchar(150) DEFAULT NULL,
  `salary_min` decimal(12,2) DEFAULT NULL,
  `salary_max` decimal(12,2) DEFAULT NULL,
  `verifikasi` enum('pending','approved','rejected') DEFAULT 'pending',
  `status` enum('aktif','tutup') NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Struktur dari tabel `job_post_translations`
--

CREATE TABLE `job_post_translations` (
  `job_id` int(11) NOT NULL,
  `language_code` varchar(8) NOT NULL,
  `translation_data` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`translation_data`)),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data untuk tabel `job_post_translations`
--

INSERT INTO `job_post_translations` (`job_id`, `language_code`, `translation_data`, `updated_at`) VALUES
(19, 'en', '{\"lang\": \"en\", \"location\": \"South Jakarta (Hybrid: 2 WFO / 3 WFH)\", \"job_title\": \"Backend Developer (Node.js)\", \"requirements\": \"- Minimum 2 years of Node.js experience\\n- Understanding of MySQL & Redis\\n- Familiarity with REST architecture\", \"salary_range\": \"Rp. 8–15 million/month\", \"is_active_label\": \"Active\", \"job_description\": \"Build high-traffic APIs with Node.js and MySQL.\", \"work_time_label\": \"Contract\", \"work_type_label\": \"Hybrid\", \"verification_status_label\": \"Pending review\"}', '2025-10-11 10:53:40'),
(19, 'ja', '{\"lang\": \"ja\", \"location\": \"南ジャカルタ（ハイブリッド：2 WFO / 3 WFH）\", \"job_title\": \"バックエンド開発者 (Node.js)\", \"requirements\": \"- Node.js の使用経験が2年以上\\n- MySQL と Redis に関する知識\\n- REST アーキテクチャに関する知識\", \"salary_range\": \"月額800万～1500万ルピア\", \"is_active_label\": \"有効\", \"job_description\": \"Node.js と MySQL を使用してトラフィック量の多い API を構築します。\", \"work_time_label\": \"契約\", \"work_type_label\": \"ハイブリッド\", \"verification_status_label\": \"審査中\"}', '2025-10-11 10:53:40'),
(30, 'en', '{\"lang\": \"en\", \"location\": \"Bekasi\", \"job_title\": \"Finance Admin\", \"requirements\": \"- Thorough\\n- Excel basics\\n- Communicative\", \"salary_range\": \"4000000 - 6000000\", \"is_active_label\": null, \"job_description\": \"Transaction input, reconciliation, document archiving.\", \"work_time_label\": \"Part-time\", \"work_type_label\": \"On-site / WFO\", \"verification_status_label\": null}', '2025-10-11 10:53:40'),
(30, 'ja', '{\"lang\": \"ja\", \"location\": \"ブカシ\", \"job_title\": \"財務管理\", \"requirements\": \"- 徹底的\\n- Excelの基礎\\n- コミュニケーション能力\", \"salary_range\": \"400万～600万\", \"is_active_label\": null, \"job_description\": \"トランザクションの入力、調整、ドキュメントのアーカイブ。\", \"work_time_label\": \"パートタイム\", \"work_type_label\": \"出社 (On-site)\", \"verification_status_label\": null}', '2025-10-11 10:53:40'),
(31, 'en', '{\"lang\": \"en\", \"location\": \"Bekasi\", \"job_title\": \"Awdasdasdadmin wadsda\", \"requirements\": \"- asdafgdsfg\\n- sdfgdf basic\\n- Communicative\", \"salary_range\": \"4000000 - 6000000\", \"is_active_label\": null, \"job_description\": \"Input wadasd, reconciliation, dsfgdfgd documents.\", \"work_time_label\": \"Part-time\", \"work_type_label\": \"On-site / WFO\", \"verification_status_label\": null}', '2025-10-11 10:53:40'),
(31, 'ja', '{\"lang\": \"ja\", \"location\": \"ブカシ\", \"job_title\": \"Awdasdasdadmin wadsda\", \"requirements\": \"- asdafgdsfg\\n- sdfgdf 基本\\n- コミュニケーション\", \"salary_range\": \"400万～600万\", \"is_active_label\": null, \"job_description\": \"wadasd、調整、dsfgdfgd ドキュメントを入力します。\", \"work_time_label\": \"パートタイム\", \"work_type_label\": \"出社 (On-site)\", \"verification_status_label\": null}', '2025-10-11 10:53:40'),
(32, 'en', '{\"lang\": \"en\", \"location\": \"Bekasi\", \"job_title\": \"Awdasdasdadmin wadsda\", \"requirements\": \"- asdafgdsfg\\n- sdfgdf basic\\n- Communicative\", \"salary_range\": \"4000000 - 6000000\", \"is_active_label\": null, \"job_description\": \"Input wadasd, reconciliation, dsfgdfgd documents.\", \"work_time_label\": \"Part-time\", \"work_type_label\": \"On-site / WFO\", \"verification_status_label\": null}', '2025-10-11 10:53:40'),
(32, 'ja', '{\"lang\": \"ja\", \"location\": \"ブカシ\", \"job_title\": \"Awdasdasdadmin wadsda\", \"requirements\": \"- asdafgdsfg\\n- sdfgdf 基本\\n- コミュニケーション\", \"salary_range\": \"400万～600万\", \"is_active_label\": null, \"job_description\": \"wadasd、調整、dsfgdfgd ドキュメントを入力します。\", \"work_time_label\": \"パートタイム\", \"work_type_label\": \"出社 (On-site)\", \"verification_status_label\": null}', '2025-10-11 10:53:40'),
(33, 'en', '{\"lang\": \"en\", \"location\": \"Bekasi\", \"job_title\": \"Awdfgfghfgasdasdadmin wadsda\", \"requirements\": \"- fghfg\\n- sdfgdf basic\\n- Communicative\", \"salary_range\": \"4000000 - 6000000\", \"is_active_label\": null, \"job_description\": \"Inpugfhfght wadasd, fghfgh, dsfgdfgd dokumen.\", \"work_time_label\": \"Part-time\", \"work_type_label\": \"On-site / WFO\", \"verification_status_label\": null}', '2025-10-11 10:53:40'),
(33, 'ja', '{\"lang\": \"ja\", \"location\": \"ブカシ\", \"job_title\": \"Awdfgfghfgasdasdadmin wadsda\", \"requirements\": \"- fghfg\\n- sdfgdf 基本\\n- コミュニケーション\", \"salary_range\": \"400万～600万\", \"is_active_label\": null, \"job_description\": \"Inpugfhfght wadasd、fghfgh、dsfgdfgd dokumen。\", \"work_time_label\": \"パートタイム\", \"work_type_label\": \"出社 (On-site)\", \"verification_status_label\": null}', '2025-10-11 10:53:40'),
(34, 'en', '{\"lang\": \"en\", \"location\": null, \"job_title\": \"Backend Eng (Senior)\", \"requirements\": null, \"salary_range\": null, \"is_active_label\": null, \"job_description\": null, \"work_time_label\": null, \"work_type_label\": null, \"verification_status_label\": null}', '2025-10-11 10:53:40'),
(34, 'ja', '{\"lang\": \"ja\", \"location\": null, \"job_title\": \"バックエンドエンジニア（シニア）\", \"requirements\": null, \"salary_range\": null, \"is_active_label\": null, \"job_description\": null, \"work_time_label\": null, \"work_type_label\": null, \"verification_status_label\": null}', '2025-10-11 10:53:40'),
(35, 'en', '{\"lang\": \"en\", \"location\": \"Cikarang, Indonesia\", \"job_title\": \"Mobile Developer\", \"requirements\": \"1 year experience, expert flutter\", \"salary_range\": \"2000 - 4000\", \"is_active_label\": null, \"job_description\": \"building mobile applications\", \"work_time_label\": \"Full-time\", \"work_type_label\": \"On-site / WFO\", \"verification_status_label\": null}', '2025-10-11 10:53:40'),
(35, 'ja', '{\"lang\": \"ja\", \"location\": \"チカラン、インドネシア\", \"job_title\": \"モバイル開発者\", \"requirements\": \"1年の経験、フラッターのエキスパート\", \"salary_range\": \"2000 - 4000\", \"is_active_label\": null, \"job_description\": \"モバイルアプリケーションの構築\", \"work_time_label\": \"フルタイム\", \"work_type_label\": \"出社 (On-site)\", \"verification_status_label\": null}', '2025-10-11 10:53:40');

-- --------------------------------------------------------

--
-- Struktur dari tabel `job_seeker_profiles`
--

CREATE TABLE `job_seeker_profiles` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `birth_date` date DEFAULT NULL,
  `gender` enum('male','female') DEFAULT 'male',
  `address` text DEFAULT NULL,
  `city` varchar(50) DEFAULT NULL,
  `province` varchar(50) DEFAULT NULL,
  `education_level` varchar(50) DEFAULT NULL,
  `major` varchar(100) DEFAULT NULL,
  `university` varchar(100) DEFAULT NULL,
  `graduation_year` year(4) DEFAULT NULL,
  `experience_years` int(11) DEFAULT 0,
  `current_salary` decimal(12,2) DEFAULT NULL,
  `expected_salary` decimal(12,2) DEFAULT NULL,
  `resume_file` varchar(255) DEFAULT NULL,
  `portfolio_url` varchar(255) DEFAULT NULL,
  `linkedin_url` varchar(255) DEFAULT NULL,
  `github_url` varchar(255) DEFAULT NULL,
  `summary` text DEFAULT NULL,
  `is_available` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Struktur dari tabel `job_seeker_skills`
--

CREATE TABLE `job_seeker_skills` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `skill_id` int(11) NOT NULL,
  `proficiency_level` enum('beginner','intermediate','advanced','expert') DEFAULT 'intermediate',
  `years_experience` int(11) DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Struktur dari tabel `job_skills`
--

CREATE TABLE `job_skills` (
  `id` int(11) NOT NULL,
  `job_id` int(11) NOT NULL,
  `skill_id` int(11) NOT NULL,
  `is_required` tinyint(1) DEFAULT 0,
  `proficiency_level` enum('beginner','intermediate','advanced','expert') DEFAULT 'intermediate'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Struktur dari tabel `notifications`
--

CREATE TABLE `notifications` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `title` varchar(200) NOT NULL,
  `message` text NOT NULL,
  `type` enum('info','success','warning','error') DEFAULT 'info',
  `action_url` varchar(255) DEFAULT NULL,
  `is_read` tinyint(1) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Struktur dari tabel `pelamar_profiles`
--

CREATE TABLE `pelamar_profiles` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `full_name` varchar(255) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `address` text DEFAULT NULL,
  `city` varchar(100) DEFAULT NULL,
  `country` varchar(100) DEFAULT NULL,
  `profile_photo` varchar(255) DEFAULT NULL,
  `education_level` varchar(100) DEFAULT NULL,
  `major` varchar(255) DEFAULT NULL,
  `institution_name` varchar(255) DEFAULT NULL,
  `gpa` decimal(3,2) DEFAULT NULL,
  `graduation_year` int(11) DEFAULT NULL,
  `entry_year` int(11) DEFAULT NULL,
  `work_experience` text DEFAULT NULL,
  `certificates` text DEFAULT NULL,
  `cv_file` varchar(255) DEFAULT NULL,
  `cover_letter_file` varchar(255) DEFAULT NULL,
  `portfolio_file` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `date_of_birth` date DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data untuk tabel `pelamar_profiles`
--

INSERT INTO `pelamar_profiles` (`id`, `user_id`, `full_name`, `email`, `phone`, `address`, `city`, `country`, `profile_photo`, `education_level`, `major`, `institution_name`, `gpa`, `graduation_year`, `entry_year`, `work_experience`, `certificates`, `cv_file`, `cover_letter_file`, `portfolio_file`, `created_at`, `updated_at`, `date_of_birth`) VALUES
(6, 6, 'Muhammad Rizal', 'rizal180204@gmail.com', '085179718031', 'Kp sumur selang Ds Cimahi Kec Klari', 'Karawang', 'Indonesia', 'profile_photo-1757644033407-340384357.png', 'S1', 'Teknik Informatika', 'Universitas Indonesia', 3.75, 2022, 2018, NULL, NULL, 'cv_file-1757648509447-725078516.pdf', 'cover_letter_file-1757648509525-435811890.pdf', 'portfolio_file-1757648509626-193490851.pdf', '2025-10-11 10:53:40', '2025-10-11 10:53:40', NULL),
(45, 28, 'Ahmad Rizki Pratama', 'akwjeakfaklsjflkajflksjalksfj@gmail.com', '081234567890', 'Jl. Merdeka No. 45, Kelurahan Sukajadi, Kecamatan Bandung Wetan, Bandung, Jawa Barat 40132', NULL, 'Indonesia', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-11 10:53:40', '2025-10-11 10:53:40', NULL),
(46, 29, 'Ahmad Rizki Pratama', 'rizki@gmail.com', '081234567890', 'Jl. Merdeka No. 45, Kelurahan Sukajadi, Kecamatan Bandung Wetan, Bandung, Jawa Barat 40132', NULL, 'Indonesia', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-11 10:53:40', '2025-10-11 10:53:40', NULL),
(47, 30, 'Rizal Ahmad', 'zxzztech@gmail.com', '085179718031', 'Dusun sumur selang desa Cimahi kecamatan Klari Karawang', '', '', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-11 10:53:40', '2025-10-11 10:53:40', NULL),
(48, 31, 'agra', 'agra@gmail.com', '+6285715457092', 'Kp Sumur Selang desa Cimahi kecamatan Klari', 'Karawang', 'Indonesia', 'profile_photo-1759595342209-62929892.jpg', 'Sarjana', 'Teknik informatika ', 'Sekolah tinggi teknologi informatika Sony Sugema ', 4.00, 2025, 2022, NULL, NULL, 'cv_file-1759456665284-110703845.pdf', 'cover_letter_file-1759456665286-144829751.pdf', 'portfolio_file-1759456665282-231794470.pdf', '2025-10-11 10:53:40', '2025-10-11 10:53:40', NULL),
(49, 32, 'Pelamar', 'pelamar@pelamar.com', '08381498285', 'MekarJaya 1', 'Karawang', 'Indonesia', 'profile_photo-1759399584639-465137519.jpeg', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-11 10:53:40', '2025-10-11 10:53:40', NULL),
(50, 34, 'Budi', 'budi@example.com', NULL, NULL, NULL, 'Indonesia', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-11 10:53:40', '2025-10-11 10:53:40', NULL),
(51, 35, 'User Pelamar', 'pelamaasd@mail.test', '08123456789', 'Jl. Merdeka No. 1', NULL, 'Indonesia', 'photo-1758696388000-52133117.png', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-11 10:53:40', '2025-10-11 10:53:40', NULL),
(52, 36, 'Muhammad Rizal', 'rizal@gmail.com', '085715457092', 'Kp Sumur Selang desa Cimahi kecamatan Klari', NULL, NULL, 'profile_photo-1758715035672-24725326.jpg', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-11 10:53:40', '2025-10-11 10:53:40', NULL),
(53, 38, 'Kmau Ahaua', 'jerry@gmail.com', '081234567890', 'Jl. Contoh No. 123', NULL, 'Indonesia', NULL, 'S1', 'Informatika', 'Universitas Contoh', 3.65, 2022, 2018, NULL, NULL, NULL, NULL, NULL, '2025-10-11 10:53:40', '2025-10-11 10:53:40', NULL);

-- --------------------------------------------------------

--
-- Struktur dari tabel `saved_jobs`
--

CREATE TABLE `saved_jobs` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `job_id` int(11) NOT NULL,
  `saved_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Struktur dari tabel `selection_phases`
--

CREATE TABLE `selection_phases` (
  `id` int(11) NOT NULL,
  `job_id` int(11) DEFAULT NULL,
  `phase_name` varchar(255) DEFAULT NULL,
  `status` enum('pending','completed','passed','failed') DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Struktur dari tabel `skills`
--

CREATE TABLE `skills` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `skill_name` varchar(255) DEFAULT NULL,
  `skill_level` enum('Beginner','Intermediate','Advanced','Expert') DEFAULT 'Beginner',
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data untuk tabel `skills`
--

INSERT INTO `skills` (`id`, `user_id`, `skill_name`, `skill_level`, `created_at`, `updated_at`) VALUES
(1, 6, 'Node.js', 'Expert', '2025-10-11 10:53:40', '2025-10-11 10:53:40'),
(2, 38, 'JavaScript', 'Advanced', '2025-10-11 10:53:40', '2025-10-11 10:53:40'),
(3, 38, 'Node.js', 'Advanced', '2025-10-11 10:53:40', '2025-10-11 10:53:40'),
(4, 38, 'Node.js', 'Advanced', '2025-10-11 10:53:40', '2025-10-11 10:53:40'),
(5, 32, 'HTML', 'Beginner', '2025-10-11 10:53:40', '2025-10-11 10:53:40'),
(7, 31, 'hmtl', 'Beginner', '2025-10-11 10:53:40', '2025-10-11 10:53:40'),
(9, 31, 'hmtl, css', 'Beginner', '2025-10-11 10:53:40', '2025-10-11 10:53:40'),
(10, 31, 'html js', 'Intermediate', '2025-10-11 10:53:40', '2025-10-11 10:53:40');

-- --------------------------------------------------------

--
-- Struktur dari tabel `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `full_name` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `role` enum('admin','hr','pelamar') NOT NULL DEFAULT 'pelamar',
  `company_id` int(11) DEFAULT NULL,
  `address` text DEFAULT NULL,
  `date_of_birth` date DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `profile_photo` varchar(255) DEFAULT NULL,
  `company_name` varchar(255) DEFAULT NULL,
  `company_address` text DEFAULT NULL,
  `position` varchar(255) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data untuk tabel `users`
--

INSERT INTO `users` (`id`, `full_name`, `email`, `password`, `role`, `company_id`, `address`, `date_of_birth`, `phone`, `profile_photo`, `company_name`, `company_address`, `position`, `is_active`, `created_at`, `updated_at`) VALUES
(1, 'Administrator', 'admin@stti.ac.id', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBdXIG9xLH0O.K', 'admin', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, '2025-10-11 10:53:40', '2025-10-11 10:53:40'),
(6, 'Muhammad Rizal', 'rizal180204@gmail.com', '$2a$12$uHdzXy7J/LLGNhXz1mUkGeIWWYgURAJ3bsTH/6eQIoFISZa0.ZW6q', 'pelamar', NULL, 'Kp sumur selang Ds Cimahi Kec Klari', '1990-01-01', '085179718031', NULL, NULL, NULL, NULL, 1, '2025-10-11 10:53:40', '2025-10-11 10:53:40'),
(13, 'Super Admin', 'admin@stti.local', '$2a$10$L3FNcfTNfSpeDwnxpJa75OMK9y16zCyE3D2Sp6iLC5ucngs8ULKi2', 'admin', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, '2025-10-11 10:53:40', '2025-10-11 10:53:40'),
(14, 'Sinta Dewi Maharani', 'sinta.hr@teknologiindonesia.com', '$2a$12$ajBm5mx/EC3rs37.k9hiOO4DJO1JzP9W9TCqzlcxnVtHHug2Q33je', 'hr', 11, NULL, NULL, '021-29345678', NULL, 'PT. Teknologi Indonesia Maju', 'Gedung Cyber 2 Tower, Jl. HR. Rasuna Said Blok X-5 Kav. 13, Jakarta Selatan 12950', 'HR Manager - IT Recruitment', 1, '2025-10-11 10:53:40', '2025-10-11 10:53:40'),
(28, 'Ahmad Rizki Pratama', 'akwjeakfaklsjflkajflksjalksfj@gmail.com', '$2a$12$OzO9bk5INjGaWQg1OJlkOe0CxN0Wh0QW91./51H7mnQnTLH7Dc9Pu', 'pelamar', NULL, 'Jl. Merdeka No. 45, Kelurahan Sukajadi, Kecamatan Bandung Wetan, Bandung, Jawa Barat 40132', '1999-03-15', '081234567890', NULL, NULL, NULL, NULL, 1, '2025-10-11 10:53:40', '2025-10-11 10:53:40'),
(29, 'Ahmad Rizki Pratama', 'rizki@gmail.com', '$2a$12$ogQL58KzC8ydOrW/9/BdtOBX.Mq/InxeBxwHkraTYO1./xgwDJUnu', 'pelamar', NULL, 'Jl. Merdeka No. 45, Kelurahan Sukajadi, Kecamatan Bandung Wetan, Bandung, Jawa Barat 40132', '1999-03-15', '081234567890', NULL, NULL, NULL, NULL, 1, '2025-10-11 10:53:40', '2025-10-11 10:53:40'),
(30, 'Rizal Ahmad', 'zxzztech@gmail.com', '$2a$12$Fm8VVJU.rOLLMfrdxVkfMuLDlo2yyBWTeaENjPxiCQhzqdD8QUs22', 'pelamar', NULL, 'Dusun sumur selang desa Cimahi kecamatan Klari Karawang', '2004-02-18', '085179718031', NULL, NULL, NULL, NULL, 1, '2025-10-11 10:53:40', '2025-10-11 10:53:40'),
(31, 'agra', 'agra@gmail.com', '$2a$12$PlHbtpiI8k68U5YMmEcU3u63GMhQjaRTEksKuxELM9QBZAMGVXTMC', 'pelamar', NULL, 'Kp Sumur Selang desa Cimahi kecamatan Klari', '2003-02-01', '+6285715457092', NULL, NULL, NULL, NULL, 1, '2025-10-11 10:53:40', '2025-10-11 10:53:40'),
(32, 'Pelamar', 'pelamar@pelamar.com', '$2a$12$wtzbJMzxD4O8jZ.t8g7Zhekert7zBqQrNxpAmhuqrSf7DMKYGpmKq', 'pelamar', NULL, 'MekarJaya 1', '2005-07-12', '08381498285', NULL, NULL, NULL, NULL, 1, '2025-10-11 10:53:40', '2025-10-11 10:53:40'),
(34, 'Budi', 'budi@example.com', '$2a$12$dK18d/qbsP9GBV1flgpy3OekwGXge0NgPRxYOxHhChWEeMX9Q4gu6', 'pelamar', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, '2025-10-11 10:53:40', '2025-10-11 10:53:40'),
(35, 'User Pelamar', 'pelamaasd@mail.test', '$2a$12$qlgILX.tL3qtVKaTBGMMMOt1PmOjUyxjvCg7gsNXMkEd7Iibptjly', 'pelamar', NULL, 'Jl. Merdeka No. 1', NULL, '08123456789', NULL, NULL, NULL, NULL, 1, '2025-10-11 10:53:40', '2025-10-11 10:53:40'),
(36, 'Muhammad Rizal', 'rizal@gmail.com', '$2a$12$b/NF4egk.qcnckqVA6yO8elPUrNLpMYob09HpNB/HebeDyrKsqJdu', 'pelamar', NULL, 'Kp Sumur Selang desa Cimahi kecamatan Klari', '2025-09-01', '085715457092', NULL, NULL, NULL, NULL, 1, '2025-10-11 10:53:40', '2025-10-11 10:53:40'),
(37, 'agra', 'agrahr@gmail.com', '$2a$12$FWK95zd6eZL35E5Zz1D09eJ59Dlot6Zp63O/TZq5lDQLwzn/6e16O', 'hr', 12, NULL, NULL, '81351184785', NULL, 'pt.heri jaya abadi', 'Munjul Kidul', 'rt 012', 1, '2025-10-11 10:53:40', '2025-10-11 10:53:40'),
(38, 'Kmau Ahaua', 'jerry@gmail.com', '$2a$12$z3.rEZLxEL9z2.oZGKGs4ur01oM.qcs3y2MP/4JTxr2vTDaK5L5kO', 'pelamar', NULL, 'Jl. Contoh No. 123', '1997-03-15', '081234567890', NULL, NULL, NULL, NULL, 1, '2025-10-11 10:53:40', '2025-10-11 10:53:40'),
(39, 'HR Uji', 'hr.uji@example.com', '$2b$10$VbY3m2m8xg0gB4TgQmJn0e1r0v1m2e3Oa8h7n9tZkVQ0o9p9qWcKK', 'hr', 9, NULL, NULL, NULL, NULL, 'PT Keren sekali', NULL, NULL, 1, '2025-10-11 10:53:40', '2025-10-11 10:53:40'),
(41, 'Japar', 'hr@hr.com', '$2a$12$TiBdkZEZjeC1lzWQyYUH8uqn7b/GX7fAJQJKc7dwr9e2k44xQ12D6', 'hr', 30, NULL, NULL, '0812345678', NULL, 'PT Dewan Perwakilan Rakyat', 'Kompleks Parlemen, Jalan Jenderal Gatot Subroto, Senayan, Jakarta Pusat, 10270.', 'HR Manager', 1, '2025-10-11 10:53:40', '2025-10-11 10:53:40');

--
-- Trigger `users`
--
DELIMITER $$
CREATE TRIGGER `create_pelamar_profile` AFTER INSERT ON `users` FOR EACH ROW BEGIN
    IF NEW.role = 'pelamar' THEN
        INSERT INTO pelamar_profiles (
            user_id, 
            full_name, 
            email, 
            phone, 
            address,
            country
        ) VALUES (
            NEW.id, 
            NEW.full_name, 
            NEW.email, 
            NEW.phone, 
            NEW.address,
            'Indonesia'
        );
    END IF;
END
$$
DELIMITER ;
DELIMITER $$
CREATE TRIGGER `users_ai_hrprofile` AFTER INSERT ON `users` FOR EACH ROW BEGIN
  IF NEW.role = 'hr' AND NEW.company_name IS NOT NULL THEN
    INSERT IGNORE INTO companies (nama_companies, email_companies, is_active, created_at, updated_at)
    VALUES (NEW.company_name, CONCAT('no-reply+', NEW.id, '@example.com'), 1, NOW(), NOW());

    SET @cid := (
      SELECT id FROM companies
      WHERE LOWER(TRIM(nama_companies)) COLLATE utf8mb4_general_ci = LOWER(TRIM(NEW.company_name))
      LIMIT 1
    );

    INSERT INTO hr_profiles (user_id, company_id, company_name, created_at, updated_at)
    VALUES (NEW.id, @cid, NEW.company_name, NOW(), NOW())
    ON DUPLICATE KEY UPDATE
      company_id = VALUES(company_id),
      company_name = VALUES(company_name),
      updated_at = NOW();
  END IF;
END
$$
DELIMITER ;
DELIMITER $$
CREATE TRIGGER `users_au_hrprofile` AFTER UPDATE ON `users` FOR EACH ROW BEGIN
  IF NEW.role = 'hr' AND NEW.company_name IS NOT NULL
     AND (OLD.company_name <> NEW.company_name OR OLD.role <> NEW.role) THEN

    INSERT IGNORE INTO companies (nama_companies, email_companies, is_active, created_at, updated_at)
    VALUES (NEW.company_name, CONCAT('no-reply+', NEW.id, '@example.com'), 1, NOW(), NOW());

    SET @cid := (
      SELECT id FROM companies
      WHERE LOWER(TRIM(nama_companies)) COLLATE utf8mb4_general_ci = LOWER(TRIM(NEW.company_name))
      LIMIT 1
    );

    INSERT INTO hr_profiles (user_id, company_id, company_name, created_at, updated_at)
    VALUES (NEW.id, @cid, NEW.company_name, NOW(), NOW())
    ON DUPLICATE KEY UPDATE
      company_id = VALUES(company_id),
      company_name = VALUES(company_name),
      updated_at = NOW();
  END IF;
END
$$
DELIMITER ;

-- --------------------------------------------------------

--
-- Struktur dari tabel `work_experiences`
--

CREATE TABLE `work_experiences` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `company_name` varchar(255) DEFAULT NULL,
  `position` varchar(255) DEFAULT NULL,
  `start_date` date DEFAULT NULL,
  `end_date` date DEFAULT NULL,
  `is_current` tinyint(1) DEFAULT 0,
  `job_description` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data untuk tabel `work_experiences`
--

INSERT INTO `work_experiences` (`id`, `user_id`, `company_name`, `position`, `start_date`, `end_date`, `is_current`, `job_description`, `created_at`) VALUES
(1, 6, 'PT. Tech Innovate Indonesia', 'Senior Software Developer', '2022-01-15', '2024-03-30', 0, 'Mengembangkan aplikasi web menggunakan Node.js, React, dan MySQL. Bertanggung jawab dalam merancang arsitektur sistem dan melakukan code review.', '2025-10-11 10:53:40'),
(3, 31, 'PT gomu gomu', 'Frontend Developer', '2022-01-01', '2025-12-31', 0, 'membuat ui user interface', '2025-10-11 10:53:40'),
(5, 31, 'pt gas kawin', 'senior pagawean', '2022-01-15', '2023-12-31', 0, 'anjayyyy', '2025-10-11 10:53:40'),
(6, 38, 'PT Contoh Teknologi', 'Backend Developer', '2023-01-01', NULL, 1, 'Build REST API dengan Node.js, MySQL, Redis, dan Docker.', '2025-10-11 10:53:40'),
(7, 31, 'pt arsitektur', 'senior program', '2022-01-15', '2024-12-31', 0, 'membeli server', '2025-10-11 10:53:40');

--
-- Indexes for dumped tables
--

--
-- Indeks untuk tabel `admin_activity_logs`
--
ALTER TABLE `admin_activity_logs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_admin_logs_created` (`created_at`),
  ADD KEY `fk_admin_logs_admin` (`admin_id`);

--
-- Indeks untuk tabel `applications`
--
ALTER TABLE `applications`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_applications_job_pelamar` (`job_id`,`pelamar_id`),
  ADD KEY `job_id` (`job_id`),
  ADD KEY `pelamar_id` (`pelamar_id`),
  ADD KEY `idx_applications_status` (`status`),
  ADD KEY `idx_applications_applied` (`applied_at`);

--
-- Indeks untuk tabel `bookmarks`
--
ALTER TABLE `bookmarks`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_bookmark` (`user_id`,`job_id`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `job_id` (`job_id`);

--
-- Indeks untuk tabel `certificates`
--
ALTER TABLE `certificates`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indeks untuk tabel `companies`
--
ALTER TABLE `companies`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_companies_email` (`email_companies`),
  ADD UNIQUE KEY `uq_companies_nama` (`nama_companies`),
  ADD KEY `idx_companies_nama` (`nama_companies`),
  ADD KEY `idx_companies_active` (`is_active`),
  ADD KEY `idx_companies_created` (`created_at`);

--
-- Indeks untuk tabel `hr_profiles`
--
ALTER TABLE `hr_profiles`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `idx_user_id` (`user_id`),
  ADD UNIQUE KEY `uq_hr_profiles_user` (`user_id`),
  ADD KEY `idx_hr_company` (`company_id`);

--
-- Indeks untuk tabel `job_categories`
--
ALTER TABLE `job_categories`
  ADD PRIMARY KEY (`id`);

--
-- Indeks untuk tabel `job_posts`
--
ALTER TABLE `job_posts`
  ADD PRIMARY KEY (`id`),
  ADD KEY `hr_id` (`hr_id`),
  ADD KEY `fk_job_posts_verifier` (`verification_by`),
  ADD KEY `idx_job_posts_verif` (`verification_status`),
  ADD KEY `idx_job_posts_created` (`created_at`),
  ADD KEY `idx_job_posts_company` (`company_id`),
  ADD KEY `idx_job_posts_category` (`category_id`);

--
-- Indeks untuk tabel `job_post_translations`
--
ALTER TABLE `job_post_translations`
  ADD PRIMARY KEY (`job_id`,`language_code`);

--
-- Indeks untuk tabel `pelamar_profiles`
--
ALTER TABLE `pelamar_profiles`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_user_profile` (`user_id`);

--
-- Indeks untuk tabel `skills`
--
ALTER TABLE `skills`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indeks untuk tabel `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`),
  ADD KEY `idx_users_role_active` (`role`,`is_active`),
  ADD KEY `idx_users_created` (`created_at`),
  ADD KEY `fk_users_company` (`company_id`);

--
-- Indeks untuk tabel `work_experiences`
--
ALTER TABLE `work_experiences`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`);

--
-- AUTO_INCREMENT untuk tabel yang dibuang
--

--
-- AUTO_INCREMENT untuk tabel `admin_activity_logs`
--
ALTER TABLE `admin_activity_logs`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT untuk tabel `applications`
--
ALTER TABLE `applications`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=28;

--
-- AUTO_INCREMENT untuk tabel `bookmarks`
--
ALTER TABLE `bookmarks`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT untuk tabel `certificates`
--
ALTER TABLE `certificates`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT untuk tabel `companies`
--
ALTER TABLE `companies`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=54;

--
-- AUTO_INCREMENT untuk tabel `hr_profiles`
--
ALTER TABLE `hr_profiles`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT untuk tabel `job_categories`
--
ALTER TABLE `job_categories`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT untuk tabel `job_posts`
--
ALTER TABLE `job_posts`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=38;

--
-- AUTO_INCREMENT untuk tabel `pelamar_profiles`
--
ALTER TABLE `pelamar_profiles`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=54;

--
-- AUTO_INCREMENT untuk tabel `skills`
--
ALTER TABLE `skills`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=14;

--
-- AUTO_INCREMENT untuk tabel `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=42;

--
-- AUTO_INCREMENT untuk tabel `work_experiences`
--
ALTER TABLE `work_experiences`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- Ketidakleluasaan untuk tabel pelimpahan (Dumped Tables)
--

--
-- Ketidakleluasaan untuk tabel `admin_activity_logs`
--
ALTER TABLE `admin_activity_logs`
  ADD CONSTRAINT `fk_admin_logs_admin` FOREIGN KEY (`admin_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Ketidakleluasaan untuk tabel `applications`
--
ALTER TABLE `applications`
  ADD CONSTRAINT `applications_ibfk_1` FOREIGN KEY (`job_id`) REFERENCES `job_posts` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_pelamar_profile` FOREIGN KEY (`pelamar_id`) REFERENCES `pelamar_profiles` (`id`) ON DELETE CASCADE;

--
-- Ketidakleluasaan untuk tabel `bookmarks`
--
ALTER TABLE `bookmarks`
  ADD CONSTRAINT `bookmarks_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `bookmarks_ibfk_2` FOREIGN KEY (`job_id`) REFERENCES `job_posts` (`id`) ON DELETE CASCADE;

--
-- Ketidakleluasaan untuk tabel `certificates`
--
ALTER TABLE `certificates`
  ADD CONSTRAINT `certificates_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Ketidakleluasaan untuk tabel `hr_profiles`
--
ALTER TABLE `hr_profiles`
  ADD CONSTRAINT `fk_hr_profiles_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_hr_profiles_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Ketidakleluasaan untuk tabel `job_posts`
--
ALTER TABLE `job_posts`
  ADD CONSTRAINT `fk_job_posts_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_job_posts_verifier` FOREIGN KEY (`verification_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `job_posts_ibfk_1` FOREIGN KEY (`hr_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Ketidakleluasaan untuk tabel `job_post_translations`
--
ALTER TABLE `job_post_translations`
  ADD CONSTRAINT `fk_job_post_translations_job` FOREIGN KEY (`job_id`) REFERENCES `job_posts` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Ketidakleluasaan untuk tabel `pelamar_profiles`
--
ALTER TABLE `pelamar_profiles`
  ADD CONSTRAINT `pelamar_profiles_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Ketidakleluasaan untuk tabel `skills`
--
ALTER TABLE `skills`
  ADD CONSTRAINT `skills_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Ketidakleluasaan untuk tabel `users`
--
ALTER TABLE `users`
  ADD CONSTRAINT `fk_users_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Ketidakleluasaan untuk tabel `work_experiences`
--
ALTER TABLE `work_experiences`
  ADD CONSTRAINT `work_experiences_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
