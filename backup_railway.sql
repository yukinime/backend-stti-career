-- MySQL dump 10.13  Distrib 8.0.43, for Linux (x86_64)
--
-- Host: ballast.proxy.rlwy.net    Database: railway
-- ------------------------------------------------------
-- Server version	9.4.0

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `admin_activity_logs`
--

DROP TABLE IF EXISTS `admin_activity_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `admin_activity_logs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `admin_id` int NOT NULL,
  `action` enum('verify_job','reject_job','activate_user','deactivate_user','delete_user') NOT NULL,
  `target_type` enum('job_post','user') NOT NULL,
  `target_id` int NOT NULL,
  `note` text,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_admin_logs_admin` (`admin_id`),
  KEY `idx_admin_logs_created` (`created_at`),
  CONSTRAINT `fk_admin_logs_admin` FOREIGN KEY (`admin_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `admin_activity_logs`
--

LOCK TABLES `admin_activity_logs` WRITE;
/*!40000 ALTER TABLE `admin_activity_logs` DISABLE KEYS */;
INSERT INTO `admin_activity_logs` VALUES (1,13,'verify_job','job_post',1,NULL,'2025-09-18 22:10:13'),(2,13,'reject_job','job_post',1,'Deskripsi tidak lengkap','2025-09-18 22:11:07');
/*!40000 ALTER TABLE `admin_activity_logs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `applications`
--

DROP TABLE IF EXISTS `applications`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `applications` (
  `id` int NOT NULL AUTO_INCREMENT,
  `job_id` int DEFAULT NULL,
  `pelamar_id` int DEFAULT NULL,
  `status` enum('pending','accepted','rejected') DEFAULT 'pending',
  `cover_letter` text,
  `applied_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `resume_file` varchar(255) DEFAULT NULL,
  `notes` text,
  `reviewed_at` datetime DEFAULT NULL,
  `reviewed_by` int DEFAULT NULL,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `job_id` (`job_id`),
  KEY `pelamar_id` (`pelamar_id`),
  KEY `idx_applications_status` (`status`),
  KEY `idx_applications_applied` (`applied_at`),
  CONSTRAINT `applications_ibfk_1` FOREIGN KEY (`job_id`) REFERENCES `job_posts` (`id`) ON DELETE CASCADE,
  CONSTRAINT `applications_ibfk_2` FOREIGN KEY (`pelamar_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `applications`
--

LOCK TABLES `applications` WRITE;
/*!40000 ALTER TABLE `applications` DISABLE KEYS */;
/*!40000 ALTER TABLE `applications` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `bookmarks`
--

DROP TABLE IF EXISTS `bookmarks`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `bookmarks` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `job_id` int NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_bookmark` (`user_id`,`job_id`),
  KEY `user_id` (`user_id`),
  KEY `job_id` (`job_id`),
  CONSTRAINT `bookmarks_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `bookmarks_ibfk_2` FOREIGN KEY (`job_id`) REFERENCES `job_posts` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `bookmarks`
--

LOCK TABLES `bookmarks` WRITE;
/*!40000 ALTER TABLE `bookmarks` DISABLE KEYS */;
/*!40000 ALTER TABLE `bookmarks` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `certificates`
--

DROP TABLE IF EXISTS `certificates`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `certificates` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `certificate_name` varchar(255) DEFAULT NULL,
  `issuer` varchar(255) DEFAULT NULL,
  `issue_date` date DEFAULT NULL,
  `expiry_date` date DEFAULT NULL,
  `certificate_file` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `certificates_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `certificates`
--

LOCK TABLES `certificates` WRITE;
/*!40000 ALTER TABLE `certificates` DISABLE KEYS */;
INSERT INTO `certificates` VALUES (1,31,'Marketing','aws awas','2025-09-04','2025-09-25','certificate_file-1758781343512-57554196.png','2025-09-25 06:22:23','2025-09-25 06:22:23');
/*!40000 ALTER TABLE `certificates` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `companies`
--

DROP TABLE IF EXISTS `companies`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `companies` (
  `id_companies` int NOT NULL AUTO_INCREMENT,
  `nama_companies` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `email_companies` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `nomor_telepon` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `website` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `alamat` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci,
  `logo` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_companies`),
  UNIQUE KEY `uq_companies_email` (`email_companies`),
  KEY `idx_companies_nama` (`nama_companies`),
  KEY `idx_companies_active` (`is_active`),
  KEY `idx_companies_created` (`created_at`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `companies`
--

LOCK TABLES `companies` WRITE;
/*!40000 ALTER TABLE `companies` DISABLE KEYS */;
INSERT INTO `companies` VALUES (1,'Demo Company','demo@company.local',NULL,NULL,NULL,NULL,1,'2025-09-20 17:59:27','2025-09-20 17:59:27');
/*!40000 ALTER TABLE `companies` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `hr_profiles`
--

DROP TABLE IF EXISTS `hr_profiles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `hr_profiles` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `company_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `company_address` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `position` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `department` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `employee_count` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `company_description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `company_id` int DEFAULT NULL,
  `profile_photo` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_user_id` (`user_id`),
  KEY `idx_hr_company` (`company_id`),
  CONSTRAINT `fk_hr_profiles_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id_companies`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_hr_profiles_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `hr_profiles`
--

LOCK TABLES `hr_profiles` WRITE;
/*!40000 ALTER TABLE `hr_profiles` DISABLE KEYS */;
INSERT INTO `hr_profiles` VALUES (1,14,'PT. Teknologi Indonesia Maju','Gedung Cyber 2 Tower, Jl. HR. Rasuna Said Blok X-5 Kav. 13, Jakarta Selatan 12950','HR Manager - IT Recruitment',NULL,NULL,NULL,'2025-09-19 11:03:12','2025-09-19 11:03:12',NULL,NULL);
/*!40000 ALTER TABLE `hr_profiles` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `job_categories`
--

DROP TABLE IF EXISTS `job_categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `job_categories` (
  `id` int NOT NULL,
  `name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `slug` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci,
  `icon` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `job_categories`
--

LOCK TABLES `job_categories` WRITE;
/*!40000 ALTER TABLE `job_categories` DISABLE KEYS */;
INSERT INTO `job_categories` VALUES (0,'Engineering','',NULL,NULL,1,'2025-09-20 17:50:05'),(0,'Design','',NULL,NULL,1,'2025-09-20 17:50:05'),(0,'Marketing','',NULL,NULL,1,'2025-09-20 17:50:05'),(0,'Engineering','',NULL,NULL,1,'2025-09-20 17:59:24'),(0,'Design','',NULL,NULL,1,'2025-09-20 17:59:24'),(0,'Marketing','',NULL,NULL,1,'2025-09-20 17:59:24'),(0,'Finance','',NULL,NULL,1,'2025-09-20 17:59:24'),(0,'HR','',NULL,NULL,1,'2025-09-20 17:59:24');
/*!40000 ALTER TABLE `job_categories` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `job_posts`
--

DROP TABLE IF EXISTS `job_posts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `job_posts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `hr_id` int DEFAULT NULL,
  `title` varchar(255) NOT NULL,
  `description` text,
  `requirements` text,
  `salary_range` varchar(100) DEFAULT NULL,
  `location` varchar(255) DEFAULT NULL,
  `work_type` enum('on_site','remote','hybrid','field') DEFAULT NULL,
  `work_time` enum('full_time','part_time','freelance','internship','contract','volunteer','seasonal') DEFAULT NULL,
  `salary_min` int DEFAULT NULL,
  `salary_max` int DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `company_id` int DEFAULT NULL,
  `category_id` int DEFAULT NULL,
  `verification_status` enum('pending','verified','rejected') NOT NULL DEFAULT 'pending',
  `verification_by` int DEFAULT NULL,
  `verification_at` datetime DEFAULT NULL,
  `rejection_reason` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `hr_id` (`hr_id`),
  KEY `fk_job_posts_verifier` (`verification_by`),
  KEY `idx_job_posts_verif` (`verification_status`),
  KEY `idx_job_posts_created` (`created_at`),
  KEY `idx_job_posts_company` (`company_id`),
  KEY `idx_job_posts_category` (`category_id`),
  CONSTRAINT `fk_job_posts_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id_companies`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_job_posts_verifier` FOREIGN KEY (`verification_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `job_posts_ibfk_1` FOREIGN KEY (`hr_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `job_posts`
--

LOCK TABLES `job_posts` WRITE;
/*!40000 ALTER TABLE `job_posts` DISABLE KEYS */;
INSERT INTO `job_posts` VALUES (15,NULL,'Anjay kerenn Developer','anjayyyy',NULL,NULL,'Jakarta Selatan (Hybrid - WFH 3 hari, WFO 2 hari)','on_site','full_time',5000,6000,1,NULL,NULL,'pending',NULL,NULL,NULL,'2025-09-25 14:22:51','2025-09-25 17:23:36'),(16,NULL,'Frontend Engineer','Membangun dashboard admin.',NULL,NULL,'Jakarta','on_site','full_time',8000000,15000000,1,NULL,NULL,'pending',NULL,NULL,NULL,'2025-09-25 17:51:36','2025-09-25 17:51:36');
/*!40000 ALTER TABLE `job_posts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `job_posts_extra`
--

DROP TABLE IF EXISTS `job_posts_extra`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `job_posts_extra` (
  `id` int NOT NULL,
  `company_name` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `company_logo` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `job_title` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `required_qualification` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `work_type` enum('Remote','On-site','Hybrid') CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `location` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `salary_min` decimal(12,2) DEFAULT NULL,
  `salary_max` decimal(12,2) DEFAULT NULL,
  `verifikasi` enum('pending','approved','rejected') CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT 'pending',
  `status` enum('aktif','tutup') CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `job_posts_extra`
--

LOCK TABLES `job_posts_extra` WRITE;
/*!40000 ALTER TABLE `job_posts_extra` DISABLE KEYS */;
/*!40000 ALTER TABLE `job_posts_extra` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `job_seeker_profiles`
--

DROP TABLE IF EXISTS `job_seeker_profiles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `job_seeker_profiles` (
  `id` int NOT NULL,
  `user_id` int NOT NULL,
  `birth_date` date DEFAULT NULL,
  `gender` enum('male','female') CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT 'male',
  `address` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci,
  `city` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `province` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `education_level` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `major` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `university` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `graduation_year` year DEFAULT NULL,
  `experience_years` int DEFAULT '0',
  `current_salary` decimal(12,2) DEFAULT NULL,
  `expected_salary` decimal(12,2) DEFAULT NULL,
  `resume_file` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `portfolio_url` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `linkedin_url` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `github_url` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `summary` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci,
  `is_available` tinyint(1) DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `job_seeker_profiles`
--

LOCK TABLES `job_seeker_profiles` WRITE;
/*!40000 ALTER TABLE `job_seeker_profiles` DISABLE KEYS */;
/*!40000 ALTER TABLE `job_seeker_profiles` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `job_seeker_skills`
--

DROP TABLE IF EXISTS `job_seeker_skills`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `job_seeker_skills` (
  `id` int NOT NULL,
  `user_id` int NOT NULL,
  `skill_id` int NOT NULL,
  `proficiency_level` enum('beginner','intermediate','advanced','expert') CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT 'intermediate',
  `years_experience` int DEFAULT '0'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `job_seeker_skills`
--

LOCK TABLES `job_seeker_skills` WRITE;
/*!40000 ALTER TABLE `job_seeker_skills` DISABLE KEYS */;
/*!40000 ALTER TABLE `job_seeker_skills` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `job_skills`
--

DROP TABLE IF EXISTS `job_skills`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `job_skills` (
  `id` int NOT NULL,
  `job_id` int NOT NULL,
  `skill_id` int NOT NULL,
  `is_required` tinyint(1) DEFAULT '0',
  `proficiency_level` enum('beginner','intermediate','advanced','expert') CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT 'intermediate'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `job_skills`
--

LOCK TABLES `job_skills` WRITE;
/*!40000 ALTER TABLE `job_skills` DISABLE KEYS */;
/*!40000 ALTER TABLE `job_skills` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `notifications`
--

DROP TABLE IF EXISTS `notifications`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `notifications` (
  `id` int NOT NULL,
  `user_id` int NOT NULL,
  `title` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `message` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `type` enum('info','success','warning','error') CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT 'info',
  `action_url` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `is_read` tinyint(1) DEFAULT '0',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `notifications`
--

LOCK TABLES `notifications` WRITE;
/*!40000 ALTER TABLE `notifications` DISABLE KEYS */;
/*!40000 ALTER TABLE `notifications` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `pelamar_profiles`
--

DROP TABLE IF EXISTS `pelamar_profiles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `pelamar_profiles` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `full_name` varchar(255) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `address` text,
  `city` varchar(100) DEFAULT NULL,
  `country` varchar(100) DEFAULT NULL,
  `profile_photo` varchar(255) DEFAULT NULL,
  `education_level` varchar(100) DEFAULT NULL,
  `major` varchar(255) DEFAULT NULL,
  `institution_name` varchar(255) DEFAULT NULL,
  `gpa` decimal(3,2) DEFAULT NULL,
  `graduation_year` int DEFAULT NULL,
  `entry_year` int DEFAULT NULL,
  `work_experience` text,
  `certificates` text,
  `cv_file` varchar(255) DEFAULT NULL,
  `cover_letter_file` varchar(255) DEFAULT NULL,
  `portfolio_file` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `date_of_birth` date DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_user_profile` (`user_id`),
  CONSTRAINT `pelamar_profiles_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=53 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `pelamar_profiles`
--

LOCK TABLES `pelamar_profiles` WRITE;
/*!40000 ALTER TABLE `pelamar_profiles` DISABLE KEYS */;
INSERT INTO `pelamar_profiles` VALUES (6,6,'Muhammad Rizal','rizal180204@gmail.com','085179718031','Kp sumur selang Ds Cimahi Kec Klari','Karawang','Indonesia','profile_photo-1757644033407-340384357.png','S1','Teknik Informatika','Universitas Indonesia',3.75,2022,2018,NULL,NULL,'cv_file-1757648509447-725078516.pdf','cover_letter_file-1757648509525-435811890.pdf','portfolio_file-1757648509626-193490851.pdf','2025-09-12 01:00:13','2025-09-12 03:41:51',NULL),(45,28,'Ahmad Rizki Pratama','akwjeakfaklsjflkajflksjalksfj@gmail.com','081234567890','Jl. Merdeka No. 45, Kelurahan Sukajadi, Kecamatan Bandung Wetan, Bandung, Jawa Barat 40132',NULL,'Indonesia',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2025-09-20 16:48:12','2025-09-20 16:48:12',NULL),(46,29,'Ahmad Rizki Pratama','rizki@gmail.com','081234567890','Jl. Merdeka No. 45, Kelurahan Sukajadi, Kecamatan Bandung Wetan, Bandung, Jawa Barat 40132',NULL,'Indonesia',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2025-09-20 16:48:28','2025-09-20 16:48:28',NULL),(47,30,'Rizal Ahmad','zxzztech@gmail.com','085179718031','Dusun sumur selang desa Cimahi kecamatan Klari Karawang','','',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2025-09-22 11:56:54','2025-09-23 10:04:54',NULL),(48,31,'agra','agra@gmail.com','+6285715457092','Kp Sumur Selang desa Cimahi kecamatan Klari','Karawang','Indonesia','profile_photo-1758808507139-878532787.png','Sarjana','Teknik informatika ','Sekolah tinggi teknologi informatika Sony Sugema ',4.00,2025,2022,NULL,NULL,NULL,NULL,NULL,'2025-09-22 13:46:07','2025-09-25 13:55:07',NULL),(49,32,'Pelamar','pelamar@pelamar.com','08','Karawang','','',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2025-09-22 17:50:52','2025-09-24 23:07:33',NULL),(50,34,'Budi','budi@example.com',NULL,NULL,NULL,'Indonesia',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2025-09-24 05:21:24','2025-09-24 05:21:24',NULL),(51,35,'User Pelamar','pelamaasd@mail.test','08123456789','Jl. Merdeka No. 1',NULL,'Indonesia','photo-1758696388000-52133117.png',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2025-09-24 06:01:25','2025-09-24 06:46:28',NULL),(52,36,'Muhammad Rizal','rizal@gmail.com','085715457092','Kp Sumur Selang desa Cimahi kecamatan Klari',NULL,NULL,'profile_photo-1758715035672-24725326.jpg',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2025-09-24 11:54:38','2025-09-24 11:57:16',NULL);
/*!40000 ALTER TABLE `pelamar_profiles` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `saved_jobs`
--

DROP TABLE IF EXISTS `saved_jobs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `saved_jobs` (
  `id` int NOT NULL,
  `user_id` int NOT NULL,
  `job_id` int NOT NULL,
  `saved_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `saved_jobs`
--

LOCK TABLES `saved_jobs` WRITE;
/*!40000 ALTER TABLE `saved_jobs` DISABLE KEYS */;
/*!40000 ALTER TABLE `saved_jobs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `selection_phases`
--

DROP TABLE IF EXISTS `selection_phases`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `selection_phases` (
  `id` int NOT NULL,
  `job_id` int DEFAULT NULL,
  `phase_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `status` enum('pending','completed','passed','failed') CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `selection_phases`
--

LOCK TABLES `selection_phases` WRITE;
/*!40000 ALTER TABLE `selection_phases` DISABLE KEYS */;
/*!40000 ALTER TABLE `selection_phases` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `skills`
--

DROP TABLE IF EXISTS `skills`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `skills` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `skill_name` varchar(255) DEFAULT NULL,
  `skill_level` enum('Beginner','Intermediate','Advanced','Expert') DEFAULT 'Beginner',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `skills_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `skills`
--

LOCK TABLES `skills` WRITE;
/*!40000 ALTER TABLE `skills` DISABLE KEYS */;
INSERT INTO `skills` VALUES (1,6,'Node.js','Expert','2025-09-12 03:50:12','2025-09-18 15:44:29');
/*!40000 ALTER TABLE `skills` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `full_name` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `role` enum('admin','hr','pelamar') NOT NULL DEFAULT 'pelamar',
  `address` text,
  `date_of_birth` date DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `profile_photo` varchar(255) DEFAULT NULL,
  `company_name` varchar(255) DEFAULT NULL,
  `company_address` text,
  `position` varchar(255) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  KEY `idx_users_role_active` (`role`,`is_active`),
  KEY `idx_users_created` (`created_at`)
) ENGINE=InnoDB AUTO_INCREMENT=38 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,'Administrator','admin@stti.ac.id','$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBdXIG9xLH0O.K','admin',NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,'2025-09-11 16:00:32','2025-09-11 16:00:32'),(6,'Muhammad Rizal','rizal180204@gmail.com','$2a$12$uHdzXy7J/LLGNhXz1mUkGeIWWYgURAJ3bsTH/6eQIoFISZa0.ZW6q','pelamar','Kp sumur selang Ds Cimahi Kec Klari','1990-01-01','085179718031',NULL,NULL,NULL,NULL,1,'2025-09-12 01:00:13','2025-09-12 01:53:07'),(13,'Super Admin','admin@stti.local','$2a$10$L3FNcfTNfSpeDwnxpJa75OMK9y16zCyE3D2Sp6iLC5ucngs8ULKi2','admin',NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,'2025-09-18 20:24:43','2025-09-18 20:48:08'),(14,'Sinta Dewi Maharani','sinta.hr@teknologiindonesia.com','$2a$12$ajBm5mx/EC3rs37.k9hiOO4DJO1JzP9W9TCqzlcxnVtHHug2Q33je','hr',NULL,NULL,'021-29345678',NULL,'PT. Teknologi Indonesia Maju','Gedung Cyber 2 Tower, Jl. HR. Rasuna Said Blok X-5 Kav. 13, Jakarta Selatan 12950','HR Manager - IT Recruitment',1,'2025-09-19 11:03:12','2025-09-19 11:03:12'),(28,'Ahmad Rizki Pratama','akwjeakfaklsjflkajflksjalksfj@gmail.com','$2a$12$OzO9bk5INjGaWQg1OJlkOe0CxN0Wh0QW91./51H7mnQnTLH7Dc9Pu','pelamar','Jl. Merdeka No. 45, Kelurahan Sukajadi, Kecamatan Bandung Wetan, Bandung, Jawa Barat 40132','1999-03-15','081234567890',NULL,NULL,NULL,NULL,1,'2025-09-20 16:48:12','2025-09-20 16:48:12'),(29,'Ahmad Rizki Pratama','rizki@gmail.com','$2a$12$ogQL58KzC8ydOrW/9/BdtOBX.Mq/InxeBxwHkraTYO1./xgwDJUnu','pelamar','Jl. Merdeka No. 45, Kelurahan Sukajadi, Kecamatan Bandung Wetan, Bandung, Jawa Barat 40132','1999-03-15','081234567890',NULL,NULL,NULL,NULL,1,'2025-09-20 16:48:28','2025-09-20 16:48:28'),(30,'Rizal Ahmad','zxzztech@gmail.com','$2a$12$Fm8VVJU.rOLLMfrdxVkfMuLDlo2yyBWTeaENjPxiCQhzqdD8QUs22','pelamar','Dusun sumur selang desa Cimahi kecamatan Klari Karawang','2004-02-18','085179718031',NULL,NULL,NULL,NULL,1,'2025-09-22 11:56:54','2025-09-23 10:04:54'),(31,'agra','agra@gmail.com','$2a$12$/.KELybTkXDT7MfKZeKhU.xegNEf/PlMbgOYcLNXzrpS48KIW.mAy','pelamar','Kp Sumur Selang desa Cimahi kecamatan Klari','2003-02-01','+6285715457092',NULL,NULL,NULL,NULL,1,'2025-09-22 13:46:07','2025-09-25 13:55:06'),(32,'Pelamar','pelamar@pelamar.com','$2a$12$wtzbJMzxD4O8jZ.t8g7Zhekert7zBqQrNxpAmhuqrSf7DMKYGpmKq','pelamar','Karawang','2025-09-23','08',NULL,NULL,NULL,NULL,1,'2025-09-22 17:50:52','2025-09-24 23:07:33'),(33,'hr','hr@hr.com','$2a$12$gbtnxWVEDYZLOodlP1dcVu5y8lyr4z7MN00NQVqLHXMNk7qmu3ydS','hr',NULL,NULL,'08',NULL,'hr','hr','hr',1,'2025-09-23 13:45:02','2025-09-23 13:45:02'),(34,'Budi','budi@example.com','$2a$12$dK18d/qbsP9GBV1flgpy3OekwGXge0NgPRxYOxHhChWEeMX9Q4gu6','pelamar',NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,'2025-09-24 05:21:24','2025-09-24 05:21:24'),(35,'User Pelamar','pelamaasd@mail.test','$2a$12$qlgILX.tL3qtVKaTBGMMMOt1PmOjUyxjvCg7gsNXMkEd7Iibptjly','pelamar','Jl. Merdeka No. 1',NULL,'08123456789',NULL,NULL,NULL,NULL,1,'2025-09-24 06:01:25','2025-09-24 06:01:25'),(36,'Muhammad Rizal','rizal@gmail.com','$2a$12$b/NF4egk.qcnckqVA6yO8elPUrNLpMYob09HpNB/HebeDyrKsqJdu','pelamar','Kp Sumur Selang desa Cimahi kecamatan Klari','2025-09-01','085715457092',NULL,NULL,NULL,NULL,1,'2025-09-24 11:54:38','2025-09-24 11:57:14'),(37,'agra','agrahr@gmail.com','$2a$12$FWK95zd6eZL35E5Zz1D09eJ59Dlot6Zp63O/TZq5lDQLwzn/6e16O','hr',NULL,NULL,'81351184785',NULL,'pt.heri jaya abadi','Munjul Kidul','rt 012',1,'2025-09-25 06:51:51','2025-09-25 06:51:51');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = latin1 */ ;
/*!50003 SET character_set_results = latin1 */ ;
/*!50003 SET collation_connection  = latin1_swedish_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER `create_pelamar_profile` AFTER INSERT ON `users` FOR EACH ROW BEGIN
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
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;

--
-- Table structure for table `work_experiences`
--

DROP TABLE IF EXISTS `work_experiences`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `work_experiences` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `company_name` varchar(255) DEFAULT NULL,
  `position` varchar(255) DEFAULT NULL,
  `start_date` date DEFAULT NULL,
  `end_date` date DEFAULT NULL,
  `is_current` tinyint(1) DEFAULT '0',
  `job_description` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `work_experiences_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `work_experiences`
--

LOCK TABLES `work_experiences` WRITE;
/*!40000 ALTER TABLE `work_experiences` DISABLE KEYS */;
INSERT INTO `work_experiences` VALUES (1,6,'PT. Tech Innovate Indonesia','Senior Software Developer','2022-01-15','2024-03-30',0,'Mengembangkan aplikasi web menggunakan Node.js, React, dan MySQL. Bertanggung jawab dalam merancang arsitektur sistem dan melakukan code review.','2025-09-12 03:35:21'),(3,31,'PT gomu gomu','Frontend Developer','2022-01-01','2025-12-31',0,'membuat ui user interface','2025-09-25 03:54:01'),(5,31,'pt gas kawin','senior pagawean','2022-01-15','2023-12-31',0,'anjayyyy','2025-09-25 13:07:30');
/*!40000 ALTER TABLE `work_experiences` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2025-09-26  1:26:23
