

CREATE TABLE `applications` (
  `id` int NOT NULL,
  `job_id` int DEFAULT NULL,
  `pelamar_id` int DEFAULT NULL,
  `status` enum('pending','accepted','rejected') DEFAULT 'pending',
  `cover_letter` text,
  `applied_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `bookmarks`
--

CREATE TABLE `bookmarks` (
  `id` int NOT NULL,
  `user_id` int NOT NULL,
  `job_id` int NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `certificates`
--

CREATE TABLE `certificates` (
  `id` int NOT NULL,
  `user_id` int NOT NULL,
  `certificate_name` varchar(255) DEFAULT NULL,
  `issuer` varchar(255) DEFAULT NULL,
  `issue_date` date DEFAULT NULL,
  `expiry_date` date DEFAULT NULL,
  `certificate_file` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `hr_profiles`
--

CREATE TABLE `hr_profiles` (
  `id` int NOT NULL,
  `user_id` int NOT NULL,
  `company_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `company_address` text COLLATE utf8mb4_unicode_ci,
  `position` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `department` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `employee_count` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `company_description` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `job_posts`
--

CREATE TABLE `job_posts` (
  `id` int NOT NULL,
  `hr_id` int DEFAULT NULL,
  `title` varchar(255) NOT NULL,
  `description` text,
  `requirements` text,
  `salary_range` varchar(100) DEFAULT NULL,
  `location` varchar(255) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `pelamar_profiles`
--

CREATE TABLE `pelamar_profiles` (
  `id` int NOT NULL,
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
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `pelamar_profiles`
--

INSERT INTO `pelamar_profiles` (`id`, `user_id`, `full_name`, `email`, `phone`, `address`, `city`, `country`, `profile_photo`, `education_level`, `major`, `institution_name`, `gpa`, `graduation_year`, `entry_year`, `work_experience`, `certificates`, `cv_file`, `cover_letter_file`, `portfolio_file`, `created_at`, `updated_at`) VALUES
(6, 6, 'Muhammad Rizal', 'rizal180204@gmail.com', '085179718031', 'Kp sumur selang Ds Cimahi Kec Klari', 'Karawang', 'Indonesia', 'profile_photo-1757644033407-340384357.png', 'S1', 'Teknik Informatika', 'Universitas Indonesia', '3.75', 2022, 2018, NULL, NULL, 'cv_file-1757648509447-725078516.pdf', 'cover_letter_file-1757648509525-435811890.pdf', 'portfolio_file-1757648509626-193490851.pdf', '2025-09-12 01:00:13', '2025-09-12 03:41:51');

-- --------------------------------------------------------

--
-- Table structure for table `skills`
--

CREATE TABLE `skills` (
  `id` int NOT NULL,
  `user_id` int NOT NULL,
  `skill_name` varchar(255) DEFAULT NULL,
  `skill_level` enum('Beginner','Intermediate','Advanced','Expert') DEFAULT 'Beginner',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `skills`
--

INSERT INTO `skills` (`id`, `user_id`, `skill_name`, `skill_level`, `created_at`) VALUES
(1, 6, 'Node.js', 'Expert', '2025-09-12 03:50:12');

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int NOT NULL,
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
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `full_name`, `email`, `password`, `role`, `address`, `date_of_birth`, `phone`, `profile_photo`, `company_name`, `company_address`, `position`, `is_active`, `created_at`, `updated_at`) VALUES
(1, 'Administrator', 'admin@stti.ac.id', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBdXIG9xLH0O.K', 'admin', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, '2025-09-11 16:00:32', '2025-09-11 16:00:32'),
(6, 'Muhammad Rizal', 'rizal180204@gmail.com', '$2a$12$uHdzXy7J/LLGNhXz1mUkGeIWWYgURAJ3bsTH/6eQIoFISZa0.ZW6q', 'pelamar', 'Kp sumur selang Ds Cimahi Kec Klari', '1990-01-01', '085179718031', NULL, NULL, NULL, NULL, 1, '2025-09-12 01:00:13', '2025-09-12 01:53:07');

--
-- Triggers `users`
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

-- --------------------------------------------------------

--
-- Table structure for table `work_experiences`
--

CREATE TABLE `work_experiences` (
  `id` int NOT NULL,
  `user_id` int NOT NULL,
  `company_name` varchar(255) DEFAULT NULL,
  `position` varchar(255) DEFAULT NULL,
  `start_date` date DEFAULT NULL,
  `end_date` date DEFAULT NULL,
  `is_current` tinyint(1) DEFAULT '0',
  `job_description` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `work_experiences`
--

INSERT INTO `work_experiences` (`id`, `user_id`, `company_name`, `position`, `start_date`, `end_date`, `is_current`, `job_description`, `created_at`) VALUES
(1, 6, 'PT. Tech Innovate Indonesia', 'Senior Software Developer', '2022-01-15', '2024-03-30', 0, 'Mengembangkan aplikasi web menggunakan Node.js, React, dan MySQL. Bertanggung jawab dalam merancang arsitektur sistem dan melakukan code review.', '2025-09-12 03:35:21');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `applications`
--
ALTER TABLE `applications`
  ADD PRIMARY KEY (`id`),
  ADD KEY `job_id` (`job_id`),
  ADD KEY `pelamar_id` (`pelamar_id`);

--
-- Indexes for table `bookmarks`
--
ALTER TABLE `bookmarks`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_bookmark` (`user_id`,`job_id`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `job_id` (`job_id`);

--
-- Indexes for table `certificates`
--
ALTER TABLE `certificates`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `hr_profiles`
--
ALTER TABLE `hr_profiles`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `idx_user_id` (`user_id`);

--
-- Indexes for table `job_posts`
--
ALTER TABLE `job_posts`
  ADD PRIMARY KEY (`id`),
  ADD KEY `hr_id` (`hr_id`);

--
-- Indexes for table `pelamar_profiles`
--
ALTER TABLE `pelamar_profiles`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_user_profile` (`user_id`);

--
-- Indexes for table `skills`
--
ALTER TABLE `skills`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`);

--
-- Indexes for table `work_experiences`
--
ALTER TABLE `work_experiences`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `applications`
--
ALTER TABLE `applications`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `bookmarks`
--
ALTER TABLE `bookmarks`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `certificates`
--
ALTER TABLE `certificates`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `hr_profiles`
--
ALTER TABLE `hr_profiles`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `job_posts`
--
ALTER TABLE `job_posts`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `pelamar_profiles`
--
ALTER TABLE `pelamar_profiles`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `skills`
--
ALTER TABLE `skills`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `work_experiences`
--
ALTER TABLE `work_experiences`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `applications`
--
ALTER TABLE `applications`
  ADD CONSTRAINT `applications_ibfk_1` FOREIGN KEY (`job_id`) REFERENCES `job_posts` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `applications_ibfk_2` FOREIGN KEY (`pelamar_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `bookmarks`
--
ALTER TABLE `bookmarks`
  ADD CONSTRAINT `bookmarks_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `bookmarks_ibfk_2` FOREIGN KEY (`job_id`) REFERENCES `job_posts` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `certificates`
--
ALTER TABLE `certificates`
  ADD CONSTRAINT `certificates_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `hr_profiles`
--
ALTER TABLE `hr_profiles`
  ADD CONSTRAINT `fk_hr_profiles_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `job_posts`
--
ALTER TABLE `job_posts`
  ADD CONSTRAINT `job_posts_ibfk_1` FOREIGN KEY (`hr_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `pelamar_profiles`
--
ALTER TABLE `pelamar_profiles`
  ADD CONSTRAINT `pelamar_profiles_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `skills`
--
ALTER TABLE `skills`
  ADD CONSTRAINT `skills_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `work_experiences`
--
ALTER TABLE `work_experiences`
  ADD CONSTRAINT `work_experiences_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
