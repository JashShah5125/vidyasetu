-- phpMyAdmin SQL Dump
-- version 5.2.3
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1:3306
-- Generation Time: Oct 12, 2026 at 09:42 AM
-- Server version: 8.0.46
-- PHP Version: 8.3.28

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";
SET FOREIGN_KEY_CHECKS = 0;
SET UNIQUE_CHECKS = 0;


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `vidyasetu`
--

-- --------------------------------------------------------

-- --------------------------------------------------------

--
-- Table structure for table `academic_years`
--

DROP TABLE IF EXISTS `academic_years`;
CREATE TABLE IF NOT EXISTS `academic_years` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL,
  `branch_id` int NOT NULL,
  `name` varchar(50) NOT NULL,
  `start_date` date NOT NULL,
  `end_date` date NOT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'upcoming',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` datetime DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `branch_id` (`branch_id`,`name`),
  KEY `tenant_id` (`tenant_id`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `academic_years`
--

INSERT INTO `academic_years` (`id`, `tenant_id`, `branch_id`, `name`, `start_date`, `end_date`, `status`, `created_at`, `updated_at`, `deleted_at`, `created_by`, `updated_by`) VALUES
(2, 2, 1, '2026-27', '2026-04-01', '2027-03-31', 'active', '2026-09-02 12:18:55', '2026-09-02 12:18:55', NULL, 2, 2);

-- --------------------------------------------------------

--
-- Table structure for table `admissions`
--

DROP TABLE IF EXISTS `admissions`;
CREATE TABLE IF NOT EXISTS `admissions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL,
  `branch_id` int NOT NULL,
  `student_id` int NOT NULL,
  `enquiry_id` int DEFAULT NULL,
  `admission_date` date NOT NULL,
  `admission_number` varchar(50) DEFAULT NULL,
  `status` tinyint NOT NULL DEFAULT '0' COMMENT '0=registration_pending,1=documents_submitted,2=verification_pending,3=batch_allocation,4=active,-1=withdrawn,-2=cancelled',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` datetime DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  `academic_year_id` int DEFAULT NULL,
  `enrollment_id` int DEFAULT NULL,
  `admission_mode` enum('walk_in','online','staff_assisted','self_registration') DEFAULT NULL,
  `registration_completed_at` datetime DEFAULT NULL,
  `documents_verified_at` datetime DEFAULT NULL,
  `batch_allocated_at` datetime DEFAULT NULL,
  `activated_at` datetime DEFAULT NULL,
  `withdrawn_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `tenant_id` (`tenant_id`,`admission_number`),
  KEY `branch_id` (`branch_id`),
  KEY `student_id` (`student_id`),
  KEY `enquiry_id` (`enquiry_id`),
  KEY `fk_admissions_academic_year` (`academic_year_id`),
  KEY `fk_admissions_enrollment` (`enrollment_id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `admissions`
--

INSERT INTO `admissions` (`id`, `tenant_id`, `branch_id`, `student_id`, `enquiry_id`, `admission_date`, `admission_number`, `status`, `created_at`, `updated_at`, `deleted_at`, `created_by`, `updated_by`, `academic_year_id`, `enrollment_id`, `admission_mode`, `registration_completed_at`, `documents_verified_at`, `batch_allocated_at`, `activated_at`, `withdrawn_at`) VALUES
(3, 2, 1, 3, 11, '2026-09-17', 'ADM-2026-00002', 0, '2026-09-17 18:53:37', '2026-09-17 18:53:37', NULL, 2, 2, 2, 3, 'staff_assisted', '2026-09-17 18:53:37', NULL, NULL, NULL, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `announcements`
--

DROP TABLE IF EXISTS `announcements`;
CREATE TABLE IF NOT EXISTS `announcements` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL,
  `branch_id` int DEFAULT NULL,
  `title` varchar(255) NOT NULL,
  `content` text NOT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'draft',
  `published_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` datetime DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `tenant_id` (`tenant_id`),
  KEY `branch_id` (`branch_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `announcement_audiences`
--

DROP TABLE IF EXISTS `announcement_audiences`;
CREATE TABLE IF NOT EXISTS `announcement_audiences` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL,
  `announcement_id` int NOT NULL,
  `target_type` varchar(50) NOT NULL,
  `target_id` int DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `tenant_id` (`tenant_id`),
  KEY `announcement_id` (`announcement_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `approval_requests`
--

DROP TABLE IF EXISTS `approval_requests`;
CREATE TABLE IF NOT EXISTS `approval_requests` (
  `id` int NOT NULL AUTO_INCREMENT,
  `request_type` enum('new_tenant','subscription_change','custom_domain','enterprise_custom') NOT NULL,
  `tenant_id` int DEFAULT NULL,
  `requester_name` varchar(255) NOT NULL,
  `details` text NOT NULL,
  `status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  `decision_note` text,
  `decided_by` int DEFAULT NULL,
  `decided_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `created_by` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `decided_by` (`decided_by`),
  KEY `idx_approval_requests_status` (`status`),
  KEY `idx_approval_requests_tenant` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `app_devices`
--

DROP TABLE IF EXISTS `app_devices`;
CREATE TABLE IF NOT EXISTS `app_devices` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL,
  `user_id` int NOT NULL,
  `device_name` varchar(255) DEFAULT NULL,
  `os_type` varchar(50) DEFAULT NULL,
  `os_version` varchar(50) DEFAULT NULL,
  `app_version` varchar(50) DEFAULT NULL,
  `device_identifier` varchar(255) NOT NULL,
  `last_active_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `device_identifier` (`device_identifier`),
  KEY `tenant_id` (`tenant_id`),
  KEY `user_id` (`user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `app_devices`
--

INSERT INTO `app_devices` (`id`, `tenant_id`, `user_id`, `device_name`, `os_type`, `os_version`, `app_version`, `device_identifier`, `last_active_at`, `created_at`) VALUES
(1, 2, 228, 'Pixel 8 Pro', 'Android', '14', '1.0.0', 'dev-uuid-test-12345', '2026-10-05 11:38:56', '2026-10-05 11:38:56'),
(2, 2, 228, 'Pixel 8 Pro', 'Android', '14', '1.0.0', 'pixel-8-uuid-test-999', '2026-10-12 14:50:13', '2026-10-05 11:51:41');

-- --------------------------------------------------------

--
-- Table structure for table `assignments`
--

DROP TABLE IF EXISTS `assignments`;
CREATE TABLE IF NOT EXISTS `assignments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL,
  `branch_id` int NOT NULL,
  `academic_year_id` int NOT NULL,
  `batch_id` int DEFAULT NULL,
  `batch_ids` json DEFAULT NULL,
  `files` json DEFAULT NULL,
  `subject_id` int NOT NULL,
  `title` varchar(255) NOT NULL,
  `description` text,
  `due_date` datetime NOT NULL,
  `max_marks` decimal(5,2) DEFAULT NULL,
  `is_submission_allowed` tinyint(1) NOT NULL DEFAULT '1',
  `status` varchar(20) NOT NULL DEFAULT 'published',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` datetime DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `tenant_id` (`tenant_id`),
  KEY `branch_id` (`branch_id`),
  KEY `academic_year_id` (`academic_year_id`),
  KEY `batch_id` (`batch_id`),
  KEY `subject_id` (`subject_id`)
) ENGINE=InnoDB AUTO_INCREMENT=18 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `assignments`
--

INSERT INTO `assignments` (`id`, `tenant_id`, `branch_id`, `academic_year_id`, `batch_id`, `batch_ids`, `files`, `subject_id`, `title`, `description`, `due_date`, `max_marks`, `is_submission_allowed`, `status`, `created_at`, `updated_at`, `deleted_at`, `created_by`, `updated_by`) VALUES
(1, 2, 1, 2, 1, '[1]', '\"[]\"', 1, 'JEE XI – Sets, Relations & Functions Worksheet', 'Solve Q1–Q12 from the printed worksheet. Show set operations and verify relations with a small Venn diagram for Q7. Submission will be graded for method as well as the final answer.', '2026-09-20 23:59:59', 20.00, 1, 'published', '2026-09-08 16:32:09', '2026-09-10 15:03:12', NULL, 215, 215);

-- --------------------------------------------------------

--
-- Table structure for table `assignment_files`
--

DROP TABLE IF EXISTS `assignment_files`;
CREATE TABLE IF NOT EXISTS `assignment_files` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL,
  `assignment_id` int NOT NULL,
  `file_name` varchar(255) NOT NULL,
  `storage_key` text NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `tenant_id` (`tenant_id`),
  KEY `assignment_id` (`assignment_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `assignment_submissions`
--

DROP TABLE IF EXISTS `assignment_submissions`;
CREATE TABLE IF NOT EXISTS `assignment_submissions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL,
  `assignment_id` int NOT NULL,
  `enrollment_id` int NOT NULL,
  `student_id` int DEFAULT NULL,
  `response_text` text,
  `files` json DEFAULT NULL,
  `submitted_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `status` varchar(20) NOT NULL DEFAULT 'submitted',
  `marks_obtained` decimal(5,2) DEFAULT NULL,
  `teacher_feedback` text,
  `graded_by` int DEFAULT NULL,
  `graded_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `assignment_id` (`assignment_id`,`enrollment_id`),
  KEY `tenant_id` (`tenant_id`),
  KEY `enrollment_id` (`enrollment_id`),
  KEY `graded_by` (`graded_by`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `assignment_submission_files`
--

DROP TABLE IF EXISTS `assignment_submission_files`;
CREATE TABLE IF NOT EXISTS `assignment_submission_files` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL,
  `submission_id` int NOT NULL,
  `file_name` varchar(255) NOT NULL,
  `storage_key` text NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `tenant_id` (`tenant_id`),
  KEY `submission_id` (`submission_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `attendance_records`
--

DROP TABLE IF EXISTS `attendance_records`;
CREATE TABLE IF NOT EXISTS `attendance_records` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL,
  `lecture_id` int NOT NULL,
  `student_id` int NOT NULL,
  `status` tinyint NOT NULL DEFAULT '0' COMMENT '0=absent, 1=present, 2=late',
  `remarks` text,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `created_by` int DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `lecture_id` (`lecture_id`,`student_id`),
  KEY `idx_attendance_tenant` (`tenant_id`),
  KEY `idx_attendance_lecture` (`lecture_id`),
  KEY `idx_attendance_student` (`student_id`)
) ENGINE=InnoDB AUTO_INCREMENT=42 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `audit_logs`
--

DROP TABLE IF EXISTS `audit_logs`;
CREATE TABLE IF NOT EXISTS `audit_logs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int DEFAULT NULL,
  `user_id` int DEFAULT NULL,
  `correlation_id` int DEFAULT NULL,
  `action` varchar(100) NOT NULL,
  `entity_type` varchar(100) NOT NULL,
  `entity_id` int NOT NULL,
  `severity` enum('info','warning','critical') NOT NULL DEFAULT 'info',
  `endpoint` varchar(255) DEFAULT NULL,
  `request_method` varchar(10) DEFAULT NULL,
  `old_values` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin,
  `new_values` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` text,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_audit_entity` (`entity_type`,`entity_id`),
  KEY `idx_audit_tenant_action` (`tenant_id`,`action`),
  KEY `idx_audit_logs_user` (`user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=2223 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `audit_logs`
--

INSERT INTO `audit_logs` (`id`, `tenant_id`, `user_id`, `correlation_id`, `action`, `entity_type`, `entity_id`, `severity`, `endpoint`, `request_method`, `old_values`, `new_values`, `ip_address`, `user_agent`, `created_at`) VALUES
(2172, 2, NULL, NULL, 'UPDATE', 'tenant', 2, 'info', NULL, NULL, NULL, NULL, '127.0.0.1', NULL, '2026-09-29 11:43:31');

-- --------------------------------------------------------

--
-- Table structure for table `batches`
--

DROP TABLE IF EXISTS `batches`;
CREATE TABLE IF NOT EXISTS `batches` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL,
  `branch_id` int NOT NULL,
  `academic_year_id` int NOT NULL,
  `level_id` int NOT NULL,
  `name` varchar(255) NOT NULL,
  `code` varchar(100) DEFAULT NULL,
  `capacity` int DEFAULT NULL,
  `current_strength` int NOT NULL DEFAULT '0',
  `start_time` time DEFAULT NULL,
  `end_time` time DEFAULT NULL,
  `classroom_id` int DEFAULT NULL,
  `status` tinyint NOT NULL DEFAULT '1' COMMENT '0: Inactive, 1: Active, 2: Deleted',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` datetime DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `branch_id` (`branch_id`,`academic_year_id`,`code`),
  KEY `academic_year_id` (`academic_year_id`),
  KEY `level_id` (`level_id`),
  KEY `classroom_id` (`classroom_id`),
  KEY `idx_batches_branch` (`tenant_id`,`branch_id`),
  KEY `idx_batches_ay` (`tenant_id`,`branch_id`,`academic_year_id`),
  KEY `idx_batches_status` (`tenant_id`,`branch_id`,`status`)
) ENGINE=InnoDB AUTO_INCREMENT=23 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `batches`
--

INSERT INTO `batches` (`id`, `tenant_id`, `branch_id`, `academic_year_id`, `level_id`, `name`, `code`, `capacity`, `current_strength`, `start_time`, `end_time`, `classroom_id`, `status`, `created_at`, `updated_at`, `deleted_at`, `created_by`, `updated_by`) VALUES
(1, 2, 1, 2, 1, 'JEE XI Morning', 'JEE-XI-M', 60, 10, '07:30:00', '12:30:00', 1, 1, '2026-09-02 12:18:55', '2026-09-10 10:54:07', NULL, 2, 2);

-- --------------------------------------------------------

--
-- Table structure for table `batch_transfer_history`
--

DROP TABLE IF EXISTS `batch_transfer_history`;
CREATE TABLE IF NOT EXISTS `batch_transfer_history` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL,
  `student_id` int NOT NULL,
  `from_enrollment_id` int DEFAULT NULL,
  `to_enrollment_id` int NOT NULL,
  `from_batch_id` int DEFAULT NULL,
  `to_batch_id` int NOT NULL,
  `transfer_date` date NOT NULL,
  `reason` text NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_by` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `tenant_id` (`tenant_id`),
  KEY `student_id` (`student_id`),
  KEY `from_enrollment_id` (`from_enrollment_id`),
  KEY `to_enrollment_id` (`to_enrollment_id`),
  KEY `from_batch_id` (`from_batch_id`),
  KEY `to_batch_id` (`to_batch_id`),
  KEY `created_by` (`created_by`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `boards`
--

DROP TABLE IF EXISTS `boards`;
CREATE TABLE IF NOT EXISTS `boards` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL,
  `name` varchar(255) NOT NULL,
  `code` varchar(50) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` datetime DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `code` (`code`),
  KEY `tenant_id` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `branches`
--

DROP TABLE IF EXISTS `branches`;
CREATE TABLE IF NOT EXISTS `branches` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL,
  `name` varchar(255) NOT NULL,
  `code` varchar(50) NOT NULL,
  `address_line1` varchar(255) DEFAULT NULL,
  `city` varchar(100) DEFAULT NULL,
  `state` varchar(100) DEFAULT NULL,
  `pincode` varchar(10) DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `capacity` int DEFAULT NULL,
  `operating_hours` varchar(100) DEFAULT NULL,
  `status` enum('active','inactive','suspended','deleted') NOT NULL DEFAULT 'active',
  `bank_account_name` varchar(255) DEFAULT NULL,
  `bank_account_number` varchar(50) DEFAULT NULL,
  `bank_ifsc` varchar(20) DEFAULT NULL,
  `bank_name` varchar(100) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` datetime DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `tenant_id` (`tenant_id`,`code`),
  KEY `idx_branches_tenant` (`tenant_id`),
  KEY `idx_branches_status` (`tenant_id`,`status`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `branches`
--

INSERT INTO `branches` (`id`, `tenant_id`, `name`, `code`, `address_line1`, `city`, `state`, `pincode`, `phone`, `email`, `capacity`, `operating_hours`, `status`, `bank_account_name`, `bank_account_number`, `bank_ifsc`, `bank_name`, `created_at`, `updated_at`, `deleted_at`, `created_by`, `updated_by`) VALUES
(1, 2, 'Mumbai West', 'MUM-WEST', '101, Western Heights, Andheri West', 'Mumbai', 'Maharashtra', '400053', '022-26345566', 'mumbaiwest@apexiit.com', 300, '08:00 AM - 08:00 PM', 'active', 'Apex IIT Academy - Mumbai West', '50100234567890', 'HDFC0001234', 'HDFC Bank', '2026-09-02 12:18:55', '2026-09-09 15:59:03', NULL, 2, 2);

-- --------------------------------------------------------

--
-- Table structure for table `branch_other_expenses`
--

DROP TABLE IF EXISTS `branch_other_expenses`;
CREATE TABLE IF NOT EXISTS `branch_other_expenses` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL,
  `branch_id` int NOT NULL,
  `expense_record_number` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `title` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `category` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Other Expenses',
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `expense_date` date NOT NULL,
  `status` tinyint NOT NULL DEFAULT '0' COMMENT '0=Pending, 1=Approved, 2=Paid, 3=Rejected',
  `payment_mode` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'bank_transfer',
  `reference_number` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `payee` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `attachment_urls` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin,
  `created_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `expense_record_number` (`expense_record_number`),
  KEY `idx_other_expense_tenant` (`tenant_id`),
  KEY `idx_other_expense_branch` (`branch_id`),
  KEY `idx_other_expense_date` (`expense_date`),
  KEY `idx_other_expense_status` (`status`),
  KEY `idx_other_expense_category` (`category`),
  KEY `idx_other_expense_created_by` (`created_by`)
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `branch_other_income`
--

DROP TABLE IF EXISTS `branch_other_income`;
CREATE TABLE IF NOT EXISTS `branch_other_income` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL,
  `branch_id` int NOT NULL,
  `income_record_number` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `title` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `income_date` date NOT NULL,
  `payment_mode` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'bank_transfer',
  `reference_number` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `attachment_urls` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin,
  `created_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `income_record_number` (`income_record_number`),
  KEY `idx_other_income_tenant` (`tenant_id`),
  KEY `idx_other_income_branch` (`branch_id`),
  KEY `idx_other_income_date` (`income_date`),
  KEY `idx_other_income_created_by` (`created_by`)
) ENGINE=InnoDB AUTO_INCREMENT=19 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `branch_programs`
--

DROP TABLE IF EXISTS `branch_programs`;
CREATE TABLE IF NOT EXISTS `branch_programs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL,
  `branch_id` int NOT NULL,
  `course_id` int NOT NULL,
  `program_id` int NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_branch_programs` (`branch_id`,`program_id`),
  KEY `tenant_id` (`tenant_id`),
  KEY `course_id` (`course_id`),
  KEY `program_id` (`program_id`)
) ENGINE=InnoDB AUTO_INCREMENT=26 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `branch_programs`
--

INSERT INTO `branch_programs` (`id`, `tenant_id`, `branch_id`, `course_id`, `program_id`, `created_at`) VALUES
(15, 2, 1, 1, 1, '2026-09-09 15:59:03');

-- --------------------------------------------------------

--
-- Table structure for table `branch_settings`
--

DROP TABLE IF EXISTS `branch_settings`;
CREATE TABLE IF NOT EXISTS `branch_settings` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL,
  `branch_id` int NOT NULL,
  `setting_key` varchar(100) NOT NULL,
  `setting_value` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `branch_id` (`branch_id`,`setting_key`),
  KEY `tenant_id` (`tenant_id`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `branch_settings`
--

INSERT INTO `branch_settings` (`id`, `tenant_id`, `branch_id`, `setting_key`, `setting_value`, `created_at`, `updated_at`) VALUES
(1, 2, 1, 'alt_emails', '[\"seema.alt@apexiit.com\", \"support.mumbai@apexiit.com\"]', '2026-09-02 12:18:55', '2026-09-02 12:18:55'),
(2, 2, 1, 'default_email', '\"seema@apexiit.com\"', '2026-09-02 12:18:55', '2026-09-09 15:53:43');

-- --------------------------------------------------------

--
-- Table structure for table `broadcast_messages`
--

DROP TABLE IF EXISTS `broadcast_messages`;
CREATE TABLE IF NOT EXISTS `broadcast_messages` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL,
  `teacher_user_id` int NOT NULL,
  `batch_id` int NOT NULL,
  `message` text NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `tenant_id` (`tenant_id`),
  KEY `teacher_user_id` (`teacher_user_id`),
  KEY `batch_id` (`batch_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `classrooms`
--

DROP TABLE IF EXISTS `classrooms`;
CREATE TABLE IF NOT EXISTS `classrooms` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL,
  `branch_id` int NOT NULL,
  `name` varchar(100) NOT NULL,
  `room_number` varchar(50) DEFAULT NULL,
  `capacity` int NOT NULL,
  `type` enum('classroom','lab','seminar_hall','computer_lab') NOT NULL DEFAULT 'classroom',
  `status` enum('active','inactive','under_maintenance','deleted') NOT NULL DEFAULT 'active',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` datetime DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `branch_id` (`branch_id`,`name`),
  KEY `tenant_id` (`tenant_id`)
) ENGINE=InnoDB AUTO_INCREMENT=77 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `classrooms`
--

INSERT INTO `classrooms` (`id`, `tenant_id`, `branch_id`, `name`, `room_number`, `capacity`, `type`, `status`, `created_at`, `updated_at`, `deleted_at`, `created_by`, `updated_by`) VALUES
(1, 2, 1, 'Room 101', '101', 60, 'classroom', 'active', '2026-09-02 12:18:55', '2026-09-02 12:18:55', NULL, 2, 2);

-- --------------------------------------------------------

--
-- Table structure for table `communication_logs`
--

DROP TABLE IF EXISTS `communication_logs`;
CREATE TABLE IF NOT EXISTS `communication_logs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL,
  `channel` varchar(20) NOT NULL,
  `recipient` varchar(255) NOT NULL,
  `subject` varchar(255) DEFAULT NULL,
  `content` text,
  `status` varchar(20) NOT NULL,
  `error_message` text,
  `sent_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `tenant_id` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `concessions`
--

DROP TABLE IF EXISTS `concessions`;
CREATE TABLE IF NOT EXISTS `concessions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL,
  `branch_id` int NOT NULL,
  `enrollment_id` int DEFAULT NULL,
  `amount` decimal(10,2) DEFAULT NULL,
  `percentage` decimal(5,2) DEFAULT NULL,
  `reason` text NOT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'pending',
  `approved_by` int DEFAULT NULL,
  `approved_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `created_by` int DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  `enquiry_id` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `tenant_id` (`tenant_id`),
  KEY `branch_id` (`branch_id`),
  KEY `enrollment_id` (`enrollment_id`),
  KEY `approved_by` (`approved_by`),
  KEY `fk_concessions_enquiry` (`enquiry_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `courses`
--

DROP TABLE IF EXISTS `courses`;
CREATE TABLE IF NOT EXISTS `courses` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL,
  `name` varchar(255) NOT NULL,
  `code` varchar(50) NOT NULL,
  `description` text,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` datetime DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `tenant_id` (`tenant_id`,`code`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `courses`
--

INSERT INTO `courses` (`id`, `tenant_id`, `name`, `code`, `description`, `is_active`, `created_at`, `updated_at`, `deleted_at`, `created_by`, `updated_by`) VALUES
(1, 2, 'JEE Prep Course', 'JEE-PREP', 'Two year comprehensive course for JEE Advanced', 1, '2026-09-02 12:18:55', '2026-09-02 12:18:55', NULL, 2, 2);

-- --------------------------------------------------------

--
-- Table structure for table `course_branches`
--

DROP TABLE IF EXISTS `course_branches`;
CREATE TABLE IF NOT EXISTS `course_branches` (
  `course_id` int NOT NULL,
  `branch_id` int NOT NULL,
  PRIMARY KEY (`course_id`,`branch_id`),
  KEY `branch_id` (`branch_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `course_branches`
--

INSERT INTO `course_branches` (`course_id`, `branch_id`) VALUES
(1, 1);

-- --------------------------------------------------------

--
-- Table structure for table `document_types`
--

DROP TABLE IF EXISTS `document_types`;
CREATE TABLE IF NOT EXISTS `document_types` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `code` varchar(50) NOT NULL,
  `is_required` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` datetime DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `code` (`code`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `document_types`
--

INSERT INTO `document_types` (`id`, `name`, `code`, `is_required`, `created_at`, `updated_at`, `deleted_at`, `created_by`, `updated_by`) VALUES
(1, 'Student Photo', 'student_photo', 1, '2026-09-17 18:36:02', '2026-09-17 18:36:02', NULL, NULL, NULL),
(2, 'ID Proof (Aadhar)', 'aadhaar_card', 1, '2026-09-17 18:36:02', '2026-09-17 18:36:02', NULL, NULL, NULL),
(3, 'Previous Marksheet', 'previous_marksheet', 1, '2026-09-17 18:36:02', '2026-09-17 18:36:02', NULL, NULL, NULL),
(4, 'Transfer Certificate', 'transfer_certificate', 0, '2026-09-17 18:36:02', '2026-09-17 18:36:02', NULL, NULL, NULL),
(5, 'Other Document', 'other', 0, '2026-09-17 18:36:02', '2026-09-17 18:36:02', NULL, NULL, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `email_templates`
--

DROP TABLE IF EXISTS `email_templates`;
CREATE TABLE IF NOT EXISTS `email_templates` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL,
  `template_key` varchar(100) NOT NULL,
  `name` varchar(150) NOT NULL,
  `description` text,
  `category` enum('AUTHENTICATION','ONBOARDING','TENANT','SUBSCRIPTION') NOT NULL,
  `subject` varchar(500) NOT NULL,
  `html_body` longtext NOT NULL,
  `text_body` longtext,
  `variables` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin,
  `status` enum('ACTIVE','INACTIVE') NOT NULL DEFAULT 'ACTIVE',
  `is_system` tinyint(1) NOT NULL DEFAULT '1',
  `created_by` int DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_email_templates_tenant_key` (`tenant_id`,`template_key`),
  KEY `idx_email_templates_category` (`category`),
  KEY `idx_email_templates_status` (`status`),
  KEY `idx_email_templates_system` (`is_system`),
  KEY `idx_email_templates_deleted_at` (`deleted_at`),
  KEY `idx_email_templates_created_by` (`created_by`),
  KEY `idx_email_templates_updated_by` (`updated_by`)
) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `email_templates`
--

INSERT INTO `email_templates` (`id`, `tenant_id`, `template_key`, `name`, `description`, `category`, `subject`, `html_body`, `text_body`, `variables`, `status`, `is_system`, `created_by`, `updated_by`, `created_at`, `updated_at`, `deleted_at`) VALUES
(1, 1, 'ACCOUNT_CREATED', 'Account Created', 'Sent when a new user account is created and first-time access details are available.', 'AUTHENTICATION', 'Your {{platform_name}} account has been created', '<!DOCTYPE html>\r\n<html>\r\n<head><meta charset=\"UTF-8\"></head>\r\n<body>\r\n<h2>Your account has been created</h2>\r\n<p>Hello {{user_name}},</p>\r\n<p>Your account has been successfully created on <strong>{{platform_name}}</strong>.</p>\r\n<p><strong>Username:</strong> {{username}}</p>\r\n<p><strong>Temporary Password:</strong> {{temporary_password}}</p>\r\n<p><a href=\"{{login_url}}\">Login to your account</a></p>\r\n<p>Please change your temporary password after your first login.</p>\r\n<p>For assistance, contact {{support_email}}.</p>\r\n</body>\r\n</html>', 'Hello {{user_name}},\r\n\r\nYour account has been successfully created on {{platform_name}}.\r\n\r\nUsername: {{username}}\r\nTemporary Password: {{temporary_password}}\r\n\r\nLogin:\r\n{{login_url}}\r\n\r\nPlease change your temporary password after your first login.\r\n\r\nFor assistance, contact {{support_email}}.', '{\"username\": \"Username or login identifier\", \"login_url\": \"Login URL\", \"user_name\": \"Name of the account holder\", \"platform_name\": \"Name of the SaaS platform\", \"support_email\": \"Support email address\", \"temporary_password\": \"Temporary first-login password\"}', 'INACTIVE', 1, NULL, NULL, '2026-09-02 12:18:55', '2026-09-07 15:38:55', '2026-09-07 15:38:55'),
(2, 1, 'EMAIL_VERIFICATION', 'Email Verification', 'Sent when a user needs to verify their email address.', 'AUTHENTICATION', 'Verify your email address', '<!DOCTYPE html>\r\n<html>\r\n<head><meta charset=\"UTF-8\"></head>\r\n<body>\r\n<h2>Verify your email address</h2>\r\n<p>Hello {{user_name}},</p>\r\n<p>Please verify your email address to complete your account setup.</p>\r\n<p><a href=\"{{verification_link}}\">Verify Email Address</a></p>\r\n<p>This verification link will expire at {{expiry_time}}.</p>\r\n<p>If you did not request this verification, you can safely ignore this email.</p>\r\n<p>{{platform_name}}</p>\r\n</body>\r\n</html>', 'Hello {{user_name}},\r\n\r\nPlease verify your email address to complete your account setup.\r\n\r\nVerify your email:\r\n{{verification_link}}\r\n\r\nThis verification link will expire at {{expiry_time}}.\r\n\r\nIf you did not request this verification, you can safely ignore this email.\r\n\r\n{{platform_name}}', '{\"user_name\": \"Name of the recipient\", \"expiry_time\": \"Verification link expiry time\", \"platform_name\": \"Name of the SaaS platform\", \"verification_link\": \"Email verification URL\"}', 'ACTIVE', 1, NULL, NULL, '2026-09-02 12:18:55', '2026-09-02 12:18:55', NULL),
(3, 1, 'PASSWORD_RESET', 'Password Reset', 'Sent when a user requests a password reset.', 'AUTHENTICATION', 'Reset your {{platform_name}} password', '<!DOCTYPE html>\r\n<html>\r\n<head><meta charset=\"UTF-8\"></head>\r\n<body>\r\n<h2>Reset your password</h2>\r\n<p>Hello {{user_name}},</p>\r\n<p>We received a request to reset your password.</p>\r\n<p><a href=\"{{reset_link}}\">Reset Password</a></p>\r\n<p>This link will expire at {{expiry_time}}.</p>\r\n<p>If you did not request a password reset, you can safely ignore this email.</p>\r\n<p>{{platform_name}} Support</p>\r\n</body>\r\n</html>', 'Hello {{user_name}},\r\n\r\nWe received a request to reset your password.\r\n\r\nReset your password:\r\n{{reset_link}}\r\n\r\nThis link will expire at {{expiry_time}}.\r\n\r\nIf you did not request a password reset, you can safely ignore this email.\r\n\r\n{{platform_name}} Support.', '{\"user_name\": \"Name of the recipient\", \"reset_link\": \"Password reset URL\", \"expiry_time\": \"Password reset link expiry time\", \"platform_name\": \"Name of the SaaS platform\"}', 'ACTIVE', 1, NULL, NULL, '2026-09-02 12:18:55', '2026-09-02 12:18:55', NULL),
(4, 1, 'PASSWORD_CHANGED', 'Password Changed', 'Sent after a user successfully changes their password.', 'AUTHENTICATION', 'Your password has been changed', '<!DOCTYPE html>\r\n<html>\r\n<head><meta charset=\"UTF-8\"></head>\r\n<body>\r\n<h2>Password changed successfully</h2>\r\n<p>Hello {{user_name}},</p>\r\n<p>Your password for {{platform_name}} has been changed successfully.</p>\r\n<p><strong>Changed at:</strong> {{changed_at}}</p>\r\n<p>If you did not make this change, please contact {{support_email}} immediately.</p>\r\n</body>\r\n</html>', 'Hello {{user_name}},\r\n\r\nYour password for {{platform_name}} has been changed successfully.\r\n\r\nChanged at: {{changed_at}}\r\n\r\nIf you did not make this change, contact {{support_email}} immediately.', '{\"user_name\": \"Name of the recipient\", \"changed_at\": \"Date and time of password change\", \"platform_name\": \"Name of the SaaS platform\", \"support_email\": \"Support email address\"}', 'ACTIVE', 1, NULL, NULL, '2026-09-02 12:18:55', '2026-09-02 12:18:55', NULL),
(5, 1, 'ACCOUNT_ACTIVATED', 'Account Activated', 'Sent when a previously inactive user account is activated.', 'AUTHENTICATION', 'Your {{platform_name}} account is now active', '<!DOCTYPE html>\r\n<html>\r\n<head><meta charset=\"UTF-8\"></head>\r\n<body>\r\n<h2>Your account is active</h2>\r\n<p>Hello {{user_name}},</p>\r\n<p>Your account on {{platform_name}} has been activated successfully.</p>\r\n<p><a href=\"{{login_url}}\">Login to your account</a></p>\r\n<p>If you need assistance, contact {{support_email}}.</p>\r\n</body>\r\n</html>', 'Hello {{user_name}},\r\n\r\nYour account on {{platform_name}} has been activated successfully.\r\n\r\nLogin:\r\n{{login_url}}\r\n\r\nFor assistance, contact {{support_email}}.', '{\"login_url\": \"Login URL\", \"user_name\": \"Name of the recipient\", \"platform_name\": \"Name of the SaaS platform\", \"support_email\": \"Support email address\"}', 'ACTIVE', 1, NULL, NULL, '2026-09-02 12:18:55', '2026-09-02 12:18:55', NULL),
(6, 1, 'STUDENT_REGISTRATION_SUCCESS', 'Student Registration Successful', 'Sent after a student registration and enrollment have been successfully completed.', 'ONBOARDING', 'Your registration at {{institute_name}} is successful', '<!DOCTYPE html>\r\n<html>\r\n<head><meta charset=\"UTF-8\"></head>\r\n<body>\r\n<h2>Registration successful</h2>\r\n<p>Hello {{student_name}},</p>\r\n<p>Your registration at <strong>{{institute_name}}</strong> has been completed successfully.</p>\r\n<p><strong>Student ID:</strong> {{student_id}}</p>\r\n<p><strong>Course:</strong> {{course_name}}</p>\r\n<p><strong>Program:</strong> {{program_name}}</p>\r\n<p><strong>Batch:</strong> {{batch_name}}</p>\r\n<p><a href=\"{{login_url}}\">Login to Student Portal</a></p>\r\n<p>For assistance, contact {{support_email}}.</p>\r\n</body>\r\n</html>', 'Hello {{student_name}},\r\n\r\nYour registration at {{institute_name}} has been completed successfully.\r\n\r\nStudent ID: {{student_id}}\r\nCourse: {{course_name}}\r\nProgram: {{program_name}}\r\nBatch: {{batch_name}}\r\n\r\nLogin:\r\n{{login_url}}\r\n\r\nFor assistance, contact {{support_email}}.', '{\"login_url\": \"Student portal login URL\", \"batch_name\": \"Batch name\", \"student_id\": \"Student identifier\", \"course_name\": \"Course name\", \"program_name\": \"Program name\", \"student_name\": \"Student name\", \"support_email\": \"Support email address\", \"institute_name\": \"Institute name\"}', 'ACTIVE', 1, NULL, NULL, '2026-09-02 12:18:55', '2026-09-02 12:18:55', NULL),
(7, 1, 'PARENT_ACCOUNT_CREATED', 'Parent Account Created', 'Sent when a parent or guardian account is created and linked to a student.', 'ONBOARDING', 'Your parent account has been created', '<!DOCTYPE html>\r\n<html>\r\n<head><meta charset=\"UTF-8\"></head>\r\n<body>\r\n<h2>Parent account created</h2>\r\n<p>Hello {{parent_name}},</p>\r\n<p>Your parent account for <strong>{{institute_name}}</strong> has been created successfully.</p>\r\n<p><strong>Student:</strong> {{student_name}}</p>\r\n<p><strong>Username:</strong> {{username}}</p>\r\n<p><strong>Temporary Password:</strong> {{temporary_password}}</p>\r\n<p><a href=\"{{login_url}}\">Login to Parent Portal</a></p>\r\n<p>Please change your temporary password after your first login.</p>\r\n</body>\r\n</html>', 'Hello {{parent_name}},\r\n\r\nYour parent account for {{institute_name}} has been created successfully.\r\n\r\nStudent: {{student_name}}\r\n\r\nUsername: {{username}}\r\nTemporary Password: {{temporary_password}}\r\n\r\nLogin:\r\n{{login_url}}\r\n\r\nPlease change your temporary password after your first login.', '{\"username\": \"Parent login identifier\", \"login_url\": \"Parent portal login URL\", \"parent_name\": \"Parent or guardian name\", \"student_name\": \"Linked student name\", \"institute_name\": \"Institute name\", \"temporary_password\": \"Temporary first-login password\"}', 'ACTIVE', 1, NULL, NULL, '2026-09-02 12:18:55', '2026-09-02 12:18:55', NULL),
(8, 1, 'STAFF_ACCOUNT_CREATED', 'Staff Account Created', 'Sent when a staff member is created and provided with platform access.', 'ONBOARDING', 'Your {{institute_name}} staff account has been created', '<!DOCTYPE html>\r\n<html>\r\n<head><meta charset=\"UTF-8\"></head>\r\n<body>\r\n<h2>Staff account created</h2>\r\n<p>Hello {{staff_name}},</p>\r\n<p>Your staff account for <strong>{{institute_name}}</strong> has been created successfully.</p>\r\n<p><strong>Username:</strong> {{username}}</p>\r\n<p><strong>Temporary Password:</strong> {{temporary_password}}</p>\r\n<p><a href=\"{{login_url}}\">Login to Staff Portal</a></p>\r\n<p>Please change your temporary password after your first login.</p>\r\n</body>\r\n</html>', 'Hello {{staff_name}},\r\n\r\nYour staff account for {{institute_name}} has been created successfully.\r\n\r\nUsername: {{username}}\r\nTemporary Password: {{temporary_password}}\r\n\r\nLogin:\r\n{{login_url}}\r\n\r\nPlease change your temporary password after your first login.', '{\"username\": \"Staff login identifier\", \"login_url\": \"Staff portal login URL\", \"staff_name\": \"Staff member name\", \"institute_name\": \"Institute name\", \"temporary_password\": \"Temporary first-login password\"}', 'ACTIVE', 1, NULL, NULL, '2026-09-02 12:18:55', '2026-09-02 12:18:55', NULL),
(9, 1, 'TEACHER_ACCOUNT_CREATED', 'Teacher Account Created', 'Sent when a teacher account is created and platform access is provided.', 'ONBOARDING', 'Your teacher account for {{institute_name}} has been created', '<!DOCTYPE html>\r\n<html>\r\n<head><meta charset=\"UTF-8\"></head>\r\n<body>\r\n<h2>Teacher account created</h2>\r\n<p>Hello {{teacher_name}},</p>\r\n<p>Your teacher account for <strong>{{institute_name}}</strong> has been created successfully.</p>\r\n<p><strong>Username:</strong> {{username}}</p>\r\n<p><strong>Temporary Password:</strong> {{temporary_password}}</p>\r\n<p><a href=\"{{login_url}}\">Login to Teacher Portal</a></p>\r\n<p>Please change your temporary password after your first login.</p>\r\n</body>\r\n</html>', 'Hello {{teacher_name}},\r\n\r\nYour teacher account for {{institute_name}} has been created successfully.\r\n\r\nUsername: {{username}}\r\nTemporary Password: {{temporary_password}}\r\n\r\nLogin:\r\n{{login_url}}\r\n\r\nPlease change your temporary password after your first login.', '{\"username\": \"Teacher login identifier\", \"login_url\": \"Teacher portal login URL\", \"teacher_name\": \"Teacher name\", \"institute_name\": \"Institute name\", \"temporary_password\": \"Temporary first-login password\"}', 'ACTIVE', 1, NULL, NULL, '2026-09-02 12:18:55', '2026-09-02 12:18:55', NULL),
(10, 1, 'TENANT_CREATED', 'Institute Account Created', 'Sent when a new institute tenant is created on the SaaS platform.', 'TENANT', 'Your {{platform_name}} institute account has been created', '<!DOCTYPE html>\r\n<html>\r\n<head><meta charset=\"UTF-8\"></head>\r\n<body>\r\n<h2>Institute account created</h2>\r\n<p>Hello {{admin_name}},</p>\r\n<p>Your institute account for <strong>{{institute_name}}</strong> has been created on {{platform_name}}.</p>\r\n<p><strong>Tenant ID:</strong> {{tenant_id}}</p>\r\n<p>For assistance, contact {{support_email}}.</p>\r\n</body>\r\n</html>', 'Hello {{admin_name}},\r\n\r\nYour institute account for {{institute_name}} has been created on {{platform_name}}.\r\n\r\nTenant ID: {{tenant_id}}\r\n\r\nFor assistance, contact {{support_email}}.', '{\"tenant_id\": \"Tenant identifier\", \"admin_name\": \"Institute administrator name\", \"platform_name\": \"SaaS platform name\", \"support_email\": \"Platform support email\", \"institute_name\": \"Institute name\"}', 'ACTIVE', 1, NULL, NULL, '2026-09-02 12:18:55', '2026-09-02 12:18:55', NULL),
(11, 1, 'TENANT_ACTIVATED', 'Institute Account Activated', 'Sent when an institute tenant is activated and can begin using the platform.', 'TENANT', 'Your {{institute_name}} account is now active', '<!DOCTYPE html>\r\n<html>\r\n<head><meta charset=\"UTF-8\"></head>\r\n<body>\r\n<h2>Your institute account is active</h2>\r\n<p>Hello {{admin_name}},</p>\r\n<p>Your institute account for <strong>{{institute_name}}</strong> has been activated successfully.</p>\r\n<p><a href=\"{{login_url}}\">Open Institute Admin Panel</a></p>\r\n<p>For assistance, contact {{support_email}}.</p>\r\n</body>\r\n</html>', 'Hello {{admin_name}},\r\n\r\nYour institute account for {{institute_name}} has been activated successfully.\r\n\r\nLogin:\r\n{{login_url}}\r\n\r\nFor assistance, contact {{support_email}}.', '{\"login_url\": \"Institute admin login URL\", \"admin_name\": \"Institute administrator name\", \"support_email\": \"Platform support email\", \"institute_name\": \"Institute name\"}', 'ACTIVE', 1, NULL, NULL, '2026-09-02 12:18:55', '2026-09-02 12:18:55', NULL),
(12, 1, 'TENANT_SUSPENDED', 'Institute Account Suspended', 'Sent when an institute tenant is suspended and access is restricted.', 'TENANT', 'Your {{institute_name}} account has been suspended', '<!DOCTYPE html>\r\n<html>\r\n<head><meta charset=\"UTF-8\"></head>\r\n<body>\r\n<h2>Institute account suspended</h2>\r\n<p>Hello {{admin_name}},</p>\r\n<p>The account for <strong>{{institute_name}}</strong> has been suspended.</p>\r\n<p><strong>Reason:</strong> {{suspension_reason}}</p>\r\n<p>If you need assistance, contact {{support_email}}.</p>\r\n</body>\r\n</html>', 'Hello {{admin_name}},\r\n\r\nThe account for {{institute_name}} has been suspended.\r\n\r\nReason:\r\n{{suspension_reason}}\r\n\r\nIf you need assistance, contact {{support_email}}.', '{\"admin_name\": \"Institute administrator name\", \"support_email\": \"Platform support email\", \"institute_name\": \"Institute name\", \"suspension_reason\": \"Reason for suspension\"}', 'ACTIVE', 1, NULL, NULL, '2026-09-02 12:18:55', '2026-09-02 12:18:55', NULL),
(13, 1, 'TENANT_REACTIVATED', 'Institute Account Reactivated', 'Sent when a previously suspended institute tenant is reactivated.', 'TENANT', 'Your {{institute_name}} account has been reactivated', '<!DOCTYPE html>\r\n<html>\r\n<head><meta charset=\"UTF-8\"></head>\r\n<body>\r\n<h2>Institute account reactivated</h2>\r\n<p>Hello {{admin_name}},</p>\r\n<p>Your institute account for <strong>{{institute_name}}</strong> has been reactivated successfully.</p>\r\n<p><a href=\"{{login_url}}\">Open Institute Admin Panel</a></p>\r\n<p>For assistance, contact {{support_email}}.</p>\r\n</body>\r\n</html>', 'Hello {{admin_name}},\r\n\r\nYour institute account for {{institute_name}} has been reactivated successfully.\r\n\r\nLogin:\r\n{{login_url}}\r\n\r\nFor assistance, contact {{support_email}}.', '{\"login_url\": \"Institute admin login URL\", \"admin_name\": \"Institute administrator name\", \"support_email\": \"Platform support email\", \"institute_name\": \"Institute name\"}', 'ACTIVE', 1, NULL, NULL, '2026-09-02 12:18:55', '2026-09-02 12:18:55', NULL),
(14, 1, 'SUBSCRIPTION_ACTIVATED', 'Subscription Activated', 'Sent when an institute subscription is successfully activated.', 'SUBSCRIPTION', 'Your {{platform_name}} subscription is active', '<!DOCTYPE html>\r\n<html>\r\n<head><meta charset=\"UTF-8\"></head>\r\n<body>\r\n<h2>Subscription activated</h2>\r\n<p>Hello {{admin_name}},</p>\r\n<p>The subscription for <strong>{{institute_name}}</strong> has been activated successfully.</p>\r\n<p><strong>Plan:</strong> {{plan_name}}</p>\r\n<p><strong>Start Date:</strong> {{start_date}}</p>\r\n<p><strong>End Date:</strong> {{end_date}}</p>\r\n<p>For assistance, contact {{support_email}}.</p>\r\n</body>\r\n</html>', 'Hello {{admin_name}},\r\n\r\nThe subscription for {{institute_name}} has been activated successfully.\r\n\r\nPlan: {{plan_name}}\r\nStart Date: {{start_date}}\r\nEnd Date: {{end_date}}\r\n\r\nFor assistance, contact {{support_email}}.', '{\"end_date\": \"Subscription end date\", \"plan_name\": \"Subscription plan name\", \"admin_name\": \"Institute administrator name\", \"start_date\": \"Subscription start date\", \"platform_name\": \"SaaS platform name\", \"support_email\": \"Platform support email\", \"institute_name\": \"Institute name\"}', 'ACTIVE', 1, NULL, NULL, '2026-09-02 12:18:55', '2026-09-02 12:18:55', NULL),
(15, 1, 'SUBSCRIPTION_EXPIRING', 'Subscription Expiring', 'Sent when an institute subscription is approaching its expiry date.', 'SUBSCRIPTION', 'Your {{platform_name}} subscription expires on {{expiry_date}}', '<!DOCTYPE html>\r\n<html>\r\n<head><meta charset=\"UTF-8\"></head>\r\n<body>\r\n<h2>Your subscription is expiring soon</h2>\r\n<p>Hello {{admin_name}},</p>\r\n<p>The subscription for <strong>{{institute_name}}</strong> is scheduled to expire on <strong>{{expiry_date}}</strong>.</p>\r\n<p><strong>Current Plan:</strong> {{plan_name}}</p>\r\n<p>Please contact {{support_email}} for renewal assistance.</p>\r\n</body>\r\n</html>', 'Hello {{admin_name}},\r\n\r\nThe subscription for {{institute_name}} is scheduled to expire on {{expiry_date}}.\r\n\r\nCurrent Plan: {{plan_name}}\r\n\r\nPlease contact {{support_email}} for renewal assistance.', '{\"plan_name\": \"Current subscription plan\", \"admin_name\": \"Institute administrator name\", \"expiry_date\": \"Subscription expiry date\", \"platform_name\": \"SaaS platform name\", \"support_email\": \"Platform support email\", \"institute_name\": \"Institute name\"}', 'ACTIVE', 1, NULL, NULL, '2026-09-02 12:18:55', '2026-09-02 12:18:55', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `enquiries`
--

DROP TABLE IF EXISTS `enquiries`;
CREATE TABLE IF NOT EXISTS `enquiries` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL,
  `preferred_branch_id` int NOT NULL,
  `assigned_branch_id` int NOT NULL,
  `source` tinyint NOT NULL DEFAULT '0' COMMENT '0=walk_in,1=phone,2=website,3=social_media,4=whatsapp,5=referral,6=campaign,7=google_ads,8=other',
  `student_name` varchar(255) NOT NULL,
  `student_mobile` varchar(20) NOT NULL,
  `student_email` varchar(255) DEFAULT NULL,
  `parent_name` varchar(255) DEFAULT NULL,
  `parent_mobile` varchar(20) DEFAULT NULL,
  `parent_email` varchar(255) DEFAULT NULL,
  `interested_course_id` int DEFAULT NULL,
  `interested_program_id` int DEFAULT NULL,
  `package_type` tinyint DEFAULT NULL COMMENT '1: Program Wise, 2: Bundle Wise, 3: Subject Wise',
  `package_details` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin COMMENT 'JSON storing program_id, bundle_id, or array of subject_ids',
  `interested_academic_year_id` int DEFAULT NULL,
  `interested_level_id` int DEFAULT NULL COMMENT 'Interested Level ID',
  `counsellor_id` int DEFAULT NULL,
  `status` tinyint NOT NULL DEFAULT '0' COMMENT '0=new,1=assigned,2=contacted,3=follow_up,4=interested,5=demo_scheduled,6=fee_discussion,7=converted,-1=lost,-2=cancelled',
  `lost_reason` text,
  `demo_scheduled_at` datetime DEFAULT NULL,
  `next_followup_at` datetime DEFAULT NULL,
  `admission_confirmed_at` datetime DEFAULT NULL,
  `converted_student_id` int DEFAULT NULL,
  `converted_at` datetime DEFAULT NULL,
  `remarks` text,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` datetime DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  `actual_price` decimal(12,2) DEFAULT NULL,
  `concession_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `final_price` decimal(12,2) DEFAULT NULL,
  `down_payment` decimal(12,2) NOT NULL DEFAULT '0.00',
  `installment_months` int NOT NULL DEFAULT '1',
  `installment_amount` decimal(12,2) GENERATED ALWAYS AS (((`final_price` - `down_payment`) / `installment_months`)) STORED,
  `counselling_notes` text,
  `lost_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `preferred_branch_id` (`preferred_branch_id`),
  KEY `assigned_branch_id` (`assigned_branch_id`),
  KEY `interested_course_id` (`interested_course_id`),
  KEY `interested_program_id` (`interested_program_id`),
  KEY `idx_enquiries_branch` (`tenant_id`,`assigned_branch_id`),
  KEY `idx_enquiries_status` (`tenant_id`,`status`),
  KEY `idx_enquiries_counsellor` (`counsellor_id`),
  KEY `fk_enquiries_student` (`converted_student_id`),
  KEY `fk_enquiries_academic_year` (`interested_academic_year_id`),
  KEY `fk_enquiries_interested_level` (`interested_level_id`)
) ENGINE=InnoDB AUTO_INCREMENT=33 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `enquiries`
--

INSERT INTO `enquiries` (`id`, `tenant_id`, `preferred_branch_id`, `assigned_branch_id`, `source`, `student_name`, `student_mobile`, `student_email`, `parent_name`, `parent_mobile`, `parent_email`, `interested_course_id`, `interested_program_id`, `package_type`, `package_details`, `interested_academic_year_id`, `interested_level_id`, `counsellor_id`, `status`, `lost_reason`, `demo_scheduled_at`, `next_followup_at`, `admission_confirmed_at`, `converted_student_id`, `converted_at`, `remarks`, `created_at`, `updated_at`, `deleted_at`, `created_by`, `updated_by`, `actual_price`, `concession_amount`, `final_price`, `down_payment`, `installment_months`, `counselling_notes`, `lost_at`) VALUES
(11, 2, 1, 1, 0, 'Aarav Sharma', '9820123401', 'aarav.sharma@gmail.com', 'Rajesh Sharma', '9820123402', 'rajesh.sharma@gmail.com', 1, 1, 1, '{\"program_id\": 1}', 2, 1, 601, 4, NULL, NULL, '2026-09-20 11:00:00', NULL, NULL, NULL, 'Father visited branch office personally.', '2026-09-10 10:30:00', '2026-09-10 10:30:00', NULL, 601, 601, 150000.00, 10000.00, 140000.00, 30000.00, 10, 'Student scored 94% in 10th ICSE board. Interested in JEE Advanced 2-Year Classroom Batch with morning schedule.', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `enquiry_followups`
--

DROP TABLE IF EXISTS `enquiry_followups`;
CREATE TABLE IF NOT EXISTS `enquiry_followups` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL,
  `enquiry_id` int NOT NULL,
  `next_followup_date` datetime DEFAULT NULL,
  `notes` text,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_by` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `tenant_id` (`tenant_id`),
  KEY `enquiry_id` (`enquiry_id`),
  KEY `created_by` (`created_by`)
) ENGINE=InnoDB AUTO_INCREMENT=23 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `enquiry_followups`
--

INSERT INTO `enquiry_followups` (`id`, `tenant_id`, `enquiry_id`, `next_followup_date`, `notes`, `created_at`, `created_by`) VALUES
(3, 2, 11, '2026-09-14 11:00:00', 'Conducted detailed 20-minute counseling call with parent. Explained JEE Advanced syllabus roadmap and batch timings.', '2026-09-11 11:00:00', 601);

-- --------------------------------------------------------

--
-- Table structure for table `exams`
--

DROP TABLE IF EXISTS `exams`;
CREATE TABLE IF NOT EXISTS `exams` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL,
  `branch_id` int NOT NULL,
  `academic_year_id` int NOT NULL,
  `subject_id` int NOT NULL,
  `name` varchar(255) NOT NULL,
  `description` text,
  `files` json DEFAULT NULL,
  `metadata` json DEFAULT NULL,
  `exam_type` varchar(50) NOT NULL,
  `max_marks` decimal(6,2) NOT NULL,
  `passing_marks` decimal(6,2) DEFAULT NULL,
  `exam_date` date NOT NULL,
  `start_time` time DEFAULT NULL,
  `end_time` time DEFAULT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'scheduled',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` datetime DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `tenant_id` (`tenant_id`),
  KEY `branch_id` (`branch_id`),
  KEY `academic_year_id` (`academic_year_id`),
  KEY `subject_id` (`subject_id`)
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `exams`
--

INSERT INTO `exams` (`id`, `tenant_id`, `branch_id`, `academic_year_id`, `subject_id`, `name`, `description`, `files`, `metadata`, `exam_type`, `max_marks`, `passing_marks`, `exam_date`, `start_time`, `end_time`, `status`, `created_at`, `updated_at`, `deleted_at`, `created_by`, `updated_by`) VALUES
(5, 2, 1, 2, 1, 'Physics – Optics & Wave Motion Term Assessment Exam', 'Comprehensive assessment on Ray Optics, Wave Optics, Diffraction, and Interference.', '\"[]\"', '{}', 'Unit Test', 100.00, 40.00, '2026-10-28', NULL, NULL, 'scheduled', '2026-09-08 18:39:01', '2026-09-10 15:03:12', NULL, 1, 1);

-- --------------------------------------------------------

--
-- Table structure for table `exam_batch_assignments`
--

DROP TABLE IF EXISTS `exam_batch_assignments`;
CREATE TABLE IF NOT EXISTS `exam_batch_assignments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL,
  `exam_id` int NOT NULL,
  `batch_id` int NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `exam_id` (`exam_id`,`batch_id`),
  KEY `tenant_id` (`tenant_id`),
  KEY `batch_id` (`batch_id`)
) ENGINE=InnoDB AUTO_INCREMENT=19 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `exam_batch_assignments`
--

INSERT INTO `exam_batch_assignments` (`id`, `tenant_id`, `exam_id`, `batch_id`, `created_at`) VALUES
(8, 2, 5, 1, '2026-10-01 13:40:23');

-- --------------------------------------------------------

--
-- Table structure for table `exam_marks`
--

DROP TABLE IF EXISTS `exam_marks`;
CREATE TABLE IF NOT EXISTS `exam_marks` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL,
  `exam_id` int NOT NULL,
  `enrollment_id` int NOT NULL,
  `student_id` int DEFAULT NULL,
  `marks_obtained` decimal(6,2) DEFAULT NULL,
  `is_absent` tinyint(1) NOT NULL DEFAULT '0',
  `grade` varchar(10) DEFAULT NULL,
  `remarks` text,
  `status` varchar(20) DEFAULT 'graded',
  `is_result_visible` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` datetime DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `exam_id` (`exam_id`,`enrollment_id`),
  KEY `tenant_id` (`tenant_id`),
  KEY `enrollment_id` (`enrollment_id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `exam_marks`
--

INSERT INTO `exam_marks` (`id`, `tenant_id`, `exam_id`, `enrollment_id`, `student_id`, `marks_obtained`, `is_absent`, `grade`, `remarks`, `status`, `is_result_visible`, `created_at`, `updated_at`, `deleted_at`, `created_by`, `updated_by`) VALUES
(4, 2, 5, 3, 3, 86.50, 0, 'A', 'Excellent understanding of Wave Optics and Ray diagrams.', 'graded', 1, '2026-10-05 13:23:47', '2026-10-05 13:23:47', NULL, 1, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `exam_result_publish_logs`
--

DROP TABLE IF EXISTS `exam_result_publish_logs`;
CREATE TABLE IF NOT EXISTS `exam_result_publish_logs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL,
  `exam_id` int NOT NULL,
  `action` varchar(20) NOT NULL,
  `published_by` int DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `tenant_id` (`tenant_id`),
  KEY `exam_id` (`exam_id`),
  KEY `published_by` (`published_by`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `fee_heads`
--

DROP TABLE IF EXISTS `fee_heads`;
CREATE TABLE IF NOT EXISTS `fee_heads` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL,
  `name` varchar(100) NOT NULL,
  `type` varchar(50) NOT NULL,
  `is_refundable` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` datetime DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `tenant_id` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `fee_plans`
--

DROP TABLE IF EXISTS `fee_plans`;
CREATE TABLE IF NOT EXISTS `fee_plans` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL,
  `branch_id` int NOT NULL,
  `academic_year_id` int NOT NULL,
  `level_id` int DEFAULT NULL,
  `name` varchar(255) NOT NULL,
  `total_amount` decimal(10,2) NOT NULL,
  `down_payment` decimal(10,2) DEFAULT NULL,
  `months` int DEFAULT NULL,
  `installment_amount` decimal(10,2) DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` datetime DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `tenant_id` (`tenant_id`),
  KEY `branch_id` (`branch_id`),
  KEY `academic_year_id` (`academic_year_id`),
  KEY `level_id` (`level_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `fee_plan_installments`
--

DROP TABLE IF EXISTS `fee_plan_installments`;
CREATE TABLE IF NOT EXISTS `fee_plan_installments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL,
  `fee_plan_id` int NOT NULL,
  `installment_number` int NOT NULL,
  `percentage` decimal(5,2) NOT NULL,
  `due_days_from_start` int NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `tenant_id` (`tenant_id`),
  KEY `fee_plan_id` (`fee_plan_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `fee_plan_items`
--

DROP TABLE IF EXISTS `fee_plan_items`;
CREATE TABLE IF NOT EXISTS `fee_plan_items` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL,
  `fee_plan_id` int NOT NULL,
  `fee_head_id` int NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `tenant_id` (`tenant_id`),
  KEY `fee_plan_id` (`fee_plan_id`),
  KEY `fee_head_id` (`fee_head_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `guardians`
--

DROP TABLE IF EXISTS `guardians`;
CREATE TABLE IF NOT EXISTS `guardians` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL,
  `user_id` int DEFAULT NULL,
  `full_name` varchar(255) NOT NULL,
  `relation` varchar(50) NOT NULL,
  `mobile` varchar(20) NOT NULL,
  `email` varchar(255) DEFAULT NULL,
  `occupation` varchar(100) DEFAULT NULL,
  `profile_photo_url` varchar(500) DEFAULT NULL,
  `address` text,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` datetime DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `tenant_id` (`tenant_id`),
  KEY `user_id` (`user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=179 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `guardians`
--

INSERT INTO `guardians` (`id`, `tenant_id`, `user_id`, `full_name`, `relation`, `mobile`, `email`, `occupation`, `profile_photo_url`, `address`, `created_at`, `updated_at`, `deleted_at`, `created_by`, `updated_by`) VALUES
(3, 2, 229, 'Milind Deshpande', 'Father', '9988770011', 'parent.9988770011@parent.vidyasetu.com', 'Senior Software Engineer', NULL, 'Flat 402, Sunshine Heights, Pune', '2026-09-07 12:59:23', '2026-10-05 15:05:20', NULL, 2, 2);

-- --------------------------------------------------------

--
-- Table structure for table `holidays`
--

DROP TABLE IF EXISTS `holidays`;
CREATE TABLE IF NOT EXISTS `holidays` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL,
  `branch_id` int NOT NULL,
  `name` varchar(100) NOT NULL,
  `holiday_date` date NOT NULL,
  `description` text,
  `is_recurring_yearly` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` datetime DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `branch_id` (`branch_id`,`holiday_date`),
  KEY `tenant_id` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `homeworks`
--

DROP TABLE IF EXISTS `homeworks`;
CREATE TABLE IF NOT EXISTS `homeworks` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL,
  `branch_id` int NOT NULL,
  `academic_year_id` int NOT NULL,
  `subject_id` int NOT NULL,
  `title` varchar(255) NOT NULL,
  `description` text,
  `assignment_type` enum('assignment','homework','exam') NOT NULL DEFAULT 'assignment',
  `batch_ids` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `files` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin,
  `due_date` datetime NOT NULL,
  `max_marks` decimal(5,2) DEFAULT NULL,
  `status` tinyint NOT NULL DEFAULT '0' COMMENT '0=draft, 1=published, 2=closed',
  `published_at` datetime DEFAULT NULL,
  `closed_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` datetime DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `branch_id` (`branch_id`),
  KEY `academic_year_id` (`academic_year_id`),
  KEY `subject_id` (`subject_id`),
  KEY `idx_homeworks_tenant` (`tenant_id`),
  KEY `idx_homeworks_branch` (`tenant_id`,`branch_id`),
  KEY `idx_homeworks_subject` (`tenant_id`,`subject_id`),
  KEY `idx_homeworks_status` (`tenant_id`,`status`)
) ENGINE=InnoDB AUTO_INCREMENT=48 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `homeworks`
--

INSERT INTO `homeworks` (`id`, `tenant_id`, `branch_id`, `academic_year_id`, `subject_id`, `title`, `description`, `assignment_type`, `batch_ids`, `files`, `due_date`, `max_marks`, `status`, `published_at`, `closed_at`, `created_at`, `updated_at`, `deleted_at`, `created_by`, `updated_by`) VALUES
(37, 2, 1, 2, 1, 'Physics – Electrostatics Daily Practice Homework', 'Complete numerical problems 1 to 12 on Coulomb\'s law and electric field intensity from DPP sheet 4.', 'homework', '[1, 8]', '[]', '2026-10-15 23:59:59', 20.00, 1, '2026-09-08 18:39:01', NULL, '2026-09-08 18:39:01', '2026-09-10 15:03:12', NULL, 1, 1);

-- --------------------------------------------------------

--
-- Table structure for table `homework_submissions`
--

DROP TABLE IF EXISTS `homework_submissions`;
CREATE TABLE IF NOT EXISTS `homework_submissions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL,
  `homework_id` int NOT NULL,
  `student_id` int NOT NULL,
  `response_text` text,
  `files` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin,
  `status` varchar(20) NOT NULL DEFAULT 'submitted',
  `marks_obtained` decimal(5,2) DEFAULT NULL,
  `teacher_feedback` text,
  `submitted_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `graded_by` int DEFAULT NULL,
  `graded_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `homework_id` (`homework_id`,`student_id`),
  KEY `student_id` (`student_id`),
  KEY `graded_by` (`graded_by`),
  KEY `idx_hw_submissions_tenant` (`tenant_id`),
  KEY `idx_hw_submissions_homework` (`homework_id`),
  KEY `idx_hw_submissions_student` (`tenant_id`,`student_id`),
  KEY `idx_hw_submissions_status` (`homework_id`,`status`)
) ENGINE=InnoDB AUTO_INCREMENT=263 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `homework_submissions`
--

INSERT INTO `homework_submissions` (`id`, `tenant_id`, `homework_id`, `student_id`, `response_text`, `files`, `status`, `marks_obtained`, `teacher_feedback`, `submitted_at`, `graded_by`, `graded_at`, `created_at`, `updated_at`, `deleted_at`) VALUES
(226, 2, 37, 3, 'Solved problems 1 through 12 on Coulomb\'s Law and electric field with diagrams.', '[]', 'submitted', 17.70, 'Well answered. Clear presentation and accurate calculation.', '2026-10-05 13:16:24', 1, '2026-09-21 11:04:36', '2026-09-22 11:04:36', '2026-10-05 13:16:24', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `income_expense_heads`
--

DROP TABLE IF EXISTS `income_expense_heads`;
CREATE TABLE IF NOT EXISTS `income_expense_heads` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL,
  `name` varchar(100) NOT NULL,
  `type` varchar(20) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` datetime DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `tenant_id` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `income_expense_ledger`
--

DROP TABLE IF EXISTS `income_expense_ledger`;
CREATE TABLE IF NOT EXISTS `income_expense_ledger` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL,
  `branch_id` int NOT NULL,
  `head_id` int NOT NULL,
  `amount` decimal(12,2) NOT NULL,
  `transaction_date` date NOT NULL,
  `type` varchar(20) NOT NULL,
  `payment_mode` varchar(50) NOT NULL,
  `reference_number` varchar(100) DEFAULT NULL,
  `description` text,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `created_by` int DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `tenant_id` (`tenant_id`),
  KEY `branch_id` (`branch_id`),
  KEY `head_id` (`head_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `leave_requests`
--

DROP TABLE IF EXISTS `leave_requests`;
CREATE TABLE IF NOT EXISTS `leave_requests` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL,
  `branch_id` int NOT NULL,
  `staff_id` int NOT NULL,
  `start_date` date NOT NULL,
  `end_date` date NOT NULL,
  `leave_type` varchar(50) NOT NULL,
  `reason` text NOT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'pending',
  `approved_by` int DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` datetime DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `tenant_id` (`tenant_id`),
  KEY `branch_id` (`branch_id`),
  KEY `staff_id` (`staff_id`),
  KEY `approved_by` (`approved_by`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `lectures`
--

DROP TABLE IF EXISTS `lectures`;
CREATE TABLE IF NOT EXISTS `lectures` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL,
  `branch_id` int NOT NULL,
  `academic_year_id` int NOT NULL,
  `batch_id` int NOT NULL,
  `is_default` tinyint(1) NOT NULL DEFAULT '0' COMMENT '1 = Master Default Template Slot, 0 = Concrete Calendar Lecture',
  `parent_template_id` int DEFAULT NULL COMMENT 'References lectures(id) of default template',
  `day_of_week` tinyint DEFAULT NULL COMMENT '1=Mon .. 7=Sun',
  `subject_id` int NOT NULL,
  `teacher_user_id` int NOT NULL,
  `classroom_id` int DEFAULT NULL,
  `recurring_rule_id` int DEFAULT NULL,
  `lecture_date` date DEFAULT NULL,
  `start_time` time NOT NULL,
  `end_time` time NOT NULL,
  `topic` text,
  `lecture_type` varchar(50) DEFAULT 'Regular',
  `activity_type` varchar(50) DEFAULT 'Lecture',
  `slot_label` varchar(100) DEFAULT NULL COMMENT 'e.g. Period 1, Slot A',
  `status` varchar(20) NOT NULL DEFAULT 'scheduled',
  `is_modified_from_default` tinyint(1) NOT NULL DEFAULT '0',
  `cancellation_reason` text,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` datetime DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  `attendance_taken` tinyint(1) NOT NULL DEFAULT '0' COMMENT '1 = attendance taken, 0 = not taken',
  `attendance_submitted_at` datetime DEFAULT NULL,
  `attendance_submitted_by` int DEFAULT NULL,
  `attendance_locked_at` datetime DEFAULT NULL,
  `attendance_locked_by` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `tenant_id` (`tenant_id`),
  KEY `branch_id` (`branch_id`),
  KEY `academic_year_id` (`academic_year_id`),
  KEY `subject_id` (`subject_id`),
  KEY `classroom_id` (`classroom_id`),
  KEY `recurring_rule_id` (`recurring_rule_id`),
  KEY `idx_lectures_batch_date` (`batch_id`,`lecture_date`),
  KEY `idx_lectures_teacher_date` (`teacher_user_id`,`lecture_date`),
  KEY `idx_lec_tenant_default` (`tenant_id`,`is_default`),
  KEY `idx_lec_batch_default_day` (`batch_id`,`is_default`,`day_of_week`),
  KEY `idx_lec_batch_actual_date` (`batch_id`,`is_default`,`lecture_date`),
  KEY `idx_lec_teacher_actual_date` (`teacher_user_id`,`is_default`,`lecture_date`),
  KEY `idx_lec_classroom_actual_date` (`classroom_id`,`is_default`,`lecture_date`),
  KEY `idx_lec_parent_ref` (`parent_template_id`)
) ENGINE=InnoDB AUTO_INCREMENT=1628 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `lectures`
--

INSERT INTO `lectures` (`id`, `tenant_id`, `branch_id`, `academic_year_id`, `batch_id`, `is_default`, `parent_template_id`, `day_of_week`, `subject_id`, `teacher_user_id`, `classroom_id`, `recurring_rule_id`, `lecture_date`, `start_time`, `end_time`, `topic`, `lecture_type`, `activity_type`, `slot_label`, `status`, `is_modified_from_default`, `cancellation_reason`, `is_active`, `created_at`, `updated_at`, `deleted_at`, `created_by`, `updated_by`, `attendance_taken`, `attendance_submitted_at`, `attendance_submitted_by`, `attendance_locked_at`, `attendance_locked_by`) VALUES
(257, 2, 1, 2, 1, 1, NULL, 1, 1, 215, 1, NULL, NULL, '07:00:00', '08:25:00', NULL, 'Regular', 'Lecture', 'Slot 1', 'scheduled', 0, NULL, 1, '2026-09-17 13:56:27', '2026-09-17 13:56:27', NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `lecture_cancellations`
--

DROP TABLE IF EXISTS `lecture_cancellations`;
CREATE TABLE IF NOT EXISTS `lecture_cancellations` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL,
  `lecture_id` int NOT NULL,
  `reason` text NOT NULL,
  `cancelled_by` int DEFAULT NULL,
  `compensatory_lecture_id` int DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `tenant_id` (`tenant_id`),
  KEY `lecture_id` (`lecture_id`),
  KEY `cancelled_by` (`cancelled_by`),
  KEY `compensatory_lecture_id` (`compensatory_lecture_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `lecture_requests`
--

DROP TABLE IF EXISTS `lecture_requests`;
CREATE TABLE IF NOT EXISTS `lecture_requests` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL,
  `branch_id` int NOT NULL,
  `requester_id` int NOT NULL,
  `lecture_id` int DEFAULT NULL,
  `batch_id` int NOT NULL,
  `subject_id` int NOT NULL,
  `request_type` enum('RESCHEDULE','ROOM_CHANGE','TEACHER_CHANGE','CANCEL','NEW_LECTURE') NOT NULL,
  `current_date` date DEFAULT NULL,
  `current_start_time` time DEFAULT NULL,
  `current_end_time` time DEFAULT NULL,
  `current_classroom_id` int DEFAULT NULL,
  `current_teacher_user_id` int DEFAULT NULL,
  `requested_date` date DEFAULT NULL,
  `requested_start_time` time DEFAULT NULL,
  `requested_end_time` time DEFAULT NULL,
  `requested_classroom_id` int DEFAULT NULL,
  `requested_teacher_user_id` int DEFAULT NULL,
  `reason` text,
  `status` enum('pending','approved','rejected','cancelled','applied') DEFAULT 'pending',
  `decided_by` int DEFAULT NULL,
  `decision_note` text,
  `decided_at` datetime DEFAULT NULL,
  `applied_by` int DEFAULT NULL,
  `applied_at` datetime DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `batch_id` (`batch_id`),
  KEY `subject_id` (`subject_id`),
  KEY `current_classroom_id` (`current_classroom_id`),
  KEY `current_teacher_user_id` (`current_teacher_user_id`),
  KEY `requested_classroom_id` (`requested_classroom_id`),
  KEY `requested_teacher_user_id` (`requested_teacher_user_id`),
  KEY `decided_by` (`decided_by`),
  KEY `applied_by` (`applied_by`),
  KEY `idx_tenant_branch` (`tenant_id`,`branch_id`),
  KEY `idx_branch_status` (`branch_id`,`status`),
  KEY `idx_requester` (`requester_id`),
  KEY `idx_lecture` (`lecture_id`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `levels`
--

DROP TABLE IF EXISTS `levels`;
CREATE TABLE IF NOT EXISTS `levels` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL,
  `course_id` int NOT NULL,
  `program_id` int NOT NULL,
  `name` varchar(255) NOT NULL,
  `code` varchar(50) DEFAULT NULL,
  `duration` varchar(50) DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` datetime DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `program_id` (`program_id`,`code`),
  KEY `tenant_id` (`tenant_id`),
  KEY `course_id` (`course_id`)
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `levels`
--

INSERT INTO `levels` (`id`, `tenant_id`, `course_id`, `program_id`, `name`, `code`, `duration`, `is_active`, `created_at`, `updated_at`, `deleted_at`, `created_by`, `updated_by`) VALUES
(1, 2, 1, 1, 'Class XI', 'LVL-001', '1 Year', 1, '2026-09-02 12:18:55', '2026-09-02 12:18:55', NULL, 2, 2);

-- --------------------------------------------------------

--
-- Table structure for table `level_subjects`
--

DROP TABLE IF EXISTS `level_subjects`;
CREATE TABLE IF NOT EXISTS `level_subjects` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL,
  `level_id` int NOT NULL,
  `subject_id` int NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `level_id` (`level_id`,`subject_id`),
  KEY `tenant_id` (`tenant_id`),
  KEY `subject_id` (`subject_id`)
) ENGINE=InnoDB AUTO_INCREMENT=74 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `level_subjects`
--

INSERT INTO `level_subjects` (`id`, `tenant_id`, `level_id`, `subject_id`, `created_at`) VALUES
(1, 2, 1, 1, '2026-09-02 12:18:55');

-- --------------------------------------------------------

--
-- Table structure for table `module_registry`
--

DROP TABLE IF EXISTS `module_registry`;
CREATE TABLE IF NOT EXISTS `module_registry` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `code` varchar(50) NOT NULL,
  `description` text,
  `version` varchar(50) DEFAULT NULL,
  `category` varchar(100) DEFAULT NULL,
  `default_state` enum('enabled','beta','deprecated','coming_soon','hidden') NOT NULL DEFAULT 'enabled',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` datetime DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `code` (`code`)
) ENGINE=InnoDB AUTO_INCREMENT=66 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `module_registry`
--

INSERT INTO `module_registry` (`id`, `name`, `code`, `description`, `version`, `category`, `default_state`, `created_at`, `updated_at`, `deleted_at`, `created_by`, `updated_by`) VALUES
(1, 'Core ERP', 'core_erp', 'Essential ERP features including admissions and student roster.', '1.0.0', 'Core ERP', 'enabled', '2026-09-02 12:18:55', '2026-09-02 12:18:55', NULL, NULL, NULL),
(2, 'Finance Hub', 'finance', 'Fee collection, expense tracking, and ledgers.', '1.0.0', 'Finance', 'enabled', '2026-09-02 12:18:55', '2026-09-02 12:18:55', NULL, NULL, NULL),
(3, 'Academics Management', 'academics', 'Course, subject, batch, and classroom setup.', '1.0.0', 'Academics', 'enabled', '2026-09-02 12:18:55', '2026-09-02 12:18:55', NULL, NULL, NULL),
(4, 'Classroom Operations', 'classroom', 'Attendance, homework, assignments, and exams.', '1.0.0', 'Academics', 'enabled', '2026-09-02 12:18:55', '2026-09-02 12:18:55', NULL, NULL, NULL),
(5, 'Analytics & Reports', 'analytics', 'Performance reports and branch auditing.', '1.0.0', 'Reporting', 'beta', '2026-09-02 12:18:55', '2026-09-02 12:18:55', NULL, NULL, NULL),
(6, 'Communication', 'communication', 'Broadcasts, notifications, and student chats.', '1.0.0', 'Communication', 'enabled', '2026-09-02 12:18:55', '2026-09-02 12:18:55', NULL, NULL, NULL),
(7, 'HR & Payroll', 'hr', 'Staff directory, scopes, and payroll management.', '1.0.0', 'HR', 'coming_soon', '2026-09-02 12:18:55', '2026-09-02 12:18:55', NULL, NULL, NULL),
(8, 'LMS', 'lms', 'Learning Management System integration and online content.', '1.0.0', 'Learning', 'hidden', '2026-09-02 12:18:55', '2026-09-02 12:18:55', NULL, NULL, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `notifications`
--

DROP TABLE IF EXISTS `notifications`;
CREATE TABLE IF NOT EXISTS `notifications` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL,
  `event_type` varchar(100) NOT NULL,
  `title` varchar(255) NOT NULL,
  `body` text NOT NULL,
  `action_url` text,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_by` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `tenant_id` (`tenant_id`),
  KEY `created_by` (`created_by`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `notification_recipients`
--

DROP TABLE IF EXISTS `notification_recipients`;
CREATE TABLE IF NOT EXISTS `notification_recipients` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL,
  `notification_id` int NOT NULL,
  `user_id` int NOT NULL,
  `is_read` tinyint(1) NOT NULL DEFAULT '0',
  `read_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `tenant_id` (`tenant_id`),
  KEY `notification_id` (`notification_id`),
  KEY `user_id` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `notification_templates`
--

DROP TABLE IF EXISTS `notification_templates`;
CREATE TABLE IF NOT EXISTS `notification_templates` (
  `id` int NOT NULL AUTO_INCREMENT,
  `event_type` varchar(100) NOT NULL,
  `channel` varchar(20) NOT NULL,
  `subject_template` varchar(255) DEFAULT NULL,
  `body_template` text NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` datetime DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `event_type` (`event_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `otp_codes`
--

DROP TABLE IF EXISTS `otp_codes`;
CREATE TABLE IF NOT EXISTS `otp_codes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int DEFAULT NULL,
  `mobile` varchar(20) NOT NULL,
  `code_hash` varchar(255) NOT NULL,
  `purpose` varchar(50) NOT NULL,
  `expires_at` datetime NOT NULL,
  `used_at` datetime DEFAULT NULL,
  `attempt_count` int NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  KEY `idx_otp_lookup` (`mobile`,`purpose`,`expires_at`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `otp_codes`
--

INSERT INTO `otp_codes` (`id`, `user_id`, `mobile`, `code_hash`, `purpose`, `expires_at`, `used_at`, `attempt_count`, `created_at`) VALUES
(1, 228, '9988776655', '2e58603a1e70dfebd59d449a4e462069a71964d70df685804705ebc6679c6e76', 'student_password_reset', '2026-10-05 11:48:56', '2026-10-05 11:38:56', 0, '2026-10-05 11:38:56');

-- --------------------------------------------------------

--
-- Table structure for table `overridden_permissions`
--

DROP TABLE IF EXISTS `overridden_permissions`;
CREATE TABLE IF NOT EXISTS `overridden_permissions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `permission_id` int NOT NULL,
  `override_type` enum('grant','revoke') NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `created_by` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_id` (`user_id`,`permission_id`),
  KEY `permission_id` (`permission_id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `password_resets`
--

DROP TABLE IF EXISTS `password_resets`;
CREATE TABLE IF NOT EXISTS `password_resets` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `token_hash` varchar(255) NOT NULL,
  `expires_at` datetime NOT NULL,
  `used_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  KEY `idx_password_reset_token` (`token_hash`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `payment_installment_links`
--

DROP TABLE IF EXISTS `payment_installment_links`;
CREATE TABLE IF NOT EXISTS `payment_installment_links` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL,
  `payment_id` int NOT NULL,
  `installment_id` int NOT NULL,
  `amount_allocated` decimal(10,2) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `tenant_id` (`tenant_id`),
  KEY `payment_id` (`payment_id`),
  KEY `installment_id` (`installment_id`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `payment_installment_links`
--

INSERT INTO `payment_installment_links` (`id`, `tenant_id`, `payment_id`, `installment_id`, `amount_allocated`, `created_at`) VALUES
(6, 2, 5, 1202, 120000.00, '2026-09-23 15:00:28');

-- --------------------------------------------------------

--
-- Table structure for table `payment_transactions`
--

DROP TABLE IF EXISTS `payment_transactions`;
CREATE TABLE IF NOT EXISTS `payment_transactions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL,
  `receipt_id` int NOT NULL,
  `payment_mode` varchar(50) NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `reference_number` varchar(100) DEFAULT NULL,
  `payment_date` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `status` varchar(20) NOT NULL DEFAULT 'success',
  `gateway_response` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_by` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `tenant_id` (`tenant_id`),
  KEY `receipt_id` (`receipt_id`),
  KEY `created_by` (`created_by`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `payment_transactions`
--

INSERT INTO `payment_transactions` (`id`, `tenant_id`, `receipt_id`, `payment_mode`, `amount`, `reference_number`, `payment_date`, `status`, `gateway_response`, `created_at`, `created_by`) VALUES
(5, 2, 5, 'Cash', 120000.00, NULL, '2026-09-23 15:00:28', 'success', NULL, '2026-09-23 15:00:28', 2);

-- --------------------------------------------------------

--
-- Table structure for table `payroll_disbursements`
--

DROP TABLE IF EXISTS `payroll_disbursements`;
CREATE TABLE IF NOT EXISTS `payroll_disbursements` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL,
  `payroll_record_id` int NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `payment_mode` varchar(50) NOT NULL,
  `reference_number` varchar(100) DEFAULT NULL,
  `disbursed_at` datetime NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_by` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `tenant_id` (`tenant_id`),
  KEY `payroll_record_id` (`payroll_record_id`),
  KEY `created_by` (`created_by`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `payroll_periods`
--

DROP TABLE IF EXISTS `payroll_periods`;
CREATE TABLE IF NOT EXISTS `payroll_periods` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL,
  `branch_id` int NOT NULL,
  `month` int NOT NULL,
  `year` int NOT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'draft',
  `processed_at` datetime DEFAULT NULL,
  `processed_by` int DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `branch_id` (`branch_id`,`month`,`year`),
  KEY `tenant_id` (`tenant_id`),
  KEY `processed_by` (`processed_by`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `payroll_records`
--

DROP TABLE IF EXISTS `payroll_records`;
CREATE TABLE IF NOT EXISTS `payroll_records` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL,
  `period_id` int NOT NULL,
  `staff_id` int NOT NULL,
  `gross_salary` decimal(10,2) NOT NULL,
  `total_deductions` decimal(10,2) NOT NULL,
  `net_salary` decimal(10,2) NOT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'generated',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `created_by` int DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `tenant_id` (`tenant_id`),
  KEY `period_id` (`period_id`),
  KEY `staff_id` (`staff_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `permissions`
--

DROP TABLE IF EXISTS `permissions`;
CREATE TABLE IF NOT EXISTS `permissions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `module` varchar(100) NOT NULL,
  `action` varchar(100) NOT NULL,
  `code` varchar(150) NOT NULL,
  `description` text,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` datetime DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `code` (`code`)
) ENGINE=InnoDB AUTO_INCREMENT=663 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `permissions`
--

INSERT INTO `permissions` (`id`, `module`, `action`, `code`, `description`, `created_at`, `updated_at`, `deleted_at`, `created_by`, `updated_by`) VALUES
(1, 'enquiry', 'create', 'enquiry:create', 'Create enquiries', '2026-09-02 12:18:55', '2026-09-02 12:18:55', NULL, NULL, NULL),
(2, 'enquiry', 'read', 'enquiry:read', 'View enquiries', '2026-09-02 12:18:55', '2026-09-02 12:18:55', NULL, NULL, NULL),
(3, 'attendance', 'lock', 'attendance:lock', 'Lock attendance', '2026-09-02 12:18:55', '2026-09-02 12:18:55', NULL, NULL, NULL),
(4, 'fees', 'collect', 'fees:collect', 'Collect fees', '2026-09-02 12:18:55', '2026-09-02 12:18:55', NULL, NULL, NULL),
(5, 'tenant', 'view', 'tenant.view', 'List and view all tenant records', '2026-09-02 12:18:55', '2026-09-02 12:18:55', NULL, NULL, NULL),
(6, 'tenant', 'create', 'tenant.create', 'Onboard new tenant', '2026-09-02 12:18:55', '2026-09-02 12:18:55', NULL, NULL, NULL),
(7, 'tenant', 'update', 'tenant.update', 'Edit tenant profile/settings', '2026-09-02 12:18:55', '2026-09-02 12:18:55', NULL, NULL, NULL),
(8, 'tenant', 'activate', 'tenant.activate', 'Activate a draft/suspended tenant', '2026-09-02 12:18:55', '2026-09-02 12:18:55', NULL, NULL, NULL),
(9, 'tenant', 'suspend', 'tenant.suspend', 'Suspend a tenant access', '2026-09-02 12:18:55', '2026-09-02 12:18:55', NULL, NULL, NULL),
(10, 'tenant', 'delete', 'tenant.delete', 'Soft-delete a tenant', '2026-09-02 12:18:55', '2026-09-02 12:18:55', NULL, NULL, NULL),
(11, 'plan', 'view', 'plan.view', 'View subscription plans', '2026-09-02 12:18:55', '2026-09-02 12:18:55', NULL, NULL, NULL),
(12, 'plan', 'create', 'plan.create', 'Create a new subscription plan', '2026-09-02 12:18:55', '2026-09-02 12:18:55', NULL, NULL, NULL),
(13, 'plan', 'update', 'plan.update', 'Modify plan details/pricing', '2026-09-02 12:18:55', '2026-09-02 12:18:55', NULL, NULL, NULL),
(14, 'plan', 'delete', 'plan.delete', 'Deactivate a plan', '2026-09-02 12:18:55', '2026-09-02 12:18:55', NULL, NULL, NULL),
(15, 'subscription', 'view', 'subscription.view', 'View all tenant subscriptions', '2026-09-02 12:18:55', '2026-09-02 12:18:55', NULL, NULL, NULL),
(16, 'subscription', 'assign', 'subscription.assign', 'Assign a plan to a tenant', '2026-09-02 12:18:55', '2026-09-02 12:18:55', NULL, NULL, NULL),
(17, 'subscription', 'update', 'subscription.update', 'Change subscription status/dates', '2026-09-02 12:18:55', '2026-09-02 12:18:55', NULL, NULL, NULL),
(18, 'subscription', 'cancel', 'subscription.cancel', 'Cancel a tenant subscription', '2026-09-02 12:18:55', '2026-09-02 12:18:55', NULL, NULL, NULL),
(19, 'module', 'view', 'module.view', 'View module registry', '2026-09-02 12:18:55', '2026-09-02 12:18:55', NULL, NULL, NULL),
(20, 'module', 'update', 'module.update', 'Change module lifecycle state', '2026-09-02 12:18:55', '2026-09-02 12:18:55', NULL, NULL, NULL),
(21, 'feature_flag', 'view', 'feature_flag.view', 'View feature flags', '2026-09-02 12:18:55', '2026-09-02 12:18:55', NULL, NULL, NULL),
(22, 'feature_flag', 'toggle', 'feature_flag.toggle', 'Enable/disable feature flags globally', '2026-09-02 12:18:55', '2026-09-02 12:18:55', NULL, NULL, NULL),
(23, 'approval', 'view', 'approval.view', 'View approval requests', '2026-09-02 12:18:55', '2026-09-02 12:18:55', NULL, NULL, NULL),
(24, 'approval', 'process', 'approval.process', 'Approve or reject requests', '2026-09-02 12:18:55', '2026-09-02 12:18:55', NULL, NULL, NULL),
(25, 'support', 'view', 'support.view', 'View all support tickets', '2026-09-02 12:18:55', '2026-09-02 12:18:55', NULL, NULL, NULL),
(26, 'support', 'reply', 'support.reply', 'Reply to a support ticket', '2026-09-02 12:18:55', '2026-09-02 12:18:55', NULL, NULL, NULL),
(27, 'support', 'resolve', 'support.resolve', 'Mark a ticket as resolved', '2026-09-02 12:18:55', '2026-09-02 12:18:55', NULL, NULL, NULL),
(28, 'communication', 'send', 'communication.send', 'Broadcast communications to tenants', '2026-09-02 12:18:55', '2026-09-02 12:18:55', NULL, NULL, NULL),
(29, 'billing', 'view', 'billing.view', 'View invoices and billing data', '2026-09-02 12:18:55', '2026-09-02 12:18:55', NULL, NULL, NULL),
(30, 'billing', 'export', 'billing.export', 'Export billing data as CSV', '2026-09-02 12:18:55', '2026-09-02 12:18:55', NULL, NULL, NULL),
(31, 'analytics', 'view', 'analytics.view', 'View product analytics', '2026-09-02 12:18:55', '2026-09-02 12:18:55', NULL, NULL, NULL),
(32, 'report', 'view', 'report.view', 'View SaaS reports', '2026-09-02 12:18:55', '2026-09-02 12:18:55', NULL, NULL, NULL),
(33, 'audit_log', 'view', 'audit_log.view', 'View audit trail', '2026-09-02 12:18:55', '2026-09-02 12:18:55', NULL, NULL, NULL),
(34, 'system_config', 'view', 'system_config.view', 'View system configuration', '2026-09-02 12:18:55', '2026-09-02 12:18:55', NULL, NULL, NULL),
(35, 'system_config', 'update', 'system_config.update', 'Modify system configuration', '2026-09-02 12:18:55', '2026-09-02 12:18:55', NULL, NULL, NULL),
(36, 'role', 'view', 'role.view', 'View roles and permissions matrix', '2026-09-02 12:18:55', '2026-09-02 12:18:55', NULL, NULL, NULL),
(37, 'role', 'update', 'role.update', 'Modify role permissions', '2026-09-02 12:18:55', '2026-09-02 12:18:55', NULL, NULL, NULL),
(38, 'user', 'view', 'user.view', 'View platform users', '2026-09-02 12:18:55', '2026-09-02 12:18:55', NULL, NULL, NULL),
(39, 'user', 'update', 'user.update', 'Update user status/access', '2026-09-02 12:18:55', '2026-09-02 12:18:55', NULL, NULL, NULL),
(40, 'course', 'view', 'course.view', 'View courses, programs and levels', '2026-09-02 12:18:55', '2026-09-02 12:18:55', NULL, NULL, NULL),
(41, 'course', 'create', 'course.create', 'Create a new course', '2026-09-02 12:18:55', '2026-09-02 12:18:55', NULL, NULL, NULL),
(42, 'course', 'update', 'course.update', 'Edit a course and its programs/levels', '2026-09-02 12:18:55', '2026-09-02 12:18:55', NULL, NULL, NULL),
(43, 'course', 'delete', 'course.delete', 'Soft-delete a course', '2026-09-02 12:18:55', '2026-09-02 12:18:55', NULL, NULL, NULL),
(44, 'branch', 'view', 'branch.view', 'View branches and their details', '2026-09-02 12:18:55', '2026-09-02 12:18:55', NULL, NULL, NULL),
(45, 'branch', 'create', 'branch.create', 'Create a new branch', '2026-09-02 12:18:55', '2026-09-02 12:18:55', NULL, NULL, NULL),
(46, 'branch', 'update', 'branch.update', 'Edit a branch and its settings', '2026-09-02 12:18:55', '2026-09-02 12:18:55', NULL, NULL, NULL),
(47, 'branch', 'delete', 'branch.delete', 'Soft-delete a branch', '2026-09-02 12:18:55', '2026-09-02 12:18:55', NULL, NULL, NULL),
(48, 'classroom', 'view', 'classroom.view', 'View classrooms and their details', '2026-09-02 12:18:55', '2026-09-02 12:18:55', NULL, NULL, NULL),
(49, 'classroom', 'create', 'classroom.create', 'Create a new classroom', '2026-09-02 12:18:55', '2026-09-02 12:18:55', NULL, NULL, NULL),
(50, 'classroom', 'update', 'classroom.update', 'Edit a classroom', '2026-09-02 12:18:55', '2026-09-02 12:18:55', NULL, NULL, NULL),
(51, 'classroom', 'delete', 'classroom.delete', 'Soft-delete a classroom', '2026-09-02 12:18:55', '2026-09-02 12:18:55', NULL, NULL, NULL),
(52, 'batch', 'view', 'batch.view', 'View batches and their details', '2026-09-02 12:18:55', '2026-09-02 12:18:55', NULL, NULL, NULL),
(53, 'batch', 'create', 'batch.create', 'Create a new batch', '2026-09-02 12:18:55', '2026-09-02 12:18:55', NULL, NULL, NULL),
(54, 'batch', 'update', 'batch.update', 'Edit a batch', '2026-09-02 12:18:55', '2026-09-02 12:18:55', NULL, NULL, NULL),
(55, 'batch', 'delete', 'batch.delete', 'Soft-delete a batch', '2026-09-02 12:18:55', '2026-09-02 12:18:55', NULL, NULL, NULL),
(170, 'support', 'create', 'support.create', 'Raise a support ticket', '2026-09-02 16:08:39', '2026-09-02 16:08:39', NULL, NULL, NULL),
(171, 'support', 'edit', 'support.edit', 'Edit a support ticket subject or description', '2026-09-02 16:08:39', '2026-09-02 16:08:39', NULL, NULL, NULL),
(172, 'support', 'delete', 'support.delete', 'Delete a support ticket', '2026-09-02 16:08:39', '2026-09-02 16:08:39', NULL, NULL, NULL),
(224, 'user', 'create', 'user.create', 'Create new platform user', '2026-09-02 17:00:29', '2026-09-02 17:00:29', NULL, NULL, NULL),
(225, 'user', 'delete', 'user.delete', 'Soft delete user', '2026-09-02 17:00:29', '2026-09-02 17:00:29', NULL, NULL, NULL),
(226, 'user', 'reset_password', 'user.reset_password', 'Reset user password', '2026-09-02 17:00:29', '2026-09-02 17:00:29', NULL, NULL, NULL),
(228, 'role', 'create', 'role.create', 'Create custom global role', '2026-09-02 17:07:39', '2026-09-02 17:07:39', NULL, NULL, NULL),
(229, 'role', 'delete', 'role.delete', 'Delete custom global role', '2026-09-02 17:07:39', '2026-09-02 17:07:39', NULL, NULL, NULL),
(277, 'bundle', 'view', 'bundle.view', 'View subject bundles for a level', '2026-09-07 11:07:09', '2026-09-07 11:07:09', NULL, NULL, NULL),
(278, 'bundle', 'create', 'bundle.create', 'Create a subject bundle', '2026-09-07 11:07:09', '2026-09-07 11:07:09', NULL, NULL, NULL),
(279, 'bundle', 'update', 'bundle.update', 'Edit a subject bundle and its subjects', '2026-09-07 11:07:09', '2026-09-07 11:07:09', NULL, NULL, NULL),
(280, 'bundle', 'delete', 'bundle.delete', 'Soft-delete a subject bundle', '2026-09-07 11:07:09', '2026-09-07 11:07:09', NULL, NULL, NULL),
(571, 'fee', 'view', 'fee.view', 'View fee structures', '2026-09-07 12:59:18', '2026-10-05 13:54:36', NULL, NULL, NULL),
(572, 'fee', 'create', 'fee.create', 'Create fee structure entries', '2026-09-07 12:59:18', '2026-09-07 12:59:18', NULL, NULL, NULL),
(573, 'fee', 'update', 'fee.update', 'Edit fee structure entries', '2026-09-07 12:59:18', '2026-09-07 12:59:18', NULL, NULL, NULL),
(574, 'fee', 'delete', 'fee.delete', 'Soft-delete fee structure entries', '2026-09-07 12:59:18', '2026-09-07 12:59:18', NULL, NULL, NULL),
(575, 'billing', 'create', 'billing.create', 'Create SaaS invoices', '2026-09-07 14:36:07', '2026-09-07 14:36:07', NULL, NULL, NULL),
(576, 'billing', 'update', 'billing.update', 'Edit SaaS invoices', '2026-09-07 14:36:07', '2026-09-07 14:36:07', NULL, NULL, NULL),
(577, 'billing', 'delete', 'billing.delete', 'Soft-delete SaaS invoices', '2026-09-07 14:36:07', '2026-09-07 14:36:07', NULL, NULL, NULL),
(578, 'assignment', 'view', 'assignment.view', 'View homework, assignments, exams, and submissions', '2026-09-08 15:52:03', '2026-10-05 13:10:08', NULL, NULL, NULL),
(579, 'assignment', 'create', 'assignment.create', 'Create homework assignments', '2026-09-08 15:52:03', '2026-09-08 15:52:03', NULL, NULL, NULL),
(580, 'assignment', 'update', 'assignment.update', 'Edit / publish / close homework assignments', '2026-09-08 15:52:03', '2026-09-08 15:52:03', NULL, NULL, NULL),
(581, 'assignment', 'delete', 'assignment.delete', 'Delete homework assignments', '2026-09-08 15:52:03', '2026-09-08 15:52:03', NULL, NULL, NULL),
(582, 'assignment', 'grade', 'assignment.grade', 'Grade homework submissions', '2026-09-08 15:52:03', '2026-09-08 15:52:03', NULL, NULL, NULL),
(583, 'assignment', 'submit', 'assignment.submit', 'Submit homework responses and attachments', '2026-09-08 15:52:03', '2026-10-05 13:10:08', NULL, NULL, NULL),
(584, 'student', 'view', 'student.view', 'View assigned student rosters and detailed student profiles', '2026-09-15 12:33:59', '2026-09-15 12:33:59', NULL, NULL, NULL),
(585, 'attendance', 'view', 'attendance.view', 'View attendance records, lecture rosters, and student attendance logs', '2026-09-15 12:33:59', '2026-09-15 12:33:59', NULL, NULL, NULL),
(586, 'attendance', 'mark', 'attendance.mark', 'Mark, save, submit roll call attendance, or upload bulk attendance', '2026-09-15 12:33:59', '2026-09-15 12:33:59', NULL, NULL, NULL),
(587, 'timetable', 'view', 'timetable.view', 'View academic schedules, daily agenda, weekly timetable, and calendar events', '2026-09-15 12:33:59', '2026-09-15 12:33:59', NULL, NULL, NULL),
(589, 'other_income', 'view', 'other_income.view', 'View non-fee other income records, registry, and summaries', '2026-09-15 17:59:00', '2026-09-15 17:59:00', NULL, NULL, NULL),
(590, 'other_income', 'create', 'other_income.create', 'Record new other income receipts', '2026-09-15 17:59:00', '2026-09-15 17:59:00', NULL, NULL, NULL),
(591, 'other_income', 'update', 'other_income.update', 'Modify existing other income entries', '2026-09-15 17:59:00', '2026-09-15 17:59:00', NULL, NULL, NULL),
(592, 'other_income', 'delete', 'other_income.delete', 'Delete or soft-delete other income records', '2026-09-15 17:59:00', '2026-09-15 17:59:00', NULL, NULL, NULL),
(593, 'other_income', 'export', 'other_income.export', 'Export other income statement to CSV/Excel', '2026-09-15 17:59:00', '2026-09-15 17:59:00', NULL, NULL, NULL),
(594, 'finance', 'view', 'finance.view', 'View branch finance ledger and financial reports', '2026-09-15 17:59:00', '2026-09-15 17:59:00', NULL, NULL, NULL),
(595, 'finance', 'create', 'finance.create', 'Create financial transaction records', '2026-09-15 17:59:00', '2026-09-15 17:59:00', NULL, NULL, NULL),
(596, 'finance', 'update', 'finance.update', 'Update financial entries and vouchers', '2026-09-15 17:59:00', '2026-09-15 17:59:00', NULL, NULL, NULL),
(597, 'finance', 'delete', 'finance.delete', 'Delete financial entries and vouchers', '2026-09-15 17:59:00', '2026-09-15 17:59:00', NULL, NULL, NULL),
(598, 'finance', 'export', 'finance.export', 'Export branch financial statements', '2026-09-15 17:59:00', '2026-09-15 17:59:00', NULL, NULL, NULL),
(599, 'expense', 'view', 'expense.view', 'View branch operational expenses and vouchers', '2026-09-15 17:59:00', '2026-09-15 17:59:00', NULL, NULL, NULL),
(600, 'expense', 'create', 'expense.create', 'Record operational expenses (Salaries, Rent, Utilities, Stationery, etc.)', '2026-09-15 17:59:00', '2026-09-15 17:59:00', NULL, NULL, NULL),
(601, 'expense', 'update', 'expense.update', 'Update operational expense vouchers', '2026-09-15 17:59:00', '2026-09-15 17:59:00', NULL, NULL, NULL),
(602, 'expense', 'delete', 'expense.delete', 'Delete operational expense records', '2026-09-15 17:59:00', '2026-09-15 17:59:00', NULL, NULL, NULL),
(603, 'expense', 'export', 'expense.export', 'Export operational expense ledger to CSV/Excel', '2026-09-15 17:59:00', '2026-09-15 17:59:00', NULL, NULL, NULL),
(604, 'payroll', 'view', 'payroll.view', 'View staff salary structures and monthly payroll logs', '2026-09-15 17:59:00', '2026-09-15 17:59:00', NULL, NULL, NULL),
(605, 'payroll', 'create', 'payroll.create', 'Create staff salary structures and process monthly payroll', '2026-09-15 17:59:00', '2026-09-15 17:59:00', NULL, NULL, NULL),
(606, 'payroll', 'update', 'payroll.update', 'Modify payroll allocations and deductions', '2026-09-15 17:59:00', '2026-09-15 17:59:00', NULL, NULL, NULL),
(607, 'payroll', 'delete', 'payroll.delete', 'Delete or cancel monthly payroll records', '2026-09-15 17:59:00', '2026-09-15 17:59:00', NULL, NULL, NULL),
(608, 'payroll', 'export', 'payroll.export', 'Export staff payroll statements and pay-slips', '2026-09-15 17:59:00', '2026-09-15 17:59:00', NULL, NULL, NULL),
(609, 'lead', 'view', 'lead.view', 'List and view SaaS admin leads', '2026-09-17 13:02:55', '2026-09-17 13:02:55', NULL, NULL, NULL),
(610, 'lead', 'create', 'lead.create', 'Create a new SaaS admin lead', '2026-09-17 13:02:55', '2026-09-17 13:02:55', NULL, NULL, NULL),
(611, 'lead', 'update', 'lead.update', 'Edit a SaaS admin lead or its status', '2026-09-17 13:02:55', '2026-09-17 13:02:55', NULL, NULL, NULL),
(612, 'lead', 'delete', 'lead.delete', 'Soft-delete a SaaS admin lead', '2026-09-17 13:02:55', '2026-09-17 13:02:55', NULL, NULL, NULL),
(613, 'lead_followup', 'add', 'lead_followup.add', 'Add a follow-up note to a SaaS admin lead', '2026-09-17 13:02:55', '2026-09-17 13:02:55', NULL, NULL, NULL),
(614, 'enquiry', 'update', 'enquiry:update', 'Update enquiry details and stage', '2026-09-17 14:55:32', '2026-09-17 14:55:32', NULL, NULL, NULL),
(615, 'enquiry', 'assign', 'enquiry:assign', 'Assign/reassign counsellor or branch to an enquiry', '2026-09-17 14:55:32', '2026-09-17 14:55:32', NULL, NULL, NULL),
(616, 'enquiry', 'followup', 'enquiry:followup', 'Log a follow-up call on an enquiry', '2026-09-17 14:55:32', '2026-09-17 14:55:32', NULL, NULL, NULL),
(617, 'enquiry', 'convert', 'enquiry:convert', 'Convert an enquiry into a student', '2026-09-17 14:55:32', '2026-09-17 14:55:32', NULL, NULL, NULL),
(618, 'enquiry', 'lost', 'enquiry:lost', 'Mark an enquiry as lost', '2026-09-17 14:55:32', '2026-09-17 14:55:32', NULL, NULL, NULL),
(619, 'admission', 'create', 'admission:create', 'Create an admission record', '2026-09-17 14:55:32', '2026-09-17 14:55:32', NULL, NULL, NULL),
(620, 'admission', 'read', 'admission:read', 'View admission records', '2026-09-17 14:55:32', '2026-09-17 14:55:32', NULL, NULL, NULL),
(621, 'admission', 'verify_documents', 'admission:verify_documents', 'Verify admission documents', '2026-09-17 14:55:32', '2026-09-17 14:55:32', NULL, NULL, NULL),
(622, 'admission', 'batch_allocate', 'admission:batch_allocate', 'Allocate a batch to an admission', '2026-09-17 14:55:32', '2026-09-17 14:55:32', NULL, NULL, NULL),
(623, 'admission', 'activate', 'admission:activate', 'Activate a student admission', '2026-09-17 14:55:32', '2026-09-17 14:55:32', NULL, NULL, NULL),
(624, 'app_profile', 'view', 'student.profile.view', 'View own student profile & enrollment info', '2026-10-05 11:53:02', '2026-10-05 11:53:02', NULL, NULL, NULL),
(625, 'app_profile', 'update', 'student.profile.update', 'Update allowed personal contact details', '2026-10-05 11:53:02', '2026-10-05 11:53:02', NULL, NULL, NULL),
(626, 'app_profile', 'photo', 'student.profile.photo', 'Upload / update profile avatar image', '2026-10-05 11:53:02', '2026-10-05 11:53:02', NULL, NULL, NULL),
(627, 'app_profile', 'view', 'student.guardian.view', 'View guardian & emergency contact info', '2026-10-05 11:53:02', '2026-10-05 11:53:02', NULL, NULL, NULL),
(628, 'app_profile', 'view', 'student.document.view', 'View uploaded documents & verification status', '2026-10-05 11:53:02', '2026-10-05 11:53:02', NULL, NULL, NULL),
(629, 'app_academic', 'view', 'student.enrollment.view', 'View own active academic enrollment and batch details', '2026-10-05 12:28:05', '2026-10-05 12:28:05', NULL, NULL, NULL),
(630, 'app_academic', 'view', 'student.subject.view', 'View enrolled subjects and curriculum details', '2026-10-05 12:28:05', '2026-10-05 12:28:05', NULL, NULL, NULL),
(631, 'app_academic', 'view', 'student.faculty.view', 'View assigned teachers and faculty for enrolled batch', '2026-10-05 12:28:05', '2026-10-05 12:28:05', NULL, NULL, NULL),
(632, 'app_schedule', 'view', 'student.schedule.view', 'View student daily and calendar timetable schedule', '2026-10-05 12:36:27', '2026-10-05 12:36:27', NULL, NULL, NULL),
(633, 'app_schedule', 'view', 'student.lecture.view', 'View detailed information for a specific lecture session', '2026-10-05 12:36:27', '2026-10-05 12:36:27', NULL, NULL, NULL),
(634, 'app_attendance', 'view', 'student.attendance.view', 'View student attendance summary, date-wise history, and subject breakdown', '2026-10-05 12:51:40', '2026-10-05 12:51:40', NULL, NULL, NULL),
(635, 'student_homework', 'view', 'student.homework.view', 'View homework and assignments in student app', '2026-10-05 13:10:08', '2026-10-05 13:10:08', NULL, NULL, NULL),
(636, 'student_homework', 'submit', 'student.homework.submit', 'Submit homework responses in student app', '2026-10-05 13:10:08', '2026-10-05 13:10:08', NULL, NULL, NULL),
(639, 'student_exam', 'view', 'student.exam.view', 'View upcoming scheduled exams in student app', '2026-10-05 13:22:33', '2026-10-05 13:22:33', NULL, NULL, NULL),
(640, 'student_exam', 'results', 'student.exam.results', 'View exam results and scorecards in student app', '2026-10-05 13:22:33', '2026-10-05 13:22:33', NULL, NULL, NULL),
(641, 'exam', 'view', 'exam.view', 'View exams and assessments', '2026-10-05 13:22:33', '2026-10-05 13:22:33', NULL, NULL, NULL),
(642, 'student_doubt', 'view', 'student.doubt.view', 'View doubts and query threads in student app', '2026-10-05 13:29:27', '2026-10-05 13:29:27', NULL, NULL, NULL),
(643, 'student_doubt', 'create', 'student.doubt.create', 'Create new doubts in student app', '2026-10-05 13:29:27', '2026-10-05 13:29:27', NULL, NULL, NULL),
(644, 'student_doubt', 'reply', 'student.doubt.reply', 'Reply in doubt threads in student app', '2026-10-05 13:29:27', '2026-10-05 13:29:27', NULL, NULL, NULL),
(645, 'doubt', 'view', 'doubt.view', 'View doubts', '2026-10-05 13:29:27', '2026-10-05 13:29:27', NULL, NULL, NULL),
(646, 'doubt', 'create', 'doubt.create', 'Create doubts', '2026-10-05 13:29:27', '2026-10-05 13:29:27', NULL, NULL, NULL),
(647, 'doubt', 'reply', 'doubt.reply', 'Reply in doubts', '2026-10-05 13:29:27', '2026-10-05 13:29:27', NULL, NULL, NULL),
(648, 'student_fee', 'view', 'student.fee.view', 'View student fee status, invoices, and payment receipts', '2026-10-05 13:54:36', '2026-10-05 13:54:36', NULL, NULL, NULL),
(650, 'app_parent_profile', 'view', 'parent.profile.view', 'View parent profile and linked children', '2026-10-05 14:59:24', '2026-10-05 14:59:24', NULL, NULL, NULL),
(651, 'app_parent_profile', 'update', 'parent.profile.update', 'Update parent profile contact info', '2026-10-05 14:59:24', '2026-10-05 14:59:24', NULL, NULL, NULL),
(652, 'app_parent_profile', 'photo', 'parent.profile.photo', 'Upload parent profile avatar image', '2026-10-05 14:59:24', '2026-10-05 14:59:24', NULL, NULL, NULL),
(653, 'app_parent_home', 'view', 'parent.home.view', 'View parent family dashboard', '2026-10-05 14:59:24', '2026-10-05 14:59:24', NULL, NULL, NULL),
(654, 'app_parent_academic', 'view', 'parent.academic.view', 'View child academic snapshot and timetable', '2026-10-05 14:59:24', '2026-10-05 14:59:24', NULL, NULL, NULL),
(655, 'app_parent_attendance', 'view', 'parent.attendance.view', 'View child attendance summary and logs', '2026-10-05 14:59:24', '2026-10-05 14:59:24', NULL, NULL, NULL),
(656, 'app_parent_exam', 'view', 'parent.exam.view', 'View child exam results and report cards', '2026-10-05 14:59:24', '2026-10-05 14:59:24', NULL, NULL, NULL),
(657, 'app_parent_homework', 'view', 'parent.homework.view', 'View child homework and submissions', '2026-10-05 14:59:24', '2026-10-05 14:59:24', NULL, NULL, NULL),
(658, 'app_parent_fee', 'view', 'parent.fee.view', 'View child fees and invoices', '2026-10-05 14:59:24', '2026-10-05 14:59:24', NULL, NULL, NULL),
(659, 'app_parent_fee', 'pay', 'parent.fee.pay', 'Initiate online payment for child fees', '2026-10-05 14:59:24', '2026-10-05 14:59:24', NULL, NULL, NULL),
(660, 'app_parent_message', 'view', 'parent.message.view', 'View parent message threads', '2026-10-05 14:59:24', '2026-10-05 14:59:24', NULL, NULL, NULL),
(661, 'app_parent_message', 'create', 'parent.message.create', 'Send messages to teachers and school', '2026-10-05 14:59:24', '2026-10-05 14:59:24', NULL, NULL, NULL),
(662, 'app_parent_notification', 'view', 'parent.notification.view', 'View parent notifications and updates', '2026-10-05 14:59:24', '2026-10-05 14:59:24', NULL, NULL, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `plan_branding`
--

DROP TABLE IF EXISTS `plan_branding`;
CREATE TABLE IF NOT EXISTS `plan_branding` (
  `plan_id` int NOT NULL,
  `white_label` tinyint(1) NOT NULL DEFAULT '0',
  `custom_domain` tinyint(1) NOT NULL DEFAULT '0',
  `custom_logo` tinyint(1) NOT NULL DEFAULT '0',
  `custom_email_templates` tinyint(1) NOT NULL DEFAULT '0',
  PRIMARY KEY (`plan_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `plan_branding`
--

INSERT INTO `plan_branding` (`plan_id`, `white_label`, `custom_domain`, `custom_logo`, `custom_email_templates`) VALUES
(1, 0, 0, 0, 0),
(2, 0, 0, 1, 0),
(3, 1, 1, 1, 1),
(8, 1, 1, 1, 0);

-- --------------------------------------------------------

--
-- Table structure for table `plan_features`
--

DROP TABLE IF EXISTS `plan_features`;
CREATE TABLE IF NOT EXISTS `plan_features` (
  `plan_id` int NOT NULL,
  `admissions` tinyint(1) NOT NULL DEFAULT '0',
  `student_management` tinyint(1) NOT NULL DEFAULT '0',
  `parent_portal` tinyint(1) NOT NULL DEFAULT '0',
  `teacher_portal` tinyint(1) NOT NULL DEFAULT '0',
  `attendance` tinyint(1) NOT NULL DEFAULT '0',
  `timetable` tinyint(1) NOT NULL DEFAULT '0',
  `assignments` tinyint(1) NOT NULL DEFAULT '0',
  `exams` tinyint(1) NOT NULL DEFAULT '0',
  `results` tinyint(1) NOT NULL DEFAULT '0',
  `doubts` tinyint(1) NOT NULL DEFAULT '0',
  `fees` tinyint(1) NOT NULL DEFAULT '0',
  `payroll` tinyint(1) NOT NULL DEFAULT '0',
  `income` tinyint(1) NOT NULL DEFAULT '0',
  `expenses` tinyint(1) NOT NULL DEFAULT '0',
  `notifications` tinyint(1) NOT NULL DEFAULT '0',
  `sms` tinyint(1) NOT NULL DEFAULT '0',
  `whatsapp` tinyint(1) NOT NULL DEFAULT '0',
  `email` tinyint(1) NOT NULL DEFAULT '0',
  `reports` tinyint(1) NOT NULL DEFAULT '0',
  `audit_logs` tinyint(1) NOT NULL DEFAULT '0',
  `import_export` tinyint(1) NOT NULL DEFAULT '0',
  `api_access` tinyint(1) NOT NULL DEFAULT '0',
  PRIMARY KEY (`plan_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `plan_features`
--

INSERT INTO `plan_features` (`plan_id`, `admissions`, `student_management`, `parent_portal`, `teacher_portal`, `attendance`, `timetable`, `assignments`, `exams`, `results`, `doubts`, `fees`, `payroll`, `income`, `expenses`, `notifications`, `sms`, `whatsapp`, `email`, `reports`, `audit_logs`, `import_export`, `api_access`) VALUES
(1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 1, 0, 0, 0, 0),
(2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1, 0, 1, 0),
(3, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1),
(8, 1, 0, 1, 1, 1, 0, 1, 1, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0);

-- --------------------------------------------------------

--
-- Table structure for table `plan_integrations`
--

DROP TABLE IF EXISTS `plan_integrations`;
CREATE TABLE IF NOT EXISTS `plan_integrations` (
  `plan_id` int NOT NULL,
  `razorpay` tinyint(1) NOT NULL DEFAULT '0',
  `cashfree` tinyint(1) NOT NULL DEFAULT '0',
  `whatsapp_business` tinyint(1) NOT NULL DEFAULT '0',
  `zoom` tinyint(1) NOT NULL DEFAULT '0',
  `google_meet` tinyint(1) NOT NULL DEFAULT '0',
  `google_calendar` tinyint(1) NOT NULL DEFAULT '0',
  `biometric_devices` tinyint(1) NOT NULL DEFAULT '0',
  PRIMARY KEY (`plan_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `plan_integrations`
--

INSERT INTO `plan_integrations` (`plan_id`, `razorpay`, `cashfree`, `whatsapp_business`, `zoom`, `google_meet`, `google_calendar`, `biometric_devices`) VALUES
(1, 0, 0, 0, 0, 0, 0, 0),
(2, 1, 0, 0, 1, 1, 1, 0),
(3, 1, 1, 1, 1, 1, 1, 1),
(8, 1, 0, 1, 1, 0, 0, 0);

-- --------------------------------------------------------

--
-- Table structure for table `plan_limits`
--

DROP TABLE IF EXISTS `plan_limits`;
CREATE TABLE IF NOT EXISTS `plan_limits` (
  `plan_id` int NOT NULL,
  `max_branches` int NOT NULL DEFAULT '-1',
  `max_staff_users` int NOT NULL DEFAULT '-1',
  `max_students` int NOT NULL DEFAULT '-1',
  `max_parents` int NOT NULL DEFAULT '-1',
  `max_teachers` int NOT NULL DEFAULT '-1',
  `max_storage` varchar(50) NOT NULL DEFAULT '-1',
  `max_file_size` varchar(50) NOT NULL DEFAULT '-1',
  `max_sms_credits` int NOT NULL DEFAULT '-1',
  `max_whatsapp_msgs` int NOT NULL DEFAULT '-1',
  PRIMARY KEY (`plan_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `plan_limits`
--

INSERT INTO `plan_limits` (`plan_id`, `max_branches`, `max_staff_users`, `max_students`, `max_parents`, `max_teachers`, `max_storage`, `max_file_size`, `max_sms_credits`, `max_whatsapp_msgs`) VALUES
(1, 1, 10, 100, 200, 10, '5 GB', '10 MB', 100, -1),
(2, 5, 50, 1000, 2000, 50, '20 GB', '50 MB', 5000, 1000),
(3, -1, -1, -1, -1, -1, '100 GB', '100 MB', -1, -1),
(8, -1, -1, -1, -1, -1, '5 GB', '5 MB', -1, -1);

-- --------------------------------------------------------

--
-- Table structure for table `plan_support`
--

DROP TABLE IF EXISTS `plan_support`;
CREATE TABLE IF NOT EXISTS `plan_support` (
  `plan_id` int NOT NULL,
  `email_support` tinyint(1) NOT NULL DEFAULT '0',
  `chat_support` tinyint(1) NOT NULL DEFAULT '0',
  `phone_support` tinyint(1) NOT NULL DEFAULT '0',
  `dedicated_account_manager` tinyint(1) NOT NULL DEFAULT '0',
  `onboarding_assistance` tinyint(1) NOT NULL DEFAULT '0',
  PRIMARY KEY (`plan_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `plan_support`
--

INSERT INTO `plan_support` (`plan_id`, `email_support`, `chat_support`, `phone_support`, `dedicated_account_manager`, `onboarding_assistance`) VALUES
(1, 1, 0, 0, 0, 0),
(2, 1, 1, 0, 0, 1),
(3, 1, 1, 1, 1, 1),
(8, 1, 1, 1, 1, 0);

-- --------------------------------------------------------

--
-- Table structure for table `platform_settings`
--

DROP TABLE IF EXISTS `platform_settings`;
CREATE TABLE IF NOT EXISTS `platform_settings` (
  `id` int NOT NULL AUTO_INCREMENT,
  `category` varchar(50) NOT NULL,
  `key_name` varchar(100) NOT NULL,
  `value` text,
  `is_secret` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `updated_by` int DEFAULT NULL,
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `category` (`category`,`key_name`),
  KEY `updated_by` (`updated_by`),
  KEY `idx_platform_settings_category` (`category`)
) ENGINE=InnoDB AUTO_INCREMENT=35 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `platform_settings`
--

INSERT INTO `platform_settings` (`id`, `category`, `key_name`, `value`, `is_secret`, `created_at`, `updated_at`, `updated_by`, `deleted_at`) VALUES
(1, 'billing', 'plan_expiry_warning_days', '15', 0, '2026-09-02 13:16:59', '2026-09-02 13:16:59', NULL, NULL),
(4, 'general', 'saas_platform_name', 'Vidya Setu', 0, '2026-09-03 15:32:24', '2026-09-03 15:32:24', NULL, NULL),
(5, 'general', 'global_support_relay_email', 'support@vidyasetu.com', 0, '2026-09-03 15:32:24', '2026-09-03 15:32:24', NULL, NULL),
(6, 'general', 'default_gst_rate', '18', 0, '2026-09-03 15:32:24', '2026-09-03 15:32:24', NULL, NULL),
(7, 'general', 'platform_base_currency', 'INR', 0, '2026-09-03 15:32:24', '2026-09-03 15:32:24', NULL, NULL),
(8, 'general', 'admin_idle_timeout', '60', 0, '2026-09-03 15:32:24', '2026-09-03 15:32:24', NULL, NULL),
(9, 'general', 'plan_expiry_warning_days', '15', 0, '2026-09-03 15:32:24', '2026-09-03 15:32:24', NULL, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `programs`
--

DROP TABLE IF EXISTS `programs`;
CREATE TABLE IF NOT EXISTS `programs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL,
  `course_id` int NOT NULL,
  `name` varchar(255) NOT NULL,
  `code` varchar(50) DEFAULT NULL,
  `duration` varchar(50) DEFAULT NULL,
  `total_fee` decimal(10,2) DEFAULT NULL,
  `down_payment` decimal(10,2) DEFAULT NULL,
  `installment_months` int DEFAULT NULL,
  `description` text,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` datetime DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `course_id` (`course_id`,`code`),
  KEY `tenant_id` (`tenant_id`)
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `programs`
--

INSERT INTO `programs` (`id`, `tenant_id`, `course_id`, `name`, `code`, `duration`, `total_fee`, `down_payment`, `installment_months`, `description`, `is_active`, `created_at`, `updated_at`, `deleted_at`, `created_by`, `updated_by`) VALUES
(1, 2, 1, '2 Year', 'PRG-001', '2 Years', 150000.00, 30000.00, 12, 'Two year classroom program', 1, '2026-09-02 12:18:55', '2026-09-07 13:11:18', NULL, 2, 2);

-- --------------------------------------------------------

--
-- Table structure for table `push_tokens`
--

DROP TABLE IF EXISTS `push_tokens`;
CREATE TABLE IF NOT EXISTS `push_tokens` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL,
  `user_id` int NOT NULL,
  `device_id` int DEFAULT NULL,
  `fcm_token` text NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `tenant_id` (`tenant_id`),
  KEY `device_id` (`device_id`),
  KEY `idx_push_tokens_user` (`user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `push_tokens`
--

INSERT INTO `push_tokens` (`id`, `tenant_id`, `user_id`, `device_id`, `fcm_token`, `is_active`, `created_at`, `updated_at`) VALUES
(1, 2, 228, 1, 'mock_fcm_token_abcdef123456789', 0, '2026-10-05 11:38:56', '2026-10-12 14:48:52');

-- --------------------------------------------------------

--
-- Table structure for table `receipts`
--

DROP TABLE IF EXISTS `receipts`;
CREATE TABLE IF NOT EXISTS `receipts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL,
  `branch_id` int NOT NULL,
  `receipt_number` varchar(50) NOT NULL,
  `enrollment_id` int NOT NULL,
  `total_amount` decimal(10,2) NOT NULL,
  `receipt_date` date NOT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'active',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `created_by` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `receipt_number` (`receipt_number`),
  KEY `tenant_id` (`tenant_id`),
  KEY `branch_id` (`branch_id`),
  KEY `enrollment_id` (`enrollment_id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `receipts`
--

INSERT INTO `receipts` (`id`, `tenant_id`, `branch_id`, `receipt_number`, `enrollment_id`, `total_amount`, `receipt_date`, `status`, `created_at`, `updated_at`, `created_by`) VALUES
(5, 2, 1, 'RCPT-2-2026-000001', 3, 120000.00, '2026-09-23', 'active', '2026-09-23 15:00:28', '2026-09-23 15:00:28', 2);

-- --------------------------------------------------------

--
-- Table structure for table `recurring_schedule_rules`
--

DROP TABLE IF EXISTS `recurring_schedule_rules`;
CREATE TABLE IF NOT EXISTS `recurring_schedule_rules` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL,
  `branch_id` int NOT NULL,
  `academic_year_id` int NOT NULL,
  `batch_id` int NOT NULL,
  `subject_id` int NOT NULL,
  `teacher_user_id` int NOT NULL,
  `classroom_id` int DEFAULT NULL,
  `day_of_week` int NOT NULL,
  `start_time` time NOT NULL,
  `end_time` time NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` datetime DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `tenant_id` (`tenant_id`),
  KEY `branch_id` (`branch_id`),
  KEY `academic_year_id` (`academic_year_id`),
  KEY `batch_id` (`batch_id`),
  KEY `subject_id` (`subject_id`),
  KEY `teacher_user_id` (`teacher_user_id`),
  KEY `classroom_id` (`classroom_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `refunds`
--

DROP TABLE IF EXISTS `refunds`;
CREATE TABLE IF NOT EXISTS `refunds` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL,
  `receipt_id` int NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `reason` text NOT NULL,
  `refund_mode` varchar(50) NOT NULL,
  `reference_number` varchar(100) DEFAULT NULL,
  `approved_by` int DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_by` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `tenant_id` (`tenant_id`),
  KEY `receipt_id` (`receipt_id`),
  KEY `approved_by` (`approved_by`),
  KEY `created_by` (`created_by`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `roles`
--

DROP TABLE IF EXISTS `roles`;
CREATE TABLE IF NOT EXISTS `roles` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `code` varchar(50) NOT NULL,
  `description` text,
  `is_system` tinyint(1) NOT NULL DEFAULT '0',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` datetime DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_roles_code` (`code`)
) ENGINE=InnoDB AUTO_INCREMENT=19 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `roles`
--

INSERT INTO `roles` (`id`, `name`, `code`, `description`, `is_system`, `is_active`, `created_at`, `updated_at`, `deleted_at`, `created_by`, `updated_by`) VALUES
(1, 'SaaS Admin', 'saas_admin', 'Platform-level super administrator with cross-tenant access', 1, 1, '2026-09-02 12:18:55', '2026-09-02 12:18:55', NULL, NULL, NULL),
(2, 'Institute Admin', 'inst_admin', 'Full access to the institute', 1, 1, '2026-09-02 12:18:55', '2026-09-02 12:18:55', NULL, NULL, NULL),
(3, 'Branch Admin', 'branch_admin', 'Manages a single branch of the institute', 1, 1, '2026-09-02 12:18:55', '2026-09-02 12:18:55', NULL, NULL, NULL),
(4, 'Counsellor', 'counsellor', 'Lead pipeline and enquiry logs', 1, 1, '2026-09-02 12:18:55', '2026-09-02 12:18:55', NULL, NULL, NULL),
(5, 'Teacher', 'teacher', 'Schedules and doubt clearance', 1, 1, '2026-09-02 12:18:55', '2026-09-02 12:18:55', NULL, NULL, NULL),
(6, 'Finance', 'finance', 'Fee ledger and invoice records', 1, 1, '2026-09-02 12:18:55', '2026-09-02 12:18:55', NULL, NULL, NULL),
(7, 'Parent', 'parent', 'Access to student progress and communication', 0, 1, '2026-09-02 12:18:55', '2026-09-02 12:18:55', NULL, NULL, NULL),
(8, 'Student', 'student', 'Learner account for classes and study material', 0, 1, '2026-09-02 12:18:55', '2026-09-02 12:18:55', NULL, NULL, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `role_permissions`
--

DROP TABLE IF EXISTS `role_permissions`;
CREATE TABLE IF NOT EXISTS `role_permissions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `role_id` int NOT NULL,
  `permission_id` int NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `role_id` (`role_id`,`permission_id`),
  KEY `permission_id` (`permission_id`)
) ENGINE=InnoDB AUTO_INCREMENT=682 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `role_permissions`
--

INSERT INTO `role_permissions` (`id`, `role_id`, `permission_id`, `created_at`) VALUES
(1, 1, 31, '2026-09-02 12:18:55'),
(2, 1, 24, '2026-09-02 12:18:55'),
(3, 1, 23, '2026-09-02 12:18:55'),
(4, 1, 33, '2026-09-02 12:18:55'),
(5, 1, 30, '2026-09-02 12:18:55'),
(6, 1, 29, '2026-09-02 12:18:55'),
(7, 1, 28, '2026-09-02 12:18:55'),
(8, 1, 22, '2026-09-02 12:18:55'),
(9, 1, 21, '2026-09-02 12:18:55'),
(10, 1, 20, '2026-09-02 12:18:55'),
(11, 1, 19, '2026-09-02 12:18:55'),
(12, 1, 12, '2026-09-02 12:18:55'),
(13, 1, 14, '2026-09-02 12:18:55'),
(14, 1, 13, '2026-09-02 12:18:55'),
(15, 1, 11, '2026-09-02 12:18:55'),
(16, 1, 32, '2026-09-02 12:18:55'),
(17, 1, 37, '2026-09-02 12:18:55'),
(18, 1, 36, '2026-09-02 12:18:55'),
(19, 1, 16, '2026-09-02 12:18:55'),
(20, 1, 18, '2026-09-02 12:18:55'),
(21, 1, 17, '2026-09-02 12:18:55'),
(22, 1, 15, '2026-09-02 12:18:55'),
(23, 1, 26, '2026-09-02 12:18:55'),
(24, 1, 27, '2026-09-02 12:18:55'),
(25, 1, 25, '2026-09-02 12:18:55'),
(26, 1, 35, '2026-09-02 12:18:55'),
(27, 1, 34, '2026-09-02 12:18:55'),
(28, 1, 8, '2026-09-02 12:18:55'),
(29, 1, 6, '2026-09-02 12:18:55'),
(30, 1, 10, '2026-09-02 12:18:55'),
(31, 1, 9, '2026-09-02 12:18:55'),
(32, 1, 7, '2026-09-02 12:18:55'),
(33, 1, 5, '2026-09-02 12:18:55'),
(34, 1, 39, '2026-09-02 12:18:55'),
(35, 1, 38, '2026-09-02 12:18:55'),
(64, 2, 41, '2026-09-02 12:18:55'),
(65, 2, 43, '2026-09-02 12:18:55'),
(66, 2, 42, '2026-09-02 12:18:55'),
(67, 2, 40, '2026-09-02 12:18:55'),
(71, 1, 41, '2026-09-02 12:18:55'),
(72, 1, 43, '2026-09-02 12:18:55'),
(73, 1, 42, '2026-09-02 12:18:55'),
(74, 1, 40, '2026-09-02 12:18:55'),
(78, 2, 45, '2026-09-02 12:18:55'),
(79, 2, 47, '2026-09-02 12:18:55'),
(80, 2, 46, '2026-09-02 12:18:55'),
(81, 2, 44, '2026-09-02 12:18:55'),
(85, 1, 45, '2026-09-02 12:18:55'),
(86, 1, 47, '2026-09-02 12:18:55'),
(87, 1, 46, '2026-09-02 12:18:55'),
(88, 1, 44, '2026-09-02 12:18:55'),
(92, 2, 49, '2026-09-02 12:18:55'),
(93, 2, 51, '2026-09-02 12:18:55'),
(94, 2, 50, '2026-09-02 12:18:55'),
(95, 2, 48, '2026-09-02 12:18:55'),
(99, 1, 49, '2026-09-02 12:18:55'),
(100, 1, 51, '2026-09-02 12:18:55'),
(101, 1, 50, '2026-09-02 12:18:55'),
(102, 1, 48, '2026-09-02 12:18:55'),
(106, 2, 53, '2026-09-02 12:18:55'),
(107, 2, 55, '2026-09-02 12:18:55'),
(108, 2, 54, '2026-09-02 12:18:55'),
(109, 2, 52, '2026-09-02 12:18:55'),
(113, 1, 53, '2026-09-02 12:18:55'),
(114, 1, 55, '2026-09-02 12:18:55'),
(115, 1, 54, '2026-09-02 12:18:55'),
(116, 1, 52, '2026-09-02 12:18:55'),
(138, 1, 170, '2026-09-02 16:08:39'),
(139, 1, 172, '2026-09-02 16:08:39'),
(140, 1, 171, '2026-09-02 16:08:39'),
(146, 2, 170, '2026-09-02 16:08:39'),
(147, 2, 172, '2026-09-02 16:08:39'),
(148, 2, 171, '2026-09-02 16:08:39'),
(149, 2, 26, '2026-09-02 16:08:39'),
(150, 2, 27, '2026-09-02 16:08:39'),
(151, 2, 25, '2026-09-02 16:08:39'),
(160, 1, 224, '2026-09-02 17:00:29'),
(161, 1, 225, '2026-09-02 17:00:29'),
(162, 1, 226, '2026-09-02 17:00:29'),
(167, 1, 228, '2026-09-02 17:07:39'),
(168, 1, 229, '2026-09-02 17:07:39'),
(170, 1, 3, '2026-09-03 15:42:30'),
(171, 1, 1, '2026-09-03 15:42:30'),
(172, 1, 2, '2026-09-03 15:42:30'),
(173, 1, 4, '2026-09-03 15:42:30'),
(178, 2, 31, '2026-09-03 16:53:33'),
(179, 2, 24, '2026-09-03 16:53:33'),
(180, 2, 23, '2026-09-03 16:53:33'),
(181, 2, 3, '2026-09-03 16:53:33'),
(182, 2, 33, '2026-09-03 16:53:33'),
(183, 2, 30, '2026-09-03 16:53:33'),
(184, 2, 29, '2026-09-03 16:53:33'),
(185, 2, 28, '2026-09-03 16:53:33'),
(186, 2, 1, '2026-09-03 16:53:33'),
(187, 2, 2, '2026-09-03 16:53:33'),
(188, 2, 22, '2026-09-03 16:53:33'),
(189, 2, 21, '2026-09-03 16:53:33'),
(190, 2, 4, '2026-09-03 16:53:33'),
(191, 2, 20, '2026-09-03 16:53:33'),
(192, 2, 19, '2026-09-03 16:53:33'),
(193, 2, 12, '2026-09-03 16:53:33'),
(194, 2, 14, '2026-09-03 16:53:33'),
(195, 2, 13, '2026-09-03 16:53:33'),
(196, 2, 11, '2026-09-03 16:53:33'),
(197, 2, 32, '2026-09-03 16:53:33'),
(198, 2, 228, '2026-09-03 16:53:33'),
(199, 2, 229, '2026-09-03 16:53:33'),
(200, 2, 37, '2026-09-03 16:53:33'),
(201, 2, 36, '2026-09-03 16:53:33'),
(202, 2, 16, '2026-09-03 16:53:33'),
(203, 2, 18, '2026-09-03 16:53:33'),
(204, 2, 17, '2026-09-03 16:53:33'),
(205, 2, 15, '2026-09-03 16:53:33'),
(206, 2, 35, '2026-09-03 16:53:33'),
(207, 2, 34, '2026-09-03 16:53:33'),
(208, 2, 8, '2026-09-03 16:53:33'),
(209, 2, 6, '2026-09-03 16:53:33'),
(210, 2, 10, '2026-09-03 16:53:33'),
(211, 2, 9, '2026-09-03 16:53:33'),
(212, 2, 7, '2026-09-03 16:53:33'),
(213, 2, 5, '2026-09-03 16:53:33'),
(214, 2, 224, '2026-09-03 16:53:33'),
(215, 2, 225, '2026-09-03 16:53:33'),
(216, 2, 226, '2026-09-03 16:53:33'),
(217, 2, 39, '2026-09-03 16:53:33'),
(218, 2, 38, '2026-09-03 16:53:33'),
(241, 1, 278, '2026-09-07 11:07:09'),
(242, 1, 280, '2026-09-07 11:07:09'),
(243, 1, 279, '2026-09-07 11:07:09'),
(244, 1, 277, '2026-09-07 11:07:09'),
(248, 2, 278, '2026-09-07 11:07:09'),
(249, 2, 280, '2026-09-07 11:07:09'),
(250, 2, 279, '2026-09-07 11:07:09'),
(251, 2, 277, '2026-09-07 11:07:09'),
(286, 3, 277, '2026-09-07 11:37:32'),
(290, 1, 572, '2026-09-07 12:59:18'),
(291, 2, 572, '2026-09-07 12:59:18'),
(292, 3, 572, '2026-09-07 12:59:18'),
(293, 1, 574, '2026-09-07 12:59:18'),
(294, 2, 574, '2026-09-07 12:59:18'),
(295, 3, 574, '2026-09-07 12:59:18'),
(296, 1, 573, '2026-09-07 12:59:18'),
(297, 2, 573, '2026-09-07 12:59:18'),
(298, 3, 573, '2026-09-07 12:59:18'),
(299, 1, 571, '2026-09-07 12:59:18'),
(300, 2, 571, '2026-09-07 12:59:18'),
(301, 3, 571, '2026-09-07 12:59:18'),
(305, 1, 575, '2026-09-07 14:36:07'),
(306, 1, 577, '2026-09-07 14:36:07'),
(307, 1, 576, '2026-09-07 14:36:07'),
(308, 5, 578, '2026-09-08 15:52:03'),
(309, 2, 578, '2026-09-08 15:52:03'),
(310, 3, 578, '2026-09-08 15:52:03'),
(311, 5, 579, '2026-09-08 15:52:03'),
(312, 2, 579, '2026-09-08 15:52:03'),
(313, 3, 579, '2026-09-08 15:52:03'),
(314, 5, 580, '2026-09-08 15:52:03'),
(315, 2, 580, '2026-09-08 15:52:03'),
(316, 3, 580, '2026-09-08 15:52:03'),
(317, 5, 581, '2026-09-08 15:52:03'),
(318, 2, 581, '2026-09-08 15:52:03'),
(319, 3, 581, '2026-09-08 15:52:03'),
(320, 5, 582, '2026-09-08 15:52:03'),
(321, 2, 582, '2026-09-08 15:52:03'),
(322, 3, 582, '2026-09-08 15:52:03'),
(323, 5, 583, '2026-09-08 15:52:03'),
(324, 2, 583, '2026-09-08 15:52:03'),
(325, 3, 583, '2026-09-08 15:52:03'),
(339, 3, 53, '2026-09-09 16:06:41'),
(340, 3, 55, '2026-09-09 16:06:41'),
(341, 3, 54, '2026-09-09 16:06:41'),
(342, 3, 52, '2026-09-09 16:06:41'),
(343, 3, 46, '2026-09-09 16:06:41'),
(344, 3, 44, '2026-09-09 16:06:41'),
(345, 3, 49, '2026-09-09 16:06:41'),
(346, 3, 51, '2026-09-09 16:06:41'),
(347, 3, 50, '2026-09-09 16:06:41'),
(348, 3, 48, '2026-09-09 16:06:41'),
(349, 3, 40, '2026-09-09 16:06:41'),
(354, 3, 170, '2026-09-09 18:22:22'),
(355, 3, 172, '2026-09-09 18:22:22'),
(356, 3, 171, '2026-09-09 18:22:22'),
(357, 3, 26, '2026-09-09 18:22:22'),
(358, 3, 27, '2026-09-09 18:22:22'),
(359, 3, 25, '2026-09-09 18:22:22'),
(361, 3, 586, '2026-09-15 12:33:59'),
(362, 3, 585, '2026-09-15 12:33:59'),
(363, 3, 584, '2026-09-15 12:33:59'),
(364, 3, 587, '2026-09-15 12:33:59'),
(366, 2, 586, '2026-09-15 12:33:59'),
(367, 2, 585, '2026-09-15 12:33:59'),
(368, 2, 584, '2026-09-15 12:33:59'),
(369, 2, 587, '2026-09-15 12:33:59'),
(371, 5, 586, '2026-09-15 12:33:59'),
(372, 5, 585, '2026-09-15 12:33:59'),
(373, 5, 584, '2026-09-15 12:33:59'),
(374, 5, 587, '2026-09-15 12:33:59'),
(375, 6, 52, '2026-09-15 15:11:38'),
(376, 6, 575, '2026-09-15 15:11:38'),
(377, 6, 577, '2026-09-15 15:11:38'),
(378, 6, 30, '2026-09-15 15:11:38'),
(379, 6, 576, '2026-09-15 15:11:38'),
(380, 6, 29, '2026-09-15 15:11:38'),
(381, 6, 44, '2026-09-15 15:11:38'),
(382, 6, 277, '2026-09-15 15:11:38'),
(383, 6, 40, '2026-09-15 15:11:38'),
(384, 6, 572, '2026-09-15 15:11:38'),
(385, 6, 574, '2026-09-15 15:11:38'),
(386, 6, 573, '2026-09-15 15:11:38'),
(387, 6, 571, '2026-09-15 15:11:38'),
(388, 6, 4, '2026-09-15 15:11:38'),
(389, 6, 584, '2026-09-15 15:11:38'),
(390, 1, 600, '2026-09-15 17:59:00'),
(391, 2, 600, '2026-09-15 17:59:00'),
(392, 6, 600, '2026-09-15 17:59:00'),
(393, 3, 600, '2026-09-15 17:59:00'),
(394, 1, 602, '2026-09-15 17:59:00'),
(395, 2, 602, '2026-09-15 17:59:00'),
(396, 6, 602, '2026-09-15 17:59:00'),
(397, 3, 602, '2026-09-15 17:59:00'),
(398, 1, 603, '2026-09-15 17:59:00'),
(399, 2, 603, '2026-09-15 17:59:00'),
(400, 6, 603, '2026-09-15 17:59:00'),
(401, 3, 603, '2026-09-15 17:59:00'),
(402, 1, 601, '2026-09-15 17:59:00'),
(403, 2, 601, '2026-09-15 17:59:00'),
(404, 6, 601, '2026-09-15 17:59:00'),
(405, 3, 601, '2026-09-15 17:59:00'),
(406, 1, 599, '2026-09-15 17:59:00'),
(407, 2, 599, '2026-09-15 17:59:00'),
(408, 6, 599, '2026-09-15 17:59:00'),
(409, 3, 599, '2026-09-15 17:59:00'),
(410, 1, 595, '2026-09-15 17:59:00'),
(411, 2, 595, '2026-09-15 17:59:00'),
(412, 6, 595, '2026-09-15 17:59:00'),
(413, 3, 595, '2026-09-15 17:59:00'),
(414, 1, 597, '2026-09-15 17:59:00'),
(415, 2, 597, '2026-09-15 17:59:00'),
(416, 6, 597, '2026-09-15 17:59:00'),
(417, 3, 597, '2026-09-15 17:59:00'),
(418, 1, 598, '2026-09-15 17:59:00'),
(419, 2, 598, '2026-09-15 17:59:00'),
(420, 6, 598, '2026-09-15 17:59:00'),
(421, 3, 598, '2026-09-15 17:59:00'),
(422, 1, 596, '2026-09-15 17:59:00'),
(423, 2, 596, '2026-09-15 17:59:00'),
(424, 6, 596, '2026-09-15 17:59:00'),
(425, 3, 596, '2026-09-15 17:59:00'),
(426, 1, 594, '2026-09-15 17:59:00'),
(427, 2, 594, '2026-09-15 17:59:00'),
(428, 6, 594, '2026-09-15 17:59:00'),
(429, 3, 594, '2026-09-15 17:59:00'),
(430, 1, 590, '2026-09-15 17:59:00'),
(431, 2, 590, '2026-09-15 17:59:00'),
(432, 6, 590, '2026-09-15 17:59:00'),
(433, 3, 590, '2026-09-15 17:59:00'),
(434, 1, 592, '2026-09-15 17:59:00'),
(435, 2, 592, '2026-09-15 17:59:00'),
(436, 6, 592, '2026-09-15 17:59:00'),
(437, 3, 592, '2026-09-15 17:59:00'),
(438, 1, 593, '2026-09-15 17:59:00'),
(439, 2, 593, '2026-09-15 17:59:00'),
(440, 6, 593, '2026-09-15 17:59:00'),
(441, 3, 593, '2026-09-15 17:59:00'),
(442, 1, 591, '2026-09-15 17:59:00'),
(443, 2, 591, '2026-09-15 17:59:00'),
(444, 6, 591, '2026-09-15 17:59:00'),
(445, 3, 591, '2026-09-15 17:59:00'),
(446, 1, 589, '2026-09-15 17:59:00'),
(447, 2, 589, '2026-09-15 17:59:00'),
(448, 6, 589, '2026-09-15 17:59:00'),
(449, 3, 589, '2026-09-15 17:59:00'),
(450, 1, 605, '2026-09-15 17:59:00'),
(451, 2, 605, '2026-09-15 17:59:00'),
(452, 6, 605, '2026-09-15 17:59:00'),
(453, 3, 605, '2026-09-15 17:59:00'),
(454, 1, 607, '2026-09-15 17:59:00'),
(455, 2, 607, '2026-09-15 17:59:00'),
(456, 6, 607, '2026-09-15 17:59:00'),
(457, 3, 607, '2026-09-15 17:59:00'),
(458, 1, 608, '2026-09-15 17:59:00'),
(459, 2, 608, '2026-09-15 17:59:00'),
(460, 6, 608, '2026-09-15 17:59:00'),
(461, 3, 608, '2026-09-15 17:59:00'),
(462, 1, 606, '2026-09-15 17:59:00'),
(463, 2, 606, '2026-09-15 17:59:00'),
(464, 6, 606, '2026-09-15 17:59:00'),
(465, 3, 606, '2026-09-15 17:59:00'),
(466, 1, 604, '2026-09-15 17:59:00'),
(467, 2, 604, '2026-09-15 17:59:00'),
(468, 6, 604, '2026-09-15 17:59:00'),
(469, 3, 604, '2026-09-15 17:59:00'),
(470, 1, 613, '2026-09-17 13:02:55'),
(471, 1, 610, '2026-09-17 13:02:55'),
(472, 1, 612, '2026-09-17 13:02:55'),
(473, 1, 611, '2026-09-17 13:02:55'),
(474, 1, 609, '2026-09-17 13:02:55'),
(477, 2, 623, '2026-09-17 14:55:32'),
(478, 4, 623, '2026-09-17 14:55:32'),
(479, 3, 623, '2026-09-17 14:55:32'),
(480, 2, 622, '2026-09-17 14:55:32'),
(481, 4, 622, '2026-09-17 14:55:32'),
(482, 3, 622, '2026-09-17 14:55:32'),
(483, 2, 619, '2026-09-17 14:55:32'),
(484, 4, 619, '2026-09-17 14:55:32'),
(485, 3, 619, '2026-09-17 14:55:32'),
(486, 2, 620, '2026-09-17 14:55:32'),
(487, 4, 620, '2026-09-17 14:55:32'),
(488, 3, 620, '2026-09-17 14:55:32'),
(489, 2, 621, '2026-09-17 14:55:32'),
(490, 4, 621, '2026-09-17 14:55:32'),
(491, 3, 621, '2026-09-17 14:55:32'),
(492, 2, 615, '2026-09-17 14:55:32'),
(493, 4, 615, '2026-09-17 14:55:32'),
(494, 3, 615, '2026-09-17 14:55:32'),
(495, 2, 617, '2026-09-17 14:55:32'),
(496, 4, 617, '2026-09-17 14:55:32'),
(497, 3, 617, '2026-09-17 14:55:32'),
(498, 4, 1, '2026-09-17 14:55:32'),
(499, 3, 1, '2026-09-17 14:55:32'),
(500, 2, 616, '2026-09-17 14:55:32'),
(501, 4, 616, '2026-09-17 14:55:32'),
(502, 3, 616, '2026-09-17 14:55:32'),
(503, 2, 618, '2026-09-17 14:55:32'),
(504, 4, 618, '2026-09-17 14:55:32'),
(505, 3, 618, '2026-09-17 14:55:32'),
(506, 4, 2, '2026-09-17 14:55:32'),
(507, 3, 2, '2026-09-17 14:55:32'),
(508, 2, 614, '2026-09-17 14:55:32'),
(509, 4, 614, '2026-09-17 14:55:32'),
(510, 3, 614, '2026-09-17 14:55:32'),
(635, 8, 628, '2026-10-05 11:53:02'),
(636, 8, 627, '2026-10-05 11:53:02'),
(637, 8, 626, '2026-10-05 11:53:02'),
(638, 8, 625, '2026-10-05 11:53:02'),
(639, 8, 624, '2026-10-05 11:53:02'),
(642, 8, 629, '2026-10-05 12:28:05'),
(643, 8, 631, '2026-10-05 12:28:05'),
(644, 8, 630, '2026-10-05 12:28:05'),
(645, 8, 633, '2026-10-05 12:36:27'),
(646, 8, 632, '2026-10-05 12:36:27'),
(648, 8, 634, '2026-10-05 12:51:40'),
(649, 8, 583, '2026-10-05 13:10:08'),
(650, 8, 578, '2026-10-05 13:10:08'),
(651, 8, 636, '2026-10-05 13:10:08'),
(652, 8, 635, '2026-10-05 13:10:08'),
(656, 8, 641, '2026-10-05 13:22:33'),
(657, 8, 640, '2026-10-05 13:22:33'),
(658, 8, 639, '2026-10-05 13:22:33'),
(659, 8, 646, '2026-10-05 13:29:27'),
(660, 8, 647, '2026-10-05 13:29:27'),
(661, 8, 645, '2026-10-05 13:29:27'),
(662, 8, 643, '2026-10-05 13:29:27'),
(663, 8, 644, '2026-10-05 13:29:27'),
(664, 8, 642, '2026-10-05 13:29:27'),
(666, 8, 571, '2026-10-05 13:54:36'),
(667, 8, 648, '2026-10-05 13:54:36'),
(669, 7, 650, '2026-10-05 14:59:24'),
(670, 7, 651, '2026-10-05 14:59:24'),
(671, 7, 652, '2026-10-05 14:59:24'),
(672, 7, 653, '2026-10-05 14:59:24'),
(673, 7, 654, '2026-10-05 14:59:24'),
(674, 7, 655, '2026-10-05 14:59:24'),
(675, 7, 656, '2026-10-05 14:59:24'),
(676, 7, 657, '2026-10-05 14:59:24'),
(677, 7, 658, '2026-10-05 14:59:24'),
(678, 7, 659, '2026-10-05 14:59:24'),
(679, 7, 660, '2026-10-05 14:59:24'),
(680, 7, 661, '2026-10-05 14:59:24'),
(681, 7, 662, '2026-10-05 14:59:24');

-- --------------------------------------------------------

--
-- Table structure for table `saas_invoices`
--

DROP TABLE IF EXISTS `saas_invoices`;
CREATE TABLE IF NOT EXISTS `saas_invoices` (
  `id` int NOT NULL AUTO_INCREMENT,
  `invoice_number` varchar(50) NOT NULL,
  `tenant_id` int NOT NULL,
  `plan_id` int NOT NULL,
  `billing_cycle` enum('monthly','quarterly','half_yearly','yearly','lifetime') NOT NULL,
  `billing_period_start` date NOT NULL,
  `billing_period_end` date NOT NULL,
  `plan_amount` decimal(10,2) NOT NULL COMMENT 'Original plan price for this billing cycle',
  `setup_fee` decimal(10,2) NOT NULL DEFAULT '0.00',
  `discount_percent` decimal(5,2) NOT NULL DEFAULT '0.00',
  `discount_amount` decimal(10,2) NOT NULL DEFAULT '0.00',
  `subtotal` decimal(10,2) NOT NULL COMMENT 'plan_amount + setup_fee - discount_amount',
  `tax_rate` decimal(5,2) NOT NULL DEFAULT '18.00',
  `tax_amount` decimal(10,2) NOT NULL DEFAULT '0.00',
  `total_amount` decimal(10,2) NOT NULL COMMENT 'subtotal + tax_amount',
  `currency` varchar(10) NOT NULL DEFAULT 'INR',
  `payment_date` date DEFAULT NULL,
  `payment_method` varchar(50) DEFAULT NULL COMMENT 'Razorpay, UPI, Bank Transfer, Cash, Cheque',
  `provider_transaction_id` varchar(100) DEFAULT NULL COMMENT 'Gateway txn ID if online payment',
  `payment_reference` varchar(100) DEFAULT NULL COMMENT 'Cheque number, UPI ref, bank ref, etc.',
  `status` enum('draft','unpaid','paid','overdue','refunded','cancelled') NOT NULL DEFAULT 'draft',
  `notes` text,
  `created_by` int DEFAULT NULL COMMENT 'User who created/entered this invoice',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `invoice_number` (`invoice_number`),
  KEY `idx_saas_invoices_tenant` (`tenant_id`),
  KEY `idx_saas_invoices_plan` (`plan_id`),
  KEY `idx_saas_invoices_status` (`status`),
  KEY `idx_saas_invoices_payment_date` (`payment_date`),
  KEY `idx_saas_invoices_billing_period` (`billing_period_start`,`billing_period_end`),
  KEY `idx_saas_invoices_deleted` (`deleted_at`)
) ENGINE=InnoDB AUTO_INCREMENT=87 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `saas_invoices`
--

INSERT INTO `saas_invoices` (`id`, `invoice_number`, `tenant_id`, `plan_id`, `billing_cycle`, `billing_period_start`, `billing_period_end`, `plan_amount`, `setup_fee`, `discount_percent`, `discount_amount`, `subtotal`, `tax_rate`, `tax_amount`, `total_amount`, `currency`, `payment_date`, `payment_method`, `provider_transaction_id`, `payment_reference`, `status`, `notes`, `created_by`, `created_at`, `updated_at`, `deleted_at`) VALUES
(1, 'INV-2026-0001', 2, 3, 'yearly', '2026-01-01', '2027-01-01', 199990.00, 0.00, 10.00, 19999.00, 179991.00, 18.00, 32398.38, 212389.38, 'INR', '2026-01-02', 'Razorpay', 'pay_Allen231124', 'rzp_allen_annual_2026', 'paid', 'Annual Pro subscription for 2026-2027. 10% enterprise discount.', 1, '2026-09-02 13:13:58', '2026-09-22 11:35:50', '2026-09-22 11:35:50');

-- --------------------------------------------------------

--
-- Table structure for table `saas_leads`
--

DROP TABLE IF EXISTS `saas_leads`;
CREATE TABLE IF NOT EXISTS `saas_leads` (
  `id` int NOT NULL AUTO_INCREMENT,
  `institute_name` varchar(255) NOT NULL,
  `contact_person` varchar(255) NOT NULL,
  `designation` varchar(50) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `mobile` varchar(20) NOT NULL,
  `alt_mobile` varchar(20) DEFAULT NULL,
  `address_line1` varchar(255) DEFAULT NULL,
  `city` varchar(100) DEFAULT NULL,
  `state` varchar(100) DEFAULT NULL,
  `pincode` varchar(10) DEFAULT NULL,
  `source` tinyint NOT NULL DEFAULT '1',
  `assigned_to` int DEFAULT NULL,
  `status` tinyint NOT NULL DEFAULT '1',
  `lost_reason` text,
  `plan_assigned_at` datetime DEFAULT NULL,
  `next_followup_at` datetime DEFAULT NULL,
  `plan_id` int DEFAULT NULL,
  `preferred_slug` varchar(100) DEFAULT NULL,
  `remarks` text,
  `converted_tenant_id` int DEFAULT NULL,
  `converted_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` datetime DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_saas_leads_converted_tenant` (`converted_tenant_id`),
  KEY `fk_saas_leads_plan_id` (`plan_id`),
  KEY `idx_saas_leads_status` (`status`),
  KEY `idx_saas_leads_assigned_to` (`assigned_to`),
  KEY `idx_saas_leads_source` (`source`),
  KEY `idx_saas_leads_created_at` (`created_at`),
  KEY `idx_saas_leads_mobile` (`mobile`),
  KEY `idx_saas_leads_email` (`email`),
  KEY `idx_saas_leads_deleted_status` (`deleted_at`,`status`)
) ENGINE=InnoDB AUTO_INCREMENT=24 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `saas_lead_followups`
--

DROP TABLE IF EXISTS `saas_lead_followups`;
CREATE TABLE IF NOT EXISTS `saas_lead_followups` (
  `id` int NOT NULL AUTO_INCREMENT,
  `lead_id` int NOT NULL,
  `followup_mode` varchar(50) NOT NULL,
  `outcome` varchar(255) NOT NULL,
  `notes` text,
  `next_followup_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_by` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_saas_lead_followups_created_by` (`created_by`),
  KEY `idx_saas_lead_followups_lead` (`lead_id`)
) ENGINE=InnoDB AUTO_INCREMENT=20 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `salary_structures`
--

DROP TABLE IF EXISTS `salary_structures`;
CREATE TABLE IF NOT EXISTS `salary_structures` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL,
  `name` varchar(100) NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` datetime DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `tenant_id` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `salary_structure_components`
--

DROP TABLE IF EXISTS `salary_structure_components`;
CREATE TABLE IF NOT EXISTS `salary_structure_components` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL,
  `structure_id` int NOT NULL,
  `name` varchar(100) NOT NULL,
  `type` varchar(20) NOT NULL,
  `amount_type` varchar(20) NOT NULL,
  `value` decimal(10,2) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `tenant_id` (`tenant_id`),
  KEY `structure_id` (`structure_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `schedule_change_logs`
--

DROP TABLE IF EXISTS `schedule_change_logs`;
CREATE TABLE IF NOT EXISTS `schedule_change_logs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL,
  `lecture_id` int NOT NULL,
  `change_type` varchar(50) NOT NULL,
  `old_values` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin,
  `new_values` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin,
  `changed_by` int DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `tenant_id` (`tenant_id`),
  KEY `lecture_id` (`lecture_id`),
  KEY `changed_by` (`changed_by`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `schema_migrations`
--

DROP TABLE IF EXISTS `schema_migrations`;
CREATE TABLE IF NOT EXISTS `schema_migrations` (
  `id` int NOT NULL AUTO_INCREMENT,
  `migration_name` varchar(255) NOT NULL,
  `executed_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `migration_name` (`migration_name`)
) ENGINE=InnoDB AUTO_INCREMENT=140 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `schema_migrations`
--

INSERT INTO `schema_migrations` (`id`, `migration_name`, `executed_at`) VALUES
(1, '000_setup_extensions.sql', '2026-09-02 12:15:04'),
(2, '001_create_subscription_plans.sql', '2026-09-02 12:15:04'),
(3, '002_create_plan_features.sql', '2026-09-02 12:15:04'),
(4, '003_create_plan_limits.sql', '2026-09-02 12:15:04'),
(5, '004_create_plan_support.sql', '2026-09-02 12:15:04'),
(6, '005_create_plan_branding.sql', '2026-09-02 12:15:04'),
(7, '006_create_plan_integrations.sql', '2026-09-02 12:15:05'),
(8, '007_create_document_types.sql', '2026-09-02 12:15:05'),
(9, '008_create_notification_templates.sql', '2026-09-02 12:15:05'),
(10, '009_create_module_registry.sql', '2026-09-02 12:15:05'),
(11, '010_create_permissions.sql', '2026-09-02 12:15:05'),
(12, '011_create_tenants.sql', '2026-09-02 12:15:05'),
(13, '012_create_tenant_module_overrides.sql', '2026-09-02 12:15:05'),
(14, '013_create_roles.sql', '2026-09-02 12:15:05'),
(15, '014_create_role_permissions.sql', '2026-09-02 12:15:05'),
(16, '015_create_branches.sql', '2026-09-02 12:15:05'),
(17, '016_create_branch_settings.sql', '2026-09-02 12:15:05'),
(18, '017_create_holidays.sql', '2026-09-02 12:15:05'),
(19, '018_create_users.sql', '2026-09-02 12:15:06'),
(20, '019_create_app_devices.sql', '2026-09-02 12:15:06'),
(21, '020_create_user_sessions.sql', '2026-09-02 12:15:06'),
(22, '021_create_otp_codes.sql', '2026-09-02 12:15:06'),
(23, '022_create_password_resets.sql', '2026-09-02 12:15:06'),
(24, '023_create_push_tokens.sql', '2026-09-02 12:15:06'),
(25, '024_create_user_roles.sql', '2026-09-02 12:15:06'),
(26, '025_create_user_branch_access.sql', '2026-09-02 12:15:06'),
(27, '026_create_overridden_permissions.sql', '2026-09-02 12:15:06'),
(28, '027_create_boards.sql', '2026-09-02 12:15:06'),
(29, '028_create_courses.sql', '2026-09-02 12:15:06'),
(30, '029_create_course_branches.sql', '2026-09-02 12:15:07'),
(31, '030_create_programs.sql', '2026-09-02 12:15:07'),
(32, '031_create_levels.sql', '2026-09-02 12:15:07'),
(33, '032_create_subjects.sql', '2026-09-02 12:15:07'),
(34, '033_create_level_subjects.sql', '2026-09-02 12:15:07'),
(35, '034_create_classrooms.sql', '2026-09-02 12:15:07'),
(36, '035_create_academic_years.sql', '2026-09-02 12:15:07'),
(37, '036_create_batches.sql', '2026-09-02 12:15:07'),
(38, '037_create_staff_profiles.sql', '2026-09-02 12:15:08'),
(39, '038_create_teacher_availability.sql', '2026-09-02 12:15:08'),
(40, '039_create_teacher_allocations.sql', '2026-09-02 12:15:08'),
(41, '040_create_staff_attendance.sql', '2026-09-02 12:15:08'),
(42, '041_create_leave_requests.sql', '2026-09-02 12:15:08'),
(43, '042_create_enquiry_sources.sql', '2026-09-02 12:15:08'),
(44, '043_create_enquiries.sql', '2026-09-02 12:15:08'),
(45, '044_create_enquiry_followups.sql', '2026-09-02 12:15:08'),
(46, '045_create_enquiry_status_logs.sql', '2026-09-02 12:15:09'),
(47, '046_create_students.sql', '2026-09-02 12:15:09'),
(48, '047_create_guardians.sql', '2026-09-02 12:15:09'),
(49, '048_create_student_guardians.sql', '2026-09-02 12:15:09'),
(50, '049_create_admissions.sql', '2026-09-02 12:15:10'),
(51, '050_create_student_enrollments.sql', '2026-09-02 12:15:10'),
(52, '051_create_batch_transfer_history.sql', '2026-09-02 12:15:10'),
(53, '052_create_student_documents.sql', '2026-09-02 12:15:10'),
(54, '053_create_recurring_schedule_rules.sql', '2026-09-02 12:15:10'),
(55, '054_create_lectures.sql', '2026-09-02 12:15:11'),
(56, '055_create_lecture_cancellations.sql', '2026-09-02 12:15:11'),
(57, '056_create_schedule_change_logs.sql', '2026-09-02 12:15:11'),
(58, '057_create_attendance_settings.sql', '2026-09-02 12:15:11'),
(59, '058_create_attendance_sessions.sql', '2026-09-02 12:15:11'),
(60, '059_create_attendance_records.sql', '2026-09-02 12:15:11'),
(61, '060_create_attendance_correction_requests.sql', '2026-09-02 12:15:11'),
(62, '061_create_assignments.sql', '2026-09-02 12:15:11'),
(63, '062_create_assignment_files.sql', '2026-09-02 12:15:11'),
(64, '063_create_assignment_submissions.sql', '2026-09-02 12:15:12'),
(65, '064_create_assignment_submission_files.sql', '2026-09-02 12:15:12'),
(66, '065_create_exams.sql', '2026-09-02 12:15:12'),
(67, '066_create_exam_batch_assignments.sql', '2026-09-02 12:15:12'),
(68, '067_create_exam_marks.sql', '2026-09-02 12:15:12'),
(69, '068_create_exam_result_publish_logs.sql', '2026-09-02 12:15:12'),
(70, '069_create_doubts.sql', '2026-09-02 12:15:12'),
(71, '070_create_doubt_messages.sql', '2026-09-02 12:15:12'),
(72, '071_create_doubt_attachments.sql', '2026-09-02 12:15:12'),
(73, '072_create_fee_heads.sql', '2026-09-02 12:15:12'),
(74, '073_create_fee_plans.sql', '2026-09-02 12:15:13'),
(75, '074_create_fee_plan_items.sql', '2026-09-02 12:15:13'),
(76, '075_create_fee_plan_installments.sql', '2026-09-02 12:15:13'),
(77, '076_create_subject_bundles.sql', '2026-09-02 12:15:13'),
(78, '077_create_bundle_subjects.sql', '2026-09-02 12:15:13'),
(79, '078_create_concessions.sql', '2026-09-02 12:15:13'),
(80, '079_create_student_fee_assignments.sql', '2026-09-02 12:15:13'),
(81, '080_create_student_installments.sql', '2026-09-02 12:15:13'),
(82, '081_create_receipts.sql', '2026-09-02 12:15:13'),
(83, '082_create_payment_transactions.sql', '2026-09-02 12:15:13'),
(84, '083_create_payment_installment_links.sql', '2026-09-02 12:15:14'),
(85, '084_create_refunds.sql', '2026-09-02 12:15:14'),
(86, '085_create_income_expense_heads.sql', '2026-09-02 12:15:14'),
(87, '086_create_income_expense_ledger.sql', '2026-09-02 12:15:14'),
(88, '087_create_salary_structures.sql', '2026-09-02 12:15:14'),
(89, '088_create_salary_structure_components.sql', '2026-09-02 12:15:14'),
(90, '089_create_payroll_periods.sql', '2026-09-02 12:15:14'),
(91, '090_create_payroll_records.sql', '2026-09-02 12:15:14'),
(92, '091_create_payroll_disbursements.sql', '2026-09-02 12:15:14'),
(93, '092_create_notifications.sql', '2026-09-02 12:15:14'),
(94, '093_create_notification_recipients.sql', '2026-09-02 12:15:15'),
(95, '094_create_announcements.sql', '2026-09-02 12:15:15'),
(96, '095_create_announcement_audiences.sql', '2026-09-02 12:15:15'),
(97, '096_create_broadcast_messages.sql', '2026-09-02 12:15:15'),
(98, '097_create_communication_logs.sql', '2026-09-02 12:15:15'),
(99, '098_create_audit_logs.sql', '2026-09-02 12:15:15'),
(100, '099_create_platform_settings.sql', '2026-09-02 12:15:15'),
(101, '100_create_approval_requests.sql', '2026-09-02 12:15:16'),
(102, '101_create_saas_invoices.sql', '2026-09-02 12:15:16'),
(103, '102_create_saas_payments.sql', '2026-09-02 12:15:16'),
(104, '103_create_email_templates.sql', '2026-09-02 12:15:16'),
(105, '104_create_staff_junction_tables.sql', '2026-09-02 12:15:16'),
(106, '104_create_topics.sql', '2026-09-02 12:15:16'),
(107, '105_create_branch_programs.sql', '2026-09-02 12:15:16'),
(108, '106_update_branch_status_enum.sql', '2026-09-02 12:15:16'),
(109, '107_update_classroom_enums.sql', '2026-09-02 12:15:16'),
(110, '108_recreate_saas_invoices_unified.sql', '2026-09-02 13:13:47'),
(111, '109_create_support_tickets.sql', '2026-09-02 15:42:48'),
(112, '110_support_replies_sender_fk_attachments.sql', '2026-09-02 16:06:50'),
(113, '111_create_system_configurations.sql', '2026-09-03 11:08:05'),
(114, '112_create_sms_templates.sql', '2026-09-07 11:07:03'),
(115, '113_create_whatsapp_templates.sql', '2026-09-07 11:07:03'),
(116, '114_add_level_id_to_subject_bundles.sql', '2026-09-07 11:07:03'),
(117, '115_merge_bundle_subjects_into_subject_bundles.sql', '2026-09-07 11:24:03'),
(118, '118_create_homework_tables.sql', '2026-09-08 15:18:14'),
(119, '121_create_attendance_records.sql', '2026-09-09 11:55:46'),
(120, '122_staff_attendance_lecture_ids.sql', '2026-09-09 13:21:15'),
(121, '123_staff_ops_seed.sql', '2026-09-09 14:45:12'),
(122, '116_fee_structure_on_programs.sql', '2026-09-15 13:25:59'),
(123, '117_saas_invoice_crud.sql', '2026-09-15 13:25:59'),
(124, '124_create_lecture_requests.sql', '2026-09-15 13:25:59'),
(125, '125_create_student_doubts.sql', '2026-09-15 13:25:59'),
(126, '126_create_student_doubt_replies.sql', '2026-09-15 13:25:59'),
(127, '127_drop_legacy_doubt_tables.sql', '2026-09-15 13:39:16'),
(128, '128_create_saas_leads.sql', '2026-09-17 12:56:56'),
(129, '129_create_saas_lead_followups.sql', '2026-09-17 12:56:56'),
(130, '130_add_source_lead_id_to_tenants.sql', '2026-09-17 12:56:56'),
(131, '131_redesign_enquiries.sql', '2026-09-17 12:57:08'),
(132, '132_enhance_enquiry_followups.sql', '2026-09-17 12:57:08'),
(133, '131_widen_saas_lead_followup_outcome.sql', '2026-09-17 14:40:48'),
(134, '133_remove_counselled_status.sql', '2026-09-17 14:40:48'),
(135, '134_remove_offer_accepted_status.sql', '2026-09-17 14:47:03'),
(136, '135_extend_enquiry_status_logs.sql', '2026-09-17 14:55:32'),
(137, '136_admissions_pipeline_columns.sql', '2026-09-17 14:55:32'),
(138, '137_concessions_enquiry_link.sql', '2026-09-17 14:55:32'),
(139, '138_seed_enquiry_permissions.sql', '2026-09-17 14:55:32');

-- --------------------------------------------------------

--
-- Table structure for table `sms_templates`
--

DROP TABLE IF EXISTS `sms_templates`;
CREATE TABLE IF NOT EXISTS `sms_templates` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL DEFAULT '1' COMMENT 'Default 1 for Vidya Setu master tenant or specific institute tenant_id',
  `template_name` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Display name of template e.g., Fee Due Reminder, Exam Schedule Alert',
  `template_key` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Unique identifier key e.g., FEE_DUE_REMINDER',
  `category` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'General' COMMENT 'Category: Fee & Billing, Admissions, Exams & Results, Attendance, System Alerts, General',
  `dlt_template_id` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Distributed Ledger Technology ID for TRAI regulatory compliance',
  `message_body` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Raw SMS text body containing {{placeholders}}',
  `status` enum('active','inactive','deleted') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `created_by` int DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` datetime DEFAULT NULL,
  `variables` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin,
  PRIMARY KEY (`id`),
  UNIQUE KEY `template_key` (`template_key`),
  KEY `idx_tenant` (`tenant_id`),
  KEY `idx_category` (`category`),
  KEY `idx_status` (`status`),
  KEY `idx_dlt_id` (`dlt_template_id`)
) ENGINE=InnoDB AUTO_INCREMENT=29 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `sms_templates`
--

INSERT INTO `sms_templates` (`id`, `tenant_id`, `template_name`, `template_key`, `category`, `dlt_template_id`, `message_body`, `status`, `created_by`, `updated_by`, `created_at`, `updated_at`, `deleted_at`, `variables`) VALUES
(1, 1, 'Fee Installment Reminder', 'FEE_DUE_REMINDER', 'Fee & Billing', '14071628192038102', '{{student_name}}Dear {{parent_name}}, fee installment of Rs. {{amount}} for {{student_name}} is due on {{due_date}}. Please pay online at {{payment_link}} - {{institute_name}}.', 'active', NULL, NULL, '2026-09-03 13:19:46', '2026-09-03 13:30:54', '2026-09-03 13:30:54', NULL),
(2, 1, 'Admission Confirmation Alert', 'ADMISSION_CONFIRMATION', 'Admissions', '14071628192038104', 'Welcome {{student_name}}! Your admission for {{course_name}} at Vidya Setu ({{branch_name}}) is confirmed. Roll No: {{student_id}}.', 'active', NULL, NULL, '2026-09-03 13:19:46', '2026-09-07 11:07:09', NULL, '{\"student_id\": \"STU-2026-045\", \"branch_name\": \"Main Campus\", \"course_name\": \"IIT-JEE Advanced\", \"student_name\": \"Priya Patel\"}'),
(3, 1, 'Exam Marks Announcement', 'EXAM_MARKS_ANNOUNCEMENT', 'Exams & Results', '14071628192038105', 'Dear {{parent_name}}, {{student_name}} scored {{marks}}/{{max_marks}} in {{subject_name}} (Test: {{exam_name}}). Rank: {{rank}}. - Vidya Setu', 'active', NULL, NULL, '2026-09-03 13:19:46', '2026-09-07 11:07:09', NULL, '{\"rank\": \"1st\", \"marks\": \"94\", \"exam_name\": \"Weekly Mock Test\", \"max_marks\": \"100\", \"parent_name\": \"Anita Sharma\", \"student_name\": \"Rahul Sharma\", \"subject_name\": \"Physics\"}'),
(4, 1, 'Lecture Absentee Alert', 'LECTURE_ABSENTEE_ALERT', 'Attendance', '14071628192038106', 'Alert: {{student_name}} was marked ABSENT for the {{subject_name}} lecture on {{lecture_date}} at {{branch_name}}. - Vidya Setu Administration', 'inactive', NULL, NULL, '2026-09-03 13:19:46', '2026-09-07 11:07:09', NULL, '{\"branch_name\": \"Kothrud Branch\", \"lecture_date\": \"03/09/2026\", \"student_name\": \"Amit Kumar\", \"subject_name\": \"Mathematics\"}'),
(5, 1, 'OTP Verification Code', 'OTP_VERIFICATION_CODE', 'System Alerts', '14071628192038108', 'Your Vidya Setu portal verification OTP code is {{otp_code}}. Valid for 10 minutes. Do not share this code.', 'active', NULL, NULL, '2026-09-03 13:19:46', '2026-09-07 11:07:09', NULL, '{\"otp_code\": \"849201\"}'),
(6, 1, 'Fee Installment Reminder', 'FEE_INSTALLMENT_REMINDER', 'Fee & Billing', '14071628192038102', 'Dear Parent, fee installment of Rs. {{amount}} for {{student_name}} is due on {{due_date}}. Pay online at {{payment_link}} - Vidya Setu', 'active', NULL, NULL, '2026-09-07 11:07:09', '2026-09-07 11:07:09', NULL, '{\"amount\": \"15,000\", \"due_date\": \"15/09/2026\", \"payment_link\": \"https://vidyasetu.com/pay\", \"student_name\": \"Rahul Sharma\"}');

-- --------------------------------------------------------

--
-- Table structure for table `staff_attendance`
--

DROP TABLE IF EXISTS `staff_attendance`;
CREATE TABLE IF NOT EXISTS `staff_attendance` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL,
  `branch_id` int NOT NULL,
  `staff_id` int NOT NULL,
  `date` date NOT NULL,
  `lecture_ids` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin,
  `status` tinyint NOT NULL DEFAULT '1',
  `remarks` varchar(255) DEFAULT NULL,
  `marked_by` int DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `staff_id` (`staff_id`,`date`),
  KEY `tenant_id` (`tenant_id`),
  KEY `branch_id` (`branch_id`),
  KEY `marked_by` (`marked_by`),
  KEY `idx_staff_attendance_date` (`tenant_id`,`branch_id`,`date`)
) ENGINE=InnoDB AUTO_INCREMENT=18 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `staff_attendance`
--

INSERT INTO `staff_attendance` (`id`, `tenant_id`, `branch_id`, `staff_id`, `date`, `lecture_ids`, `status`, `remarks`, `marked_by`, `created_at`, `updated_at`) VALUES
(1, 2, 1, 14, '2026-09-16', '[196]', 1, NULL, 101, '2026-09-09 13:28:18', '2026-09-09 13:36:54');

-- --------------------------------------------------------

--
-- Table structure for table `staff_profiles`
--

DROP TABLE IF EXISTS `staff_profiles`;
CREATE TABLE IF NOT EXISTS `staff_profiles` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL,
  `branch_ids` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin,
  `user_id` int NOT NULL,
  `employee_id` varchar(50) DEFAULT NULL,
  `contact_number` varchar(20) DEFAULT NULL,
  `alternate_mobile` varchar(20) DEFAULT NULL,
  `first_name` varchar(100) NOT NULL,
  `last_name` varchar(100) NOT NULL,
  `gender` varchar(20) DEFAULT NULL,
  `dob` date DEFAULT NULL,
  `aadhaar_number` varchar(255) DEFAULT NULL,
  `pan_number` varchar(255) DEFAULT NULL,
  `personal_email` varchar(255) DEFAULT NULL,
  `address` text,
  `profile_photo_url` text,
  `employee_type` varchar(20) NOT NULL,
  `designation` varchar(150) DEFAULT NULL,
  `department` varchar(100) DEFAULT NULL,
  `joining_date` date DEFAULT NULL,
  `employment_type` varchar(20) NOT NULL DEFAULT 'full_time',
  `employment_status` varchar(20) NOT NULL DEFAULT 'active',
  `experience` varchar(50) DEFAULT NULL,
  `qualification` varchar(255) DEFAULT NULL,
  `salary_type` varchar(20) DEFAULT NULL,
  `salary_amount` decimal(12,2) DEFAULT NULL,
  `salary_effective_from` date DEFAULT NULL,
  `bank_account_number` varchar(255) DEFAULT NULL,
  `bank_ifsc` varchar(20) DEFAULT NULL,
  `bank_name` varchar(100) DEFAULT NULL,
  `tds_applicable` tinyint(1) NOT NULL DEFAULT '0',
  `professional_tax_applicable` tinyint(1) NOT NULL DEFAULT '0',
  `city` varchar(100) DEFAULT NULL,
  `state` varchar(100) DEFAULT NULL,
  `pincode` varchar(20) DEFAULT NULL,
  `max_lectures_per_day` int DEFAULT NULL,
  `max_lectures_per_week` int DEFAULT NULL,
  `working_days` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin,
  `biometric_mandatory` tinyint(1) DEFAULT '0',
  `status` enum('active','inactive','deleted') NOT NULL DEFAULT 'active',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` datetime DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `tenant_id` (`tenant_id`,`user_id`),
  UNIQUE KEY `tenant_id_2` (`tenant_id`,`employee_id`),
  KEY `user_id` (`user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=269 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `staff_profiles`
--

INSERT INTO `staff_profiles` (`id`, `tenant_id`, `branch_ids`, `user_id`, `employee_id`, `contact_number`, `alternate_mobile`, `first_name`, `last_name`, `gender`, `dob`, `aadhaar_number`, `pan_number`, `personal_email`, `address`, `profile_photo_url`, `employee_type`, `designation`, `department`, `joining_date`, `employment_type`, `employment_status`, `experience`, `qualification`, `salary_type`, `salary_amount`, `salary_effective_from`, `bank_account_number`, `bank_ifsc`, `bank_name`, `tds_applicable`, `professional_tax_applicable`, `city`, `state`, `pincode`, `max_lectures_per_day`, `max_lectures_per_week`, `working_days`, `biometric_mandatory`, `status`, `created_at`, `updated_at`, `deleted_at`, `created_by`, `updated_by`) VALUES
(14, 2, '[1]', 215, 'EMP-1015', '9876543013', NULL, 'Rajesh', 'Mishra', 'Male', NULL, NULL, NULL, 'rajesh.mishra215@vidyasetu.com', NULL, NULL, 'Teaching', 'Faculty', 'Academics', '2025-04-01', 'Full-Time', 'Active', NULL, NULL, 'Monthly', 56000.00, '2025-04-01', NULL, NULL, NULL, 0, 0, NULL, NULL, NULL, 4, NULL, '[\"Monday\", \"Tuesday\", \"Wednesday\", \"Thursday\", \"Friday\", \"Saturday\"]', 0, 'active', '2026-09-02 12:18:55', '2026-09-17 13:11:47', NULL, NULL, NULL),
(261, 2, '[1]', 101, 'EMP-1028', '9876543210', NULL, 'Seema', 'Deshpande', 'Female', NULL, NULL, NULL, NULL, NULL, NULL, 'Non-Teaching', 'Branch Admin', 'Administration', '2025-04-09', 'full_time', 'active', NULL, NULL, 'Monthly', 48000.00, '2025-04-09', NULL, NULL, NULL, 0, 0, NULL, NULL, NULL, NULL, NULL, NULL, 0, 'active', '2026-09-09 14:45:12', '2026-09-17 13:11:47', NULL, NULL, NULL),
(263, 2, '[1]', 601, 'EMP-1030', '9876543101', NULL, 'Priya', 'Kulkarni', 'Female', NULL, NULL, NULL, NULL, NULL, NULL, 'Non-Teaching', 'Senior Counsellor', 'Admissions & Counselling', '2025-04-14', 'full_time', 'active', NULL, NULL, 'Monthly', 38000.00, '2025-04-14', NULL, NULL, NULL, 0, 0, NULL, NULL, NULL, NULL, NULL, NULL, 0, 'active', '2026-09-09 14:45:12', '2026-09-17 13:11:47', NULL, NULL, NULL),
(264, 2, '[1]', 602, 'EMP-1031', '9876543102', NULL, 'Nitin', 'Bhandari', 'Male', NULL, NULL, NULL, NULL, NULL, NULL, 'Non-Teaching', 'Accounts Executive', 'Finance & Accounts', '2025-04-16', 'full_time', 'active', NULL, NULL, 'Monthly', 35000.00, '2025-04-16', NULL, NULL, NULL, 0, 0, NULL, NULL, NULL, NULL, NULL, NULL, 0, 'active', '2026-09-09 14:45:12', '2026-09-17 13:11:47', NULL, NULL, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `staff_salary_payments`
--

DROP TABLE IF EXISTS `staff_salary_payments`;
CREATE TABLE IF NOT EXISTS `staff_salary_payments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL,
  `branch_id` int NOT NULL,
  `staff_id` int NOT NULL,
  `salary_month` tinyint NOT NULL,
  `salary_year` smallint NOT NULL,
  `amount` decimal(12,2) NOT NULL,
  `paid_date` date NOT NULL,
  `payment_mode` varchar(50) NOT NULL DEFAULT 'bank_transfer',
  `reference` varchar(150) DEFAULT NULL,
  `remarks` text,
  `created_by` int DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_staff_month_year` (`tenant_id`,`branch_id`,`staff_id`,`salary_month`,`salary_year`),
  KEY `fk_ssp_branch` (`branch_id`),
  KEY `fk_ssp_staff` (`staff_id`),
  KEY `idx_ssp_branch_period` (`tenant_id`,`branch_id`,`salary_year`,`salary_month`),
  KEY `idx_ssp_staff_history` (`tenant_id`,`staff_id`,`paid_date` DESC)
) ENGINE=InnoDB AUTO_INCREMENT=614 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `staff_salary_payments`
--

INSERT INTO `staff_salary_payments` (`id`, `tenant_id`, `branch_id`, `staff_id`, `salary_month`, `salary_year`, `amount`, `paid_date`, `payment_mode`, `reference`, `remarks`, `created_by`, `created_at`, `updated_at`, `deleted_at`) VALUES
(1, 2, 1, 14, 9, 2026, 38000.00, '2026-09-16', 'bank_transfer', 'TXN-SEP-998811', 'September 2026 Staff Salary Disbursal', 1, '2026-09-16 10:56:28', '2026-09-16 10:56:28', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `students`
--

DROP TABLE IF EXISTS `students`;
CREATE TABLE IF NOT EXISTS `students` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL,
  `user_id` int DEFAULT NULL,
  `primary_branch_id` int NOT NULL,
  `student_code` varchar(50) DEFAULT NULL,
  `full_name` varchar(255) NOT NULL,
  `dob` date DEFAULT NULL,
  `gender` varchar(20) DEFAULT NULL,
  `mobile` varchar(20) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `street` varchar(255) DEFAULT NULL,
  `city` varchar(100) DEFAULT NULL,
  `state` varchar(100) DEFAULT NULL,
  `pincode` varchar(20) DEFAULT NULL,
  `category` varchar(50) DEFAULT NULL,
  `school_name` varchar(255) DEFAULT NULL,
  `current_class` varchar(50) DEFAULT NULL,
  `board_id` int DEFAULT NULL,
  `target_exam` varchar(100) DEFAULT NULL,
  `year_of_attempt` varchar(20) DEFAULT NULL,
  `blood_group` varchar(10) DEFAULT NULL,
  `profile_photo_url` text,
  `status` tinyint NOT NULL DEFAULT '3' COMMENT '0=inactive, 1=active, 2=deleted, 3=reg_pending, 4=docs_submitted, 5=docs_verified, 6=pending_batch, 7=batch_allocated, 8=payment_pending, 9=on_hold, 10=passed_out',
  `account_type` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` datetime DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_students_code` (`tenant_id`,`student_code`),
  KEY `user_id` (`user_id`),
  KEY `primary_branch_id` (`primary_branch_id`),
  KEY `board_id` (`board_id`),
  KEY `idx_students_tenant` (`tenant_id`),
  KEY `idx_students_branch` (`tenant_id`,`primary_branch_id`),
  KEY `idx_students_status` (`tenant_id`,`status`),
  KEY `idx_students_account_type` (`tenant_id`,`account_type`)
) ENGINE=InnoDB AUTO_INCREMENT=182 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `students`
--

INSERT INTO `students` (`id`, `tenant_id`, `user_id`, `primary_branch_id`, `student_code`, `full_name`, `dob`, `gender`, `mobile`, `email`, `street`, `city`, `state`, `pincode`, `category`, `school_name`, `current_class`, `board_id`, `target_exam`, `year_of_attempt`, `blood_group`, `profile_photo_url`, `status`, `account_type`, `created_at`, `updated_at`, `deleted_at`, `created_by`, `updated_by`) VALUES
(3, 2, 228, 1, 'STU-2026-0003', 'Rohan Deshpande', '2008-03-10', 'Male', '9988776655', 'rohan.deshpande@gmail.com', NULL, 'Pune', 'Maharashtra', '411038', 'General', NULL, 'Class 11', NULL, 'JEE', NULL, 'B+', NULL, 1, 1, '2026-09-07 12:59:23', '2026-10-05 12:08:01', NULL, 2, 2);

-- --------------------------------------------------------

--
-- Table structure for table `student_documents`
--

DROP TABLE IF EXISTS `student_documents`;
CREATE TABLE IF NOT EXISTS `student_documents` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL,
  `student_id` int NOT NULL,
  `document_type_id` int NOT NULL,
  `storage_key` text NOT NULL,
  `file_name` varchar(255) NOT NULL,
  `mime_type` varchar(100) DEFAULT NULL,
  `status` tinyint NOT NULL DEFAULT '0' COMMENT '0=verification_pending, 1=verified, 2=rejected',
  `verified_by` int DEFAULT NULL,
  `verified_at` datetime DEFAULT NULL,
  `rejection_reason` text,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` datetime DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `tenant_id` (`tenant_id`),
  KEY `student_id` (`student_id`),
  KEY `document_type_id` (`document_type_id`),
  KEY `verified_by` (`verified_by`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `student_documents`
--

INSERT INTO `student_documents` (`id`, `tenant_id`, `student_id`, `document_type_id`, `storage_key`, `file_name`, `mime_type`, `status`, `verified_by`, `verified_at`, `rejection_reason`, `created_at`, `updated_at`, `deleted_at`, `created_by`, `updated_by`) VALUES
(1, 2, 3, 1, '/uploads/documents/177-1789651281405-student_photo.jpg', 'student_photo.jpg', 'image/jpeg', 1, 101, '2026-09-17 18:52:08', NULL, '2026-09-17 18:51:21', '2026-09-17 18:52:08', NULL, 1, 1);

-- --------------------------------------------------------

--
-- Table structure for table `student_doubts`
--

DROP TABLE IF EXISTS `student_doubts`;
CREATE TABLE IF NOT EXISTS `student_doubts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL,
  `branch_id` int DEFAULT NULL,
  `batch_id` int NOT NULL,
  `student_id` int NOT NULL,
  `subject_id` int NOT NULL,
  `assigned_teacher_id` int NOT NULL,
  `topic` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` tinyint NOT NULL DEFAULT '0' COMMENT '0=Open, 1=In Progress, 2=Resolved, 3=Reopened',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_doubt_student_status` (`tenant_id`,`student_id`,`status`),
  KEY `idx_doubt_teacher_status` (`tenant_id`,`assigned_teacher_id`,`status`),
  KEY `idx_doubt_batch_subject` (`tenant_id`,`batch_id`,`subject_id`),
  KEY `idx_doubt_teacher_updated` (`tenant_id`,`assigned_teacher_id`,`updated_at`),
  KEY `fk_sd_student` (`student_id`),
  KEY `fk_sd_batch` (`batch_id`),
  KEY `fk_sd_subject` (`subject_id`),
  KEY `fk_sd_teacher` (`assigned_teacher_id`)
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `student_doubts`
--

INSERT INTO `student_doubts` (`id`, `tenant_id`, `branch_id`, `batch_id`, `student_id`, `subject_id`, `assigned_teacher_id`, `topic`, `status`, `created_at`, `updated_at`, `deleted_at`) VALUES
(3, 2, 1, 1, 3, 1, 215, 'Hybridization of Xenon Fluorides (XeF4 and XeF6)', 0, '2026-09-15 11:41:23', '2026-09-15 11:41:23', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `student_doubt_replies`
--

DROP TABLE IF EXISTS `student_doubt_replies`;
CREATE TABLE IF NOT EXISTS `student_doubt_replies` (
  `id` int NOT NULL AUTO_INCREMENT,
  `doubt_id` int NOT NULL,
  `sender_user_id` int NOT NULL,
  `sender_role` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `message` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `attachments` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin COMMENT 'Array of relative file URLs e.g. ["/uploads/doubts/abc.jpg"]',
  `is_read` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_reply_doubt_created` (`doubt_id`,`created_at`),
  KEY `idx_reply_doubt_read` (`doubt_id`,`is_read`),
  KEY `fk_sdr_sender` (`sender_user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=36 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `student_doubt_replies`
--

INSERT INTO `student_doubt_replies` (`id`, `doubt_id`, `sender_user_id`, `sender_role`, `message`, `attachments`, `is_read`, `created_at`) VALUES
(9, 3, 228, 'student', 'Sir, in XeF6 why is the geometry considered distorted octahedral instead of regular octahedral? Can you please clarify the stereo-active lone pair position?', '[\"/uploads/doubts/sample_xef6_structure.png\"]', 1, '2026-09-15 11:41:23');

-- --------------------------------------------------------

--
-- Table structure for table `student_enrollments`
--

DROP TABLE IF EXISTS `student_enrollments`;
CREATE TABLE IF NOT EXISTS `student_enrollments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL,
  `branch_id` int NOT NULL,
  `student_id` int NOT NULL,
  `batch_id` int NOT NULL,
  `bundle_id` int DEFAULT NULL,
  `subject_selection_type` enum('bundle','custom') NOT NULL DEFAULT 'bundle',
  `custom_subject_ids` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin,
  `academic_year_id` int NOT NULL,
  `enrolled_date` date NOT NULL,
  `status` varchar(30) NOT NULL DEFAULT 'active',
  `promoted_from_enrollment_id` int DEFAULT NULL,
  `app_access_enabled` tinyint(1) NOT NULL DEFAULT '0',
  `notes` text,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` datetime DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `student_id` (`student_id`,`batch_id`,`academic_year_id`),
  KEY `branch_id` (`branch_id`),
  KEY `academic_year_id` (`academic_year_id`),
  KEY `promoted_from_enrollment_id` (`promoted_from_enrollment_id`),
  KEY `idx_enrollments_branch` (`tenant_id`,`branch_id`),
  KEY `idx_enrollments_student` (`student_id`),
  KEY `idx_enrollments_batch` (`batch_id`,`academic_year_id`,`status`),
  KEY `idx_enrollments_bundle` (`bundle_id`)
) ENGINE=InnoDB AUTO_INCREMENT=181 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `student_enrollments`
--

INSERT INTO `student_enrollments` (`id`, `tenant_id`, `branch_id`, `student_id`, `batch_id`, `bundle_id`, `subject_selection_type`, `custom_subject_ids`, `academic_year_id`, `enrolled_date`, `status`, `promoted_from_enrollment_id`, `app_access_enabled`, `notes`, `created_at`, `updated_at`, `deleted_at`, `created_by`, `updated_by`) VALUES
(3, 2, 1, 3, 1, NULL, 'bundle', NULL, 2, '2026-09-07', 'active', NULL, 0, NULL, '2026-09-07 12:59:23', '2026-09-07 12:59:23', NULL, 2, 2);

-- --------------------------------------------------------

--
-- Table structure for table `student_fee_assignments`
--

DROP TABLE IF EXISTS `student_fee_assignments`;
CREATE TABLE IF NOT EXISTS `student_fee_assignments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL,
  `branch_id` int NOT NULL,
  `student_id` int NOT NULL,
  `enrollment_id` int NOT NULL,
  `fee_source_type` varchar(30) NOT NULL DEFAULT 'program',
  `fee_source_id` int DEFAULT NULL,
  `gross_amount` decimal(10,2) NOT NULL,
  `total_concession` decimal(10,2) NOT NULL DEFAULT '0.00',
  `net_amount` decimal(10,2) NOT NULL,
  `down_payment` decimal(10,2) NOT NULL DEFAULT '0.00',
  `installment_count` int NOT NULL DEFAULT '1',
  `installment_amount` decimal(10,2) NOT NULL DEFAULT '0.00',
  `paid_amount` decimal(10,2) NOT NULL DEFAULT '0.00',
  `balance_amount` decimal(10,2) NOT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'unpaid',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `created_by` int DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_student_enrollment_fee` (`student_id`,`enrollment_id`),
  KEY `idx_sfa_tenant_branch` (`tenant_id`,`branch_id`),
  KEY `idx_sfa_status` (`tenant_id`,`status`)
) ENGINE=InnoDB AUTO_INCREMENT=180 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `student_fee_assignments`
--

INSERT INTO `student_fee_assignments` (`id`, `tenant_id`, `branch_id`, `student_id`, `enrollment_id`, `fee_source_type`, `fee_source_id`, `gross_amount`, `total_concession`, `net_amount`, `down_payment`, `installment_count`, `installment_amount`, `paid_amount`, `balance_amount`, `status`, `created_at`, `updated_at`, `created_by`, `updated_by`) VALUES
(4, 2, 1, 3, 3, 'program', 1, 120000.00, 20000.00, 100000.00, 25000.00, 6, 12500.00, 75000.00, 25000.00, 'partial', '2026-09-07 13:28:10', '2026-09-07 13:28:10', 1, 1);

-- --------------------------------------------------------

--
-- Table structure for table `student_guardians`
--

DROP TABLE IF EXISTS `student_guardians`;
CREATE TABLE IF NOT EXISTS `student_guardians` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL,
  `student_id` int NOT NULL,
  `guardian_id` int NOT NULL,
  `is_primary` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `student_id` (`student_id`,`guardian_id`),
  KEY `tenant_id` (`tenant_id`),
  KEY `guardian_id` (`guardian_id`)
) ENGINE=InnoDB AUTO_INCREMENT=179 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `student_guardians`
--

INSERT INTO `student_guardians` (`id`, `tenant_id`, `student_id`, `guardian_id`, `is_primary`, `created_at`) VALUES
(3, 2, 3, 3, 1, '2026-09-07 12:59:23');

-- --------------------------------------------------------

--
-- Table structure for table `student_invoices`
--

DROP TABLE IF EXISTS `student_invoices`;
CREATE TABLE IF NOT EXISTS `student_invoices` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL,
  `branch_id` int NOT NULL,
  `student_id` int NOT NULL,
  `enrollment_id` int NOT NULL,
  `fee_assignment_id` int NOT NULL,
  `invoice_number` varchar(50) NOT NULL,
  `installment_number` int NOT NULL DEFAULT '0',
  `description` varchar(255) DEFAULT NULL,
  `issue_date` date NOT NULL,
  `due_date` date NOT NULL,
  `payment_date` datetime DEFAULT NULL,
  `amount` decimal(10,2) NOT NULL,
  `paid_amount` decimal(10,2) NOT NULL DEFAULT '0.00',
  `balance_due` decimal(10,2) NOT NULL,
  `payment_mode` varchar(50) DEFAULT NULL,
  `transaction_reference` varchar(100) DEFAULT NULL,
  `remarks` text,
  `status` varchar(20) NOT NULL DEFAULT 'unpaid',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `created_by` int DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `invoice_number` (`invoice_number`),
  KEY `idx_si_student` (`student_id`),
  KEY `idx_si_fee_assignment` (`fee_assignment_id`),
  KEY `idx_si_tenant_status` (`tenant_id`,`status`),
  KEY `idx_si_due_date` (`tenant_id`,`due_date`)
) ENGINE=InnoDB AUTO_INCREMENT=1204 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `student_invoices`
--

INSERT INTO `student_invoices` (`id`, `tenant_id`, `branch_id`, `student_id`, `enrollment_id`, `fee_assignment_id`, `invoice_number`, `installment_number`, `description`, `issue_date`, `due_date`, `payment_date`, `amount`, `paid_amount`, `balance_due`, `payment_mode`, `transaction_reference`, `remarks`, `status`, `created_at`, `updated_at`, `created_by`, `updated_by`) VALUES
(16, 2, 1, 3, 3, 1, 'INV-2-3-DP', 0, 'Admission Downpayment', '2026-09-06', '2026-09-06', '2026-09-06 00:00:00', 25000.00, 25000.00, 0.00, 'UPI', 'UPI-6459193073', 'Downpayment cleared at admission', 'paid', '2026-09-07 13:28:10', '2026-09-07 13:28:10', 1, 1);

-- --------------------------------------------------------

--
-- Table structure for table `student_invoices_deleted_backup`
--

DROP TABLE IF EXISTS `student_invoices_deleted_backup`;
CREATE TABLE IF NOT EXISTS `student_invoices_deleted_backup` (
  `id` int NOT NULL DEFAULT '0',
  `tenant_id` int NOT NULL,
  `branch_id` int NOT NULL,
  `student_id` int NOT NULL,
  `enrollment_id` int NOT NULL,
  `fee_assignment_id` int NOT NULL,
  `invoice_number` varchar(50) NOT NULL,
  `installment_number` int NOT NULL DEFAULT '0',
  `description` varchar(255) DEFAULT NULL,
  `issue_date` date NOT NULL,
  `due_date` date NOT NULL,
  `payment_date` datetime DEFAULT NULL,
  `amount` decimal(10,2) NOT NULL,
  `paid_amount` decimal(10,2) NOT NULL DEFAULT '0.00',
  `balance_due` decimal(10,2) NOT NULL,
  `payment_mode` varchar(50) DEFAULT NULL,
  `transaction_reference` varchar(100) DEFAULT NULL,
  `remarks` text,
  `status` varchar(20) NOT NULL DEFAULT 'unpaid',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `created_by` int DEFAULT NULL,
  `updated_by` int DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `subjects`
--

DROP TABLE IF EXISTS `subjects`;
CREATE TABLE IF NOT EXISTS `subjects` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL,
  `name` varchar(255) NOT NULL,
  `code` varchar(50) DEFAULT NULL,
  `type` varchar(50) NOT NULL DEFAULT 'core',
  `description` text,
  `status` enum('active','inactive','deleted') NOT NULL DEFAULT 'active',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` datetime DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `tenant_id` (`tenant_id`,`code`)
) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `subjects`
--

INSERT INTO `subjects` (`id`, `tenant_id`, `name`, `code`, `type`, `description`, `status`, `created_at`, `updated_at`, `deleted_at`, `created_by`, `updated_by`) VALUES
(1, 2, 'Physics', 'PHY-101', 'core', 'Basic principles of Physics.', 'active', '2026-09-02 12:18:55', '2026-09-02 12:18:55', NULL, 2, 2);

-- --------------------------------------------------------

--
-- Table structure for table `subject_bundles`
--

DROP TABLE IF EXISTS `subject_bundles`;
CREATE TABLE IF NOT EXISTS `subject_bundles` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL,
  `branch_id` int NOT NULL,
  `level_id` int DEFAULT NULL,
  `name` varchar(255) NOT NULL,
  `description` text,
  `fee_amount` decimal(10,2) DEFAULT NULL,
  `subject_ids` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin,
  `fee_plan_id` int DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` datetime DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_subject_bundles_level_name` (`level_id`,`name`),
  KEY `tenant_id` (`tenant_id`),
  KEY `branch_id` (`branch_id`),
  KEY `fee_plan_id` (`fee_plan_id`),
  KEY `idx_subject_bundles_level` (`level_id`)
) ENGINE=InnoDB AUTO_INCREMENT=46 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `subject_bundles`
--

INSERT INTO `subject_bundles` (`id`, `tenant_id`, `branch_id`, `level_id`, `name`, `description`, `fee_amount`, `subject_ids`, `fee_plan_id`, `is_active`, `created_at`, `updated_at`, `deleted_at`, `created_by`, `updated_by`) VALUES
(3, 2, 1, 1, 'All Subjects', 'All subjects mapped to this level', 150000.00, '[1, 2, 3]', NULL, 1, '2026-09-07 11:31:58', '2026-09-07 13:27:00', NULL, 1, 2);

-- --------------------------------------------------------

--
-- Table structure for table `subject_fees`
--

DROP TABLE IF EXISTS `subject_fees`;
CREATE TABLE IF NOT EXISTS `subject_fees` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL,
  `level_id` int NOT NULL,
  `subject_id` int NOT NULL,
  `fee_amount` decimal(10,2) NOT NULL DEFAULT '0.00',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` datetime DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_subject_fees_level_subject` (`level_id`,`subject_id`),
  KEY `tenant_id` (`tenant_id`),
  KEY `subject_id` (`subject_id`)
) ENGINE=InnoDB AUTO_INCREMENT=41 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `subject_fees`
--

INSERT INTO `subject_fees` (`id`, `tenant_id`, `level_id`, `subject_id`, `fee_amount`, `created_at`, `updated_at`, `deleted_at`, `created_by`, `updated_by`) VALUES
(1, 2, 1, 1, 20000.00, '2026-09-07 13:13:31', '2026-09-07 13:13:31', NULL, 2, 2);

-- --------------------------------------------------------

--
-- Table structure for table `subscription_plans`
--

DROP TABLE IF EXISTS `subscription_plans`;
CREATE TABLE IF NOT EXISTS `subscription_plans` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `code` varchar(50) NOT NULL,
  `description` text,
  `status` enum('Active','Inactive','Deleted') NOT NULL DEFAULT 'Active',
  `display_order` int NOT NULL DEFAULT '0',
  `notes` text,
  `visible_to` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin,
  `monthly_price` decimal(10,2) DEFAULT '0.00',
  `quarterly_price` decimal(10,2) DEFAULT '0.00',
  `half_yearly_price` decimal(10,2) DEFAULT '0.00',
  `yearly_price` decimal(10,2) DEFAULT '0.00',
  `lifetime_price` decimal(10,2) DEFAULT '0.00',
  `currency` varchar(10) DEFAULT 'INR',
  `trial_days` int DEFAULT '0',
  `trial_period_days` int NOT NULL DEFAULT '0',
  `setup_fee` decimal(10,2) DEFAULT '0.00',
  `auto_renewal` tinyint(1) DEFAULT '0',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` datetime DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `code` (`code`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `subscription_plans`
--

INSERT INTO `subscription_plans` (`id`, `name`, `code`, `description`, `status`, `display_order`, `notes`, `visible_to`, `monthly_price`, `quarterly_price`, `half_yearly_price`, `yearly_price`, `lifetime_price`, `currency`, `trial_days`, `trial_period_days`, `setup_fee`, `auto_renewal`, `created_at`, `updated_at`, `deleted_at`, `created_by`, `updated_by`) VALUES
(1, 'Starter Trial', 'STARTER', '14 Days free trial of the platform.', 'Active', 1, 'Initial evaluation plan', '[3]', 0.00, 0.00, 0.00, 0.00, 0.00, 'INR', 14, 0, 0.00, 0, '2026-09-02 12:15:18', '2026-09-28 16:34:45', '2026-09-16 14:09:24', NULL, NULL),
(2, 'Growth Plan', 'GROWTH', 'Perfect for small and growing institutes.', 'Inactive', 2, 'Standard paid plan', '[\"All\"]', 4999.00, 14997.00, 29994.00, 49990.00, 0.00, 'INR', 0, 0, 4999.00, 1, '2026-09-02 12:15:18', '2026-09-22 17:06:04', NULL, NULL, NULL),
(3, 'Pro Enterprise', 'PRO', 'Unlimited scale for large organizations.', 'Active', 3, 'Enterprise high scale plan', NULL, 19999.00, 59997.00, 119994.00, 199990.00, 0.00, 'INR', 0, 0, 0.00, 1, '2026-09-02 12:15:18', '2026-09-02 12:15:18', NULL, NULL, NULL),
(8, 'test', 'YTEST2', 'tuyudhwl', 'Active', 1, '', '[\"All\"]', 10000.00, 0.00, 0.00, 0.00, 0.00, 'INR', 10, 0, 0.00, 1, '2026-09-28 17:09:39', '2026-09-28 17:09:39', NULL, NULL, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `support_replies`
--

DROP TABLE IF EXISTS `support_replies`;
CREATE TABLE IF NOT EXISTS `support_replies` (
  `id` int NOT NULL AUTO_INCREMENT,
  `ticket_id` int NOT NULL,
  `sender_id` int DEFAULT NULL,
  `sender_role` enum('tenant','staff') NOT NULL DEFAULT 'tenant',
  `sender_type` varchar(50) DEFAULT NULL,
  `is_from_staff` tinyint(1) NOT NULL DEFAULT '0',
  `message` text NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `attachment_url` varchar(500) DEFAULT NULL,
  `attachment_name` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_support_replies_ticket` (`ticket_id`),
  KEY `idx_support_replies_sender` (`sender_id`)
) ENGINE=InnoDB AUTO_INCREMENT=40 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `support_replies`
--

INSERT INTO `support_replies` (`id`, `ticket_id`, `sender_id`, `sender_role`, `sender_type`, `is_from_staff`, `message`, `created_at`, `attachment_url`, `attachment_name`) VALUES
(1, 1, 2, 'tenant', 'INSTITUTE_ADMIN', 0, 'The annual renewal invoice for the Pro plan shows a monthly billing cycle. Our account team expects the annual amount with the 10% enterprise discount applied. Please verify.', '2026-08-24 10:15:00', NULL, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `support_tickets`
--

DROP TABLE IF EXISTS `support_tickets`;
CREATE TABLE IF NOT EXISTS `support_tickets` (
  `id` int NOT NULL AUTO_INCREMENT,
  `ticket_number` varchar(20) NOT NULL,
  `tenant_id` int DEFAULT NULL,
  `branch_id` int DEFAULT NULL,
  `channel` enum('SAAS_SUPPORT','INSTITUTE_SUPPORT') NOT NULL DEFAULT 'SAAS_SUPPORT',
  `subject` varchar(255) NOT NULL,
  `description` text NOT NULL,
  `status` enum('Open','In Progress','Resolved','Closed') NOT NULL DEFAULT 'Open',
  `created_by` int DEFAULT NULL COMMENT 'users.id of the person who raised the ticket',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ticket_number` (`ticket_number`),
  KEY `fk_support_tickets_created_by` (`created_by`),
  KEY `idx_support_tickets_tenant` (`tenant_id`),
  KEY `idx_support_tickets_status` (`status`),
  KEY `idx_support_tickets_created_at` (`created_at`),
  KEY `fk_support_tickets_branch` (`branch_id`),
  KEY `idx_support_tickets_tenant_branch_channel` (`tenant_id`,`branch_id`,`channel`,`status`)
) ENGINE=InnoDB AUTO_INCREMENT=19 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `support_tickets`
--

INSERT INTO `support_tickets` (`id`, `ticket_number`, `tenant_id`, `branch_id`, `channel`, `subject`, `description`, `status`, `created_by`, `created_at`, `updated_at`) VALUES
(1, 'TKT-1001', 2, NULL, 'SAAS_SUPPORT', 'Invoice billing cycle mismatch on renewal', 'The annual renewal invoice for the Pro plan shows a monthly billing cycle. Our account team expects the annual amount with the 10% enterprise discount applied. Please verify.', 'In Progress', 2, '2026-08-24 10:15:00', '2026-09-02 15:43:04');

-- --------------------------------------------------------

--
-- Table structure for table `system_configurations`
--

DROP TABLE IF EXISTS `system_configurations`;
CREATE TABLE IF NOT EXISTS `system_configurations` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL,
  `channel_type` enum('SMS','EMAIL','WHATSAPP') NOT NULL,
  `provider_name` varchar(50) NOT NULL,
  `is_enabled` tinyint(1) DEFAULT '0',
  `credentials` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `sender_id` varchar(50) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `updated_by` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_tenant_channel` (`tenant_id`,`channel_type`),
  KEY `updated_by` (`updated_by`),
  KEY `idx_system_configurations_tenant` (`tenant_id`),
  KEY `idx_system_configurations_channel` (`channel_type`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `system_configurations`
--

INSERT INTO `system_configurations` (`id`, `tenant_id`, `channel_type`, `provider_name`, `is_enabled`, `credentials`, `sender_id`, `created_at`, `updated_at`, `updated_by`) VALUES
(1, 1, 'SMS', 'Twilio', 1, '{\"auth_token\": \"your_twilio_auth_token\", \"test_phone\": \"+919876543210\", \"account_sid\": \"ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx\", \"from_number\": \"+12513095544\", \"api_endpoint\": \"https://api.twilio.com/2010-04-01\"}', 'tstsms', '2026-09-03 11:12:09', '2026-09-03 11:21:08', 1),
(2, 1, 'EMAIL', 'SMTP Server', 1, '{\"from_name\": \"Vidya Setu\", \"smtp_host\": \"smtp.gmail.com\", \"smtp_port\": \"587\", \"encryption\": \"TLS\", \"from_email\": \"noreply@vidyasetu.com\", \"test_email\": \"test@example.com\", \"smtp_password\": \"your_smtp_password\", \"smtp_username\": \"noreply@vidyasetu.com\", \"reply_to_email\": \"support@vidyasetu.com\"}', NULL, '2026-09-03 11:12:09', '2026-09-03 11:12:09', NULL),
(3, 1, 'WHATSAPP', 'Meta Cloud API', 1, '{\"auth_token\": \"your_whatsapp_auth_token\", \"test_phone\": \"+919876543210\", \"webhook_url\": \"https://your-domain.com/webhook/whatsapp\", \"api_endpoint\": \"https://ispl10.chatbot.team/wa/v2/messages/send\", \"webhook_verify_token\": \"whatsapp_verify_token_xyz123\"}', NULL, '2026-09-03 11:12:09', '2026-09-03 11:22:26', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `teacher_allocations`
--

DROP TABLE IF EXISTS `teacher_allocations`;
CREATE TABLE IF NOT EXISTS `teacher_allocations` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL,
  `branch_id` int NOT NULL,
  `academic_year_id` int NOT NULL,
  `batch_id` int NOT NULL,
  `teacher_user_id` int NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` datetime DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `batch_id` (`batch_id`,`teacher_user_id`),
  UNIQUE KEY `uq_teacher_batch` (`tenant_id`,`batch_id`,`teacher_user_id`),
  KEY `tenant_id` (`tenant_id`),
  KEY `branch_id` (`branch_id`),
  KEY `academic_year_id` (`academic_year_id`),
  KEY `teacher_user_id` (`teacher_user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=108 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `teacher_allocations`
--

INSERT INTO `teacher_allocations` (`id`, `tenant_id`, `branch_id`, `academic_year_id`, `batch_id`, `teacher_user_id`, `created_at`, `updated_at`, `deleted_at`, `created_by`, `updated_by`) VALUES
(91, 2, 1, 2, 1, 215, '2026-09-15 10:56:38', '2026-09-15 10:56:38', NULL, NULL, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `teacher_availability`
--

DROP TABLE IF EXISTS `teacher_availability`;
CREATE TABLE IF NOT EXISTS `teacher_availability` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL,
  `branch_id` int NOT NULL,
  `teacher_user_id` int NOT NULL,
  `day_of_week` int NOT NULL,
  `start_time` time NOT NULL,
  `end_time` time NOT NULL,
  `is_available` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` datetime DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `tenant_id` (`tenant_id`),
  KEY `branch_id` (`branch_id`),
  KEY `teacher_user_id` (`teacher_user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `teacher_capabilities`
--

DROP TABLE IF EXISTS `teacher_capabilities`;
CREATE TABLE IF NOT EXISTS `teacher_capabilities` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL,
  `teacher_user_id` int NOT NULL,
  `capability_type` enum('course','program','level') NOT NULL,
  `entity_id` int NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `tenant_id` (`tenant_id`,`teacher_user_id`,`capability_type`,`entity_id`),
  KEY `teacher_user_id` (`teacher_user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `teacher_subjects`
--

DROP TABLE IF EXISTS `teacher_subjects`;
CREATE TABLE IF NOT EXISTS `teacher_subjects` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL,
  `teacher_user_id` int NOT NULL,
  `subject_id` int NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `tenant_id` (`tenant_id`,`teacher_user_id`,`subject_id`),
  KEY `teacher_user_id` (`teacher_user_id`),
  KEY `subject_id` (`subject_id`)
) ENGINE=InnoDB AUTO_INCREMENT=285 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `tenants`
--

DROP TABLE IF EXISTS `tenants`;
CREATE TABLE IF NOT EXISTS `tenants` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `slug` varchar(100) NOT NULL,
  `code` varchar(50) NOT NULL,
  `tenant_type` enum('master','customer') NOT NULL DEFAULT 'customer',
  `status` tinyint NOT NULL DEFAULT '1' COMMENT '0=inactive, 1=active, 2=draft, 3=deleted',
  `owner_name` varchar(255) NOT NULL,
  `primary_email` varchar(255) NOT NULL,
  `owner_mobile` varchar(20) DEFAULT NULL,
  `address_line1` varchar(255) DEFAULT NULL,
  `city` varchar(100) DEFAULT NULL,
  `state` varchar(100) DEFAULT NULL,
  `pincode` varchar(10) DEFAULT NULL,
  `country` varchar(100) DEFAULT 'India',
  `gst_number` varchar(20) DEFAULT NULL,
  `pan_number` varchar(15) DEFAULT NULL,
  `logo_url` text,
  `primary_color` varchar(7) DEFAULT NULL,
  `timezone` varchar(50) DEFAULT 'Asia/Kolkata',
  `website` varchar(255) DEFAULT NULL,
  `alternate_emails` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin,
  `plan_id` int DEFAULT NULL,
  `subscription_status` varchar(20) DEFAULT 'active',
  `billing_cycle` varchar(10) DEFAULT 'annual',
  `start_date` date DEFAULT NULL,
  `end_date` date DEFAULT NULL,
  `renewal_date` date DEFAULT NULL,
  `trial_ends_at` date DEFAULT NULL,
  `subscription_notes` text,
  `subscription_discount` decimal(5,2) DEFAULT NULL,
  `subscription_final_price` decimal(10,2) DEFAULT NULL,
  `subscription_tax` decimal(5,2) DEFAULT NULL,
  `subscription_invoice_number` varchar(100) DEFAULT NULL,
  `override_max_branches` int DEFAULT NULL,
  `override_max_staff_users` int DEFAULT NULL,
  `override_max_students` int DEFAULT NULL,
  `override_max_parents` int DEFAULT NULL,
  `override_max_teachers` int DEFAULT NULL,
  `override_max_storage` varchar(50) DEFAULT NULL,
  `override_max_file_size` varchar(50) DEFAULT NULL,
  `override_max_sms_credits` int DEFAULT NULL,
  `override_max_whatsapp_msgs` int DEFAULT NULL,
  `primary_admin_user_id` int DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` datetime DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  `source_lead_id` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `slug` (`slug`),
  UNIQUE KEY `code` (`code`),
  KEY `fk_tenants_plan_id` (`plan_id`),
  KEY `fk_tenants_primary_admin` (`primary_admin_user_id`),
  KEY `idx_tenants_source_lead` (`source_lead_id`)
) ENGINE=InnoDB AUTO_INCREMENT=18 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `tenants`
--

INSERT INTO `tenants` (`id`, `name`, `slug`, `code`, `tenant_type`, `status`, `owner_name`, `primary_email`, `owner_mobile`, `address_line1`, `city`, `state`, `pincode`, `country`, `gst_number`, `pan_number`, `logo_url`, `primary_color`, `timezone`, `website`, `alternate_emails`, `plan_id`, `subscription_status`, `billing_cycle`, `start_date`, `end_date`, `renewal_date`, `trial_ends_at`, `subscription_notes`, `subscription_discount`, `subscription_final_price`, `subscription_tax`, `subscription_invoice_number`, `override_max_branches`, `override_max_staff_users`, `override_max_students`, `override_max_parents`, `override_max_teachers`, `override_max_storage`, `override_max_file_size`, `override_max_sms_credits`, `override_max_whatsapp_msgs`, `primary_admin_user_id`, `created_at`, `updated_at`, `deleted_at`, `created_by`, `updated_by`, `source_lead_id`) VALUES
(1, 'Vidyasetu HQ', 'master', 'MASTER', 'master', 1, '', '', NULL, NULL, NULL, NULL, NULL, 'India', NULL, NULL, NULL, NULL, 'Asia/Kolkata', NULL, NULL, NULL, 'active', 'annual', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-09-02 12:18:55', '2026-09-16 13:20:40', NULL, NULL, NULL, NULL),
(2, 'Allen Career Institute', 'allen', 'ALLEN', 'customer', 1, 'Rajesh Maheshwari', 'owner@allen.ac.in', '9876543210', 'Indra Vihar', 'Kota', 'Rajasthan', '324005', 'India', '22AAAAA0000A1Z5', 'AAAAA0000A', '/uploads/tenants/logo/allen-1789544969232-422964412.png', '#0047AB', 'Asia/Kolkata', 'https://allen.ac.in', '[\"support@allen.ac.in\",\"billing@allen.ac.in\"]', 8, 'active', 'yearly', '2026-09-02', '2027-09-02', '2027-09-02', NULL, 'Premium customer', 10.00, 120000.00, 18.00, 'INV-2026-0012', 1, NULL, 50000, 250, 1200, '500 GB', NULL, NULL, NULL, NULL, '2026-09-02 12:18:55', '2026-09-29 17:54:28', NULL, NULL, NULL, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `tenant_module_overrides`
--

DROP TABLE IF EXISTS `tenant_module_overrides`;
CREATE TABLE IF NOT EXISTS `tenant_module_overrides` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL,
  `module_id` int NOT NULL,
  `is_enabled` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` datetime DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `tenant_id` (`tenant_id`,`module_id`),
  KEY `module_id` (`module_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `topics`
--

DROP TABLE IF EXISTS `topics`;
CREATE TABLE IF NOT EXISTS `topics` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL,
  `level_subject_id` int NOT NULL,
  `name` varchar(255) NOT NULL,
  `description` text,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` datetime DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `tenant_id` (`tenant_id`),
  KEY `level_subject_id` (`level_subject_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
CREATE TABLE IF NOT EXISTS `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL,
  `name` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `mobile` varchar(20) DEFAULT NULL,
  `password_hash` varchar(255) DEFAULT NULL,
  `user_type` varchar(20) NOT NULL,
  `status` enum('active','inactive','suspended','deleted') NOT NULL DEFAULT 'active',
  `app_access_suspended` tinyint(1) NOT NULL DEFAULT '0',
  `must_change_password` tinyint(1) NOT NULL DEFAULT '0',
  `password_generated_at` datetime DEFAULT NULL,
  `last_login_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` datetime DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_users_email` (`tenant_id`,`email`),
  UNIQUE KEY `idx_users_mobile` (`tenant_id`,`mobile`),
  KEY `idx_users_tenant` (`tenant_id`),
  KEY `idx_users_type` (`tenant_id`,`user_type`),
  KEY `idx_users_status` (`tenant_id`,`status`),
  KEY `idx_users_email_only` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=637 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `tenant_id`, `name`, `email`, `mobile`, `password_hash`, `user_type`, `status`, `app_access_suspended`, `must_change_password`, `password_generated_at`, `last_login_at`, `created_at`, `updated_at`, `deleted_at`, `created_by`, `updated_by`) VALUES
(1, 1, 'Super Admin', 'admin@vidyasetu.com', NULL, '$2b$10$mljJbbol8srLoOUDDN4IouKmRL7rq5Nj0gMcWQptqmolmSpsMgw2C', 'saas_admin', 'active', 0, 0, NULL, NULL, '2026-09-02 12:18:55', '2026-09-28 11:15:14', NULL, NULL, NULL),
(2, 2, 'Allen Admin', 'owner@allen.ac.in', NULL, '$2b$10$B/wQ2JFjVAM0vak3dslV.OhHMrmwD3GDMrjWJCRcZhOqgJF5qMNLm', 'staff', 'active', 0, 0, NULL, NULL, '2026-09-02 12:18:55', '2026-10-01 12:24:02', NULL, NULL, 1),
(101, 2, 'Seema Deshpande', 'seema@allen.com', '9876543210', '$2b$10$Z4YkurlO0ge5MQfOvPhQfePRWe1wJBnkDO0vLjU1innVIQNHpoG66', 'staff', 'active', 0, 0, NULL, NULL, '2026-09-02 12:18:55', '2026-09-09 15:59:03', NULL, 2, 2),
(215, 2, 'Rajesh Mishra', 'rajesh.mishra215@vidyasetu.com', '9876543013', '$2b$10$32hBv4VDCi.Dxaiuxa2JhuanYvOfjC7JN1JzW1u0jdDkshqHv3Wlm', 'staff', 'active', 0, 0, NULL, NULL, '2026-09-02 12:18:55', '2026-09-10 16:06:10', NULL, NULL, NULL),
(228, 2, 'Rohan Deshpande', 'rohan.deshpande@gmail.com', '9988776655', '$2b$10$LPdmkVaKIRyu5cJ5sPk7.OnH5qbypJ4zV0fr4gyGbQBnOz3ksKdT6', 'student', 'active', 0, 0, NULL, '2026-10-12 14:50:13', '2026-09-07 12:59:23', '2026-10-12 14:50:13', NULL, NULL, NULL),
(229, 2, 'Milind Deshpande', 'parent.9988770011@parent.vidyasetu.com', '9988770011', '$2b$10$G7BUtc/tpLb.ucPDvE52nOe7NHBheUCQ1eoZMfCYE9CZ9PuEV2m06', 'parent', 'active', 0, 0, NULL, '2026-10-05 16:29:01', '2026-09-07 12:59:23', '2026-10-05 16:29:01', NULL, NULL, NULL),
(601, 2, 'Priya Kulkarni', 'priya.counsel@allen.com', '9876543101', '$2b$10$coCXK0VMXrq8RxBOaXydvOelWkzFM1ZVeGmHCw8g1hCFq.jZt2vsi', 'staff', 'active', 0, 0, NULL, NULL, '2026-09-09 14:45:12', '2026-09-22 16:05:37', NULL, 2, 2),
(602, 2, 'Nitin Bhandari', 'nitin.finance@allen.com', '9876543102', '$2b$10$c5a4XUhHVjbiqgNi3lsIueYCZxwbl2F.JzAghGpFhTwNKQZxyBIr6', 'finance', 'active', 0, 0, NULL, NULL, '2026-09-09 14:45:12', '2026-09-16 15:51:24', NULL, 2, 1);

-- --------------------------------------------------------

--
-- Table structure for table `user_branch_access`
--

DROP TABLE IF EXISTS `user_branch_access`;
CREATE TABLE IF NOT EXISTS `user_branch_access` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL,
  `user_id` int NOT NULL,
  `branch_id` int NOT NULL,
  `is_primary` tinyint(1) NOT NULL DEFAULT '0',
  `granted_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `granted_by` int DEFAULT NULL,
  `revoked_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_id` (`user_id`,`branch_id`),
  KEY `tenant_id` (`tenant_id`),
  KEY `branch_id` (`branch_id`),
  KEY `granted_by` (`granted_by`)
) ENGINE=InnoDB AUTO_INCREMENT=309 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `user_branch_access`
--

INSERT INTO `user_branch_access` (`id`, `tenant_id`, `user_id`, `branch_id`, `is_primary`, `granted_at`, `granted_by`, `revoked_at`) VALUES
(1, 2, 101, 1, 1, '2026-09-02 12:18:55', 2, NULL),
(17, 2, 215, 1, 0, '2026-09-02 12:18:55', NULL, NULL),
(294, 2, 601, 1, 0, '2026-09-09 14:45:12', 2, NULL),
(295, 2, 602, 1, 0, '2026-09-09 14:45:12', 2, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `user_roles`
--

DROP TABLE IF EXISTS `user_roles`;
CREATE TABLE IF NOT EXISTS `user_roles` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `role_id` int NOT NULL,
  `assigned_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `assigned_by` int DEFAULT NULL,
  `revoked_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_user_roles` (`user_id`,`role_id`),
  KEY `role_id` (`role_id`),
  KEY `assigned_by` (`assigned_by`)
) ENGINE=InnoDB AUTO_INCREMENT=490 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `user_roles`
--

INSERT INTO `user_roles` (`id`, `user_id`, `role_id`, `assigned_at`, `assigned_by`, `revoked_at`) VALUES
(1, 1, 1, '2026-09-02 12:18:55', NULL, NULL),
(3, 101, 3, '2026-09-02 12:18:55', 2, NULL),
(29, 2, 2, '2026-09-02 17:56:27', 1, NULL),
(55, 228, 8, '2026-09-07 12:59:23', 2, NULL),
(56, 229, 7, '2026-09-07 12:59:23', 2, NULL),
(449, 601, 4, '2026-09-09 14:45:12', 2, NULL),
(450, 602, 6, '2026-09-09 14:45:12', 2, NULL),
(467, 215, 5, '2026-09-15 10:56:38', NULL, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `user_sessions`
--

DROP TABLE IF EXISTS `user_sessions`;
CREATE TABLE IF NOT EXISTS `user_sessions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `tenant_id` int NOT NULL,
  `refresh_token_hash` varchar(255) NOT NULL,
  `device_id` int DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` text,
  `expires_at` datetime NOT NULL,
  `revoked_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `tenant_id` (`tenant_id`),
  KEY `device_id` (`device_id`),
  KEY `idx_sessions_user` (`user_id`),
  KEY `idx_sessions_token` (`refresh_token_hash`)
) ENGINE=InnoDB AUTO_INCREMENT=305 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `whatsapp_templates`
--

DROP TABLE IF EXISTS `whatsapp_templates`;
CREATE TABLE IF NOT EXISTS `whatsapp_templates` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL DEFAULT '1' COMMENT 'Default 1 for Vidya Setu master tenant or specific institute tenant_id',
  `template_name` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Display name of WhatsApp template',
  `template_key` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Unique identifier key e.g., FEE_REMINDER_WA',
  `category` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'MARKETING' COMMENT 'Category: MARKETING, UTILITY, AUTHENTICATION, Fee & Billing, Admissions, General',
  `dlt_template_id` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'DLT / Meta WhatsApp Template ID for compliance',
  `header_type` enum('none','text','image','video','document') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'none',
  `header_content` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT 'Header text or rich media asset URL',
  `message_body` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Raw WhatsApp message text with *bold*, _italic_, and {{placeholders}}',
  `footer_text` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Optional WhatsApp footer text',
  `buttons` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin COMMENT 'Array of quick action / call-to-action buttons',
  `status` enum('active','inactive','deleted') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `created_by` int DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  `deleted_at` datetime DEFAULT NULL COMMENT 'Soft deletion timestamp',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `variables` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin,
  PRIMARY KEY (`id`),
  UNIQUE KEY `template_key` (`template_key`),
  KEY `idx_tenant` (`tenant_id`),
  KEY `idx_category` (`category`),
  KEY `idx_status` (`status`),
  KEY `idx_dlt_id` (`dlt_template_id`),
  KEY `idx_deleted` (`deleted_at`)
) ENGINE=InnoDB AUTO_INCREMENT=29 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `whatsapp_templates`
--

INSERT INTO `whatsapp_templates` (`id`, `tenant_id`, `template_name`, `template_key`, `category`, `dlt_template_id`, `header_type`, `header_content`, `message_body`, `footer_text`, `buttons`, `status`, `created_by`, `updated_by`, `deleted_at`, `created_at`, `updated_at`, `variables`) VALUES
(1, 1, 'New Batch Admission Offer', 'WA_NEW_BATCH_ADMISSION', 'MARKETING', 'WA_ADMISSION_2026_01', 'image', 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=800&q=80', 'Greetings {{parent_name}}!\n\nAdmissions are now open for the new *{{course_name}}* batch starting *{{start_date}}* at *{{institute_name}}*.\n\nEarly bird discount of *Rs. {{amount}}* applicable if enrolled before {{due_date}}!', 'Vidya Setu Education Services', '[{\"url\": \"https://vidyasetu.com/enroll\", \"text\": \"Enroll Now\", \"type\": \"URL\"}]', 'active', NULL, NULL, NULL, '2026-09-03 14:14:26', '2026-09-03 14:14:26', NULL),
(2, 1, 'Fee Installment Reminder', 'WA_FEE_INSTALLMENT_REMINDER', 'UTILITY', 'WA_FEE_REMINDER_02', 'text', 'Fee Installment Notice', 'Dear {{parent_name}},\n\nFee installment of *Rs. {{amount}}* for *{{student_name}}* is due on *{{due_date}}*.\n\nKindly pay online to avoid late fee charges. Thank you!', 'Accounts Dept - Vidya Setu', '[{\"url\": \"https://vidyasetu.com/pay\", \"text\": \"Pay Online\", \"type\": \"URL\"}]', 'active', NULL, NULL, NULL, '2026-09-03 14:14:26', '2026-09-03 14:14:26', NULL),
(3, 1, 'WhatsApp OTP Code', 'WA_OTP_SECURITY_CODE', 'AUTHENTICATION', 'WA_OTP_AUTH_03', 'none', NULL, 'Your Vidya Setu security verification OTP code is *{{otp_code}}*.\n\nValid for 10 minutes. Do not share this code with anyone.', 'Vidya Setu Security', NULL, 'active', NULL, NULL, NULL, '2026-09-03 14:14:26', '2026-09-03 14:14:26', NULL),
(4, 1, 'Exam Marks & Performance Report', 'WA_EXAM_MARKS_REPORT', 'UTILITY', 'WA_EXAM_MARKS_04', 'document', 'https://vidyasetu.com/docs/sample_report.pdf', 'Dear {{parent_name}},\n\n*{{student_name}}* scored *{{marks}}/{{max_marks}}* in {{subject_name}} (Test: {{exam_name}}).\n\nOverall Rank: *{{rank}}*. Attached report card details.', 'Vidya Setu Academic Desk', '[{\"url\": \"https://vidyasetu.com/results\", \"text\": \"View Result Portal\", \"type\": \"URL\"}]', 'active', NULL, NULL, NULL, '2026-09-03 14:14:26', '2026-09-03 14:14:26', NULL),
(5, 1, 'Lecture Attendance Notice', 'WA_LECTURE_ABSENTEE_NOTICE', 'UTILITY', 'WA_ATTENDANCE_05', 'text', 'Lecture Absentee Alert', 'Dear {{parent_name}},\n\n*{{student_name}}* was marked *ABSENT* for the {{subject_name}} lecture on *{{lecture_date}}* at {{branch_name}}.\n\nPlease contact administration if unintended.', 'Vidya Setu Attendance Cell', '[{\"text\": \"Call Branch Admin\", \"type\": \"PHONE\", \"phone\": \"+919876543210\"}]', 'inactive', NULL, NULL, NULL, '2026-09-03 14:14:26', '2026-09-03 14:14:26', NULL);

--
-- Constraints for dumped tables
--

--
-- Constraints for table `academic_years`
--
ALTER TABLE `academic_years`
  ADD CONSTRAINT `academic_years_ibfk_1` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`),
  ADD CONSTRAINT `academic_years_ibfk_2` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `admissions`
--
ALTER TABLE `admissions`
  ADD CONSTRAINT `admissions_ibfk_1` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`),
  ADD CONSTRAINT `admissions_ibfk_2` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`),
  ADD CONSTRAINT `admissions_ibfk_3` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `admissions_ibfk_4` FOREIGN KEY (`enquiry_id`) REFERENCES `enquiries` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_admissions_academic_year` FOREIGN KEY (`academic_year_id`) REFERENCES `academic_years` (`id`),
  ADD CONSTRAINT `fk_admissions_enrollment` FOREIGN KEY (`enrollment_id`) REFERENCES `student_enrollments` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `announcements`
--
ALTER TABLE `announcements`
  ADD CONSTRAINT `announcements_ibfk_1` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`),
  ADD CONSTRAINT `announcements_ibfk_2` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`);

--
-- Constraints for table `announcement_audiences`
--
ALTER TABLE `announcement_audiences`
  ADD CONSTRAINT `announcement_audiences_ibfk_1` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`),
  ADD CONSTRAINT `announcement_audiences_ibfk_2` FOREIGN KEY (`announcement_id`) REFERENCES `announcements` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `approval_requests`
--
ALTER TABLE `approval_requests`
  ADD CONSTRAINT `approval_requests_ibfk_1` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `approval_requests_ibfk_2` FOREIGN KEY (`decided_by`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `app_devices`
--
ALTER TABLE `app_devices`
  ADD CONSTRAINT `app_devices_ibfk_1` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`),
  ADD CONSTRAINT `app_devices_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `assignments`
--
ALTER TABLE `assignments`
  ADD CONSTRAINT `assignments_ibfk_1` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`),
  ADD CONSTRAINT `assignments_ibfk_2` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`),
  ADD CONSTRAINT `assignments_ibfk_3` FOREIGN KEY (`academic_year_id`) REFERENCES `academic_years` (`id`),
  ADD CONSTRAINT `assignments_ibfk_4` FOREIGN KEY (`batch_id`) REFERENCES `batches` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `assignments_ibfk_5` FOREIGN KEY (`subject_id`) REFERENCES `subjects` (`id`);

--
-- Constraints for table `assignment_files`
--
ALTER TABLE `assignment_files`
  ADD CONSTRAINT `assignment_files_ibfk_1` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`),
  ADD CONSTRAINT `assignment_files_ibfk_2` FOREIGN KEY (`assignment_id`) REFERENCES `assignments` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `assignment_submissions`
--
ALTER TABLE `assignment_submissions`
  ADD CONSTRAINT `assignment_submissions_ibfk_1` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`),
  ADD CONSTRAINT `assignment_submissions_ibfk_2` FOREIGN KEY (`assignment_id`) REFERENCES `assignments` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `assignment_submissions_ibfk_3` FOREIGN KEY (`enrollment_id`) REFERENCES `student_enrollments` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `assignment_submissions_ibfk_4` FOREIGN KEY (`graded_by`) REFERENCES `users` (`id`);

--
-- Constraints for table `assignment_submission_files`
--
ALTER TABLE `assignment_submission_files`
  ADD CONSTRAINT `assignment_submission_files_ibfk_1` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`),
  ADD CONSTRAINT `assignment_submission_files_ibfk_2` FOREIGN KEY (`submission_id`) REFERENCES `assignment_submissions` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `attendance_records`
--
ALTER TABLE `attendance_records`
  ADD CONSTRAINT `attendance_records_ibfk_1` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`),
  ADD CONSTRAINT `attendance_records_ibfk_2` FOREIGN KEY (`lecture_id`) REFERENCES `lectures` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `attendance_records_ibfk_3` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `audit_logs`
--
ALTER TABLE `audit_logs`
  ADD CONSTRAINT `audit_logs_ibfk_1` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`),
  ADD CONSTRAINT `audit_logs_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`);

--
-- Constraints for table `batches`
--
ALTER TABLE `batches`
  ADD CONSTRAINT `batches_ibfk_1` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`),
  ADD CONSTRAINT `batches_ibfk_2` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `batches_ibfk_3` FOREIGN KEY (`academic_year_id`) REFERENCES `academic_years` (`id`),
  ADD CONSTRAINT `batches_ibfk_4` FOREIGN KEY (`level_id`) REFERENCES `levels` (`id`),
  ADD CONSTRAINT `batches_ibfk_5` FOREIGN KEY (`classroom_id`) REFERENCES `classrooms` (`id`);

--
-- Constraints for table `batch_transfer_history`
--
ALTER TABLE `batch_transfer_history`
  ADD CONSTRAINT `batch_transfer_history_ibfk_1` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`),
  ADD CONSTRAINT `batch_transfer_history_ibfk_2` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `batch_transfer_history_ibfk_3` FOREIGN KEY (`from_enrollment_id`) REFERENCES `student_enrollments` (`id`),
  ADD CONSTRAINT `batch_transfer_history_ibfk_4` FOREIGN KEY (`to_enrollment_id`) REFERENCES `student_enrollments` (`id`),
  ADD CONSTRAINT `batch_transfer_history_ibfk_5` FOREIGN KEY (`from_batch_id`) REFERENCES `batches` (`id`),
  ADD CONSTRAINT `batch_transfer_history_ibfk_6` FOREIGN KEY (`to_batch_id`) REFERENCES `batches` (`id`),
  ADD CONSTRAINT `batch_transfer_history_ibfk_7` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`);

--
-- Constraints for table `boards`
--
ALTER TABLE `boards`
  ADD CONSTRAINT `boards_ibfk_1` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`);

--
-- Constraints for table `branches`
--
ALTER TABLE `branches`
  ADD CONSTRAINT `branches_ibfk_1` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `branch_programs`
--
ALTER TABLE `branch_programs`
  ADD CONSTRAINT `branch_programs_ibfk_1` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `branch_programs_ibfk_2` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `branch_programs_ibfk_3` FOREIGN KEY (`course_id`) REFERENCES `courses` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `branch_programs_ibfk_4` FOREIGN KEY (`program_id`) REFERENCES `programs` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `branch_settings`
--
ALTER TABLE `branch_settings`
  ADD CONSTRAINT `branch_settings_ibfk_1` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`),
  ADD CONSTRAINT `branch_settings_ibfk_2` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `broadcast_messages`
--
ALTER TABLE `broadcast_messages`
  ADD CONSTRAINT `broadcast_messages_ibfk_1` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`),
  ADD CONSTRAINT `broadcast_messages_ibfk_2` FOREIGN KEY (`teacher_user_id`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `broadcast_messages_ibfk_3` FOREIGN KEY (`batch_id`) REFERENCES `batches` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `classrooms`
--
ALTER TABLE `classrooms`
  ADD CONSTRAINT `classrooms_ibfk_1` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`),
  ADD CONSTRAINT `classrooms_ibfk_2` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `communication_logs`
--
ALTER TABLE `communication_logs`
  ADD CONSTRAINT `communication_logs_ibfk_1` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`);

--
-- Constraints for table `concessions`
--
ALTER TABLE `concessions`
  ADD CONSTRAINT `concessions_ibfk_1` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`),
  ADD CONSTRAINT `concessions_ibfk_2` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`),
  ADD CONSTRAINT `concessions_ibfk_3` FOREIGN KEY (`enrollment_id`) REFERENCES `student_enrollments` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `concessions_ibfk_4` FOREIGN KEY (`approved_by`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `fk_concessions_enquiry` FOREIGN KEY (`enquiry_id`) REFERENCES `enquiries` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `courses`
--
ALTER TABLE `courses`
  ADD CONSTRAINT `courses_ibfk_1` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`);

--
-- Constraints for table `course_branches`
--
ALTER TABLE `course_branches`
  ADD CONSTRAINT `course_branches_ibfk_1` FOREIGN KEY (`course_id`) REFERENCES `courses` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `course_branches_ibfk_2` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `email_templates`
--
ALTER TABLE `email_templates`
  ADD CONSTRAINT `fk_email_templates_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `fk_email_templates_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`),
  ADD CONSTRAINT `fk_email_templates_updated_by` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`);

--
-- Constraints for table `enquiries`
--
ALTER TABLE `enquiries`
  ADD CONSTRAINT `enquiries_ibfk_1` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`),
  ADD CONSTRAINT `enquiries_ibfk_2` FOREIGN KEY (`preferred_branch_id`) REFERENCES `branches` (`id`),
  ADD CONSTRAINT `enquiries_ibfk_3` FOREIGN KEY (`assigned_branch_id`) REFERENCES `branches` (`id`),
  ADD CONSTRAINT `enquiries_ibfk_5` FOREIGN KEY (`interested_course_id`) REFERENCES `courses` (`id`),
  ADD CONSTRAINT `enquiries_ibfk_6` FOREIGN KEY (`interested_program_id`) REFERENCES `programs` (`id`),
  ADD CONSTRAINT `enquiries_ibfk_8` FOREIGN KEY (`counsellor_id`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `fk_enquiries_academic_year` FOREIGN KEY (`interested_academic_year_id`) REFERENCES `academic_years` (`id`),
  ADD CONSTRAINT `fk_enquiries_interested_level` FOREIGN KEY (`interested_level_id`) REFERENCES `levels` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_enquiries_student` FOREIGN KEY (`converted_student_id`) REFERENCES `students` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `enquiry_followups`
--
ALTER TABLE `enquiry_followups`
  ADD CONSTRAINT `enquiry_followups_ibfk_1` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`),
  ADD CONSTRAINT `enquiry_followups_ibfk_2` FOREIGN KEY (`enquiry_id`) REFERENCES `enquiries` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `enquiry_followups_ibfk_3` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`);

--
-- Constraints for table `exams`
--
ALTER TABLE `exams`
  ADD CONSTRAINT `exams_ibfk_1` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`),
  ADD CONSTRAINT `exams_ibfk_2` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`),
  ADD CONSTRAINT `exams_ibfk_3` FOREIGN KEY (`academic_year_id`) REFERENCES `academic_years` (`id`),
  ADD CONSTRAINT `exams_ibfk_4` FOREIGN KEY (`subject_id`) REFERENCES `subjects` (`id`);

--
-- Constraints for table `exam_batch_assignments`
--
ALTER TABLE `exam_batch_assignments`
  ADD CONSTRAINT `exam_batch_assignments_ibfk_1` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`),
  ADD CONSTRAINT `exam_batch_assignments_ibfk_2` FOREIGN KEY (`exam_id`) REFERENCES `exams` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `exam_batch_assignments_ibfk_3` FOREIGN KEY (`batch_id`) REFERENCES `batches` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `exam_marks`
--
ALTER TABLE `exam_marks`
  ADD CONSTRAINT `exam_marks_ibfk_1` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`),
  ADD CONSTRAINT `exam_marks_ibfk_2` FOREIGN KEY (`exam_id`) REFERENCES `exams` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `exam_marks_ibfk_3` FOREIGN KEY (`enrollment_id`) REFERENCES `student_enrollments` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `exam_result_publish_logs`
--
ALTER TABLE `exam_result_publish_logs`
  ADD CONSTRAINT `exam_result_publish_logs_ibfk_1` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`),
  ADD CONSTRAINT `exam_result_publish_logs_ibfk_2` FOREIGN KEY (`exam_id`) REFERENCES `exams` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `exam_result_publish_logs_ibfk_3` FOREIGN KEY (`published_by`) REFERENCES `users` (`id`);

--
-- Constraints for table `fee_heads`
--
ALTER TABLE `fee_heads`
  ADD CONSTRAINT `fee_heads_ibfk_1` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`);

--
-- Constraints for table `fee_plans`
--
ALTER TABLE `fee_plans`
  ADD CONSTRAINT `fee_plans_ibfk_1` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`),
  ADD CONSTRAINT `fee_plans_ibfk_2` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`),
  ADD CONSTRAINT `fee_plans_ibfk_3` FOREIGN KEY (`academic_year_id`) REFERENCES `academic_years` (`id`),
  ADD CONSTRAINT `fee_plans_ibfk_4` FOREIGN KEY (`level_id`) REFERENCES `levels` (`id`);

--
-- Constraints for table `fee_plan_installments`
--
ALTER TABLE `fee_plan_installments`
  ADD CONSTRAINT `fee_plan_installments_ibfk_1` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`),
  ADD CONSTRAINT `fee_plan_installments_ibfk_2` FOREIGN KEY (`fee_plan_id`) REFERENCES `fee_plans` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `fee_plan_items`
--
ALTER TABLE `fee_plan_items`
  ADD CONSTRAINT `fee_plan_items_ibfk_1` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`),
  ADD CONSTRAINT `fee_plan_items_ibfk_2` FOREIGN KEY (`fee_plan_id`) REFERENCES `fee_plans` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fee_plan_items_ibfk_3` FOREIGN KEY (`fee_head_id`) REFERENCES `fee_heads` (`id`);

--
-- Constraints for table `guardians`
--
ALTER TABLE `guardians`
  ADD CONSTRAINT `guardians_ibfk_1` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`),
  ADD CONSTRAINT `guardians_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `holidays`
--
ALTER TABLE `holidays`
  ADD CONSTRAINT `holidays_ibfk_1` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`),
  ADD CONSTRAINT `holidays_ibfk_2` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `homeworks`
--
ALTER TABLE `homeworks`
  ADD CONSTRAINT `homeworks_ibfk_1` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`),
  ADD CONSTRAINT `homeworks_ibfk_2` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`),
  ADD CONSTRAINT `homeworks_ibfk_3` FOREIGN KEY (`academic_year_id`) REFERENCES `academic_years` (`id`),
  ADD CONSTRAINT `homeworks_ibfk_4` FOREIGN KEY (`subject_id`) REFERENCES `subjects` (`id`);

--
-- Constraints for table `homework_submissions`
--
ALTER TABLE `homework_submissions`
  ADD CONSTRAINT `homework_submissions_ibfk_1` FOREIGN KEY (`homework_id`) REFERENCES `homeworks` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `homework_submissions_ibfk_2` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`),
  ADD CONSTRAINT `homework_submissions_ibfk_3` FOREIGN KEY (`graded_by`) REFERENCES `users` (`id`);

--
-- Constraints for table `income_expense_heads`
--
ALTER TABLE `income_expense_heads`
  ADD CONSTRAINT `income_expense_heads_ibfk_1` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`);

--
-- Constraints for table `income_expense_ledger`
--
ALTER TABLE `income_expense_ledger`
  ADD CONSTRAINT `income_expense_ledger_ibfk_1` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`),
  ADD CONSTRAINT `income_expense_ledger_ibfk_2` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`),
  ADD CONSTRAINT `income_expense_ledger_ibfk_3` FOREIGN KEY (`head_id`) REFERENCES `income_expense_heads` (`id`);

--
-- Constraints for table `leave_requests`
--
ALTER TABLE `leave_requests`
  ADD CONSTRAINT `leave_requests_ibfk_1` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`),
  ADD CONSTRAINT `leave_requests_ibfk_2` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`),
  ADD CONSTRAINT `leave_requests_ibfk_3` FOREIGN KEY (`staff_id`) REFERENCES `staff_profiles` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `leave_requests_ibfk_4` FOREIGN KEY (`approved_by`) REFERENCES `users` (`id`);

--
-- Constraints for table `lectures`
--
ALTER TABLE `lectures`
  ADD CONSTRAINT `lectures_ibfk_1` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`),
  ADD CONSTRAINT `lectures_ibfk_2` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`),
  ADD CONSTRAINT `lectures_ibfk_3` FOREIGN KEY (`academic_year_id`) REFERENCES `academic_years` (`id`),
  ADD CONSTRAINT `lectures_ibfk_4` FOREIGN KEY (`batch_id`) REFERENCES `batches` (`id`),
  ADD CONSTRAINT `lectures_ibfk_5` FOREIGN KEY (`subject_id`) REFERENCES `subjects` (`id`),
  ADD CONSTRAINT `lectures_ibfk_6` FOREIGN KEY (`teacher_user_id`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `lectures_ibfk_7` FOREIGN KEY (`classroom_id`) REFERENCES `classrooms` (`id`),
  ADD CONSTRAINT `lectures_ibfk_8` FOREIGN KEY (`recurring_rule_id`) REFERENCES `recurring_schedule_rules` (`id`);

--
-- Constraints for table `lecture_cancellations`
--
ALTER TABLE `lecture_cancellations`
  ADD CONSTRAINT `lecture_cancellations_ibfk_1` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`),
  ADD CONSTRAINT `lecture_cancellations_ibfk_2` FOREIGN KEY (`lecture_id`) REFERENCES `lectures` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `lecture_cancellations_ibfk_3` FOREIGN KEY (`cancelled_by`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `lecture_cancellations_ibfk_4` FOREIGN KEY (`compensatory_lecture_id`) REFERENCES `lectures` (`id`);

--
-- Constraints for table `lecture_requests`
--
ALTER TABLE `lecture_requests`
  ADD CONSTRAINT `lecture_requests_ibfk_1` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `lecture_requests_ibfk_10` FOREIGN KEY (`requested_teacher_user_id`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `lecture_requests_ibfk_11` FOREIGN KEY (`decided_by`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `lecture_requests_ibfk_12` FOREIGN KEY (`applied_by`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `lecture_requests_ibfk_2` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `lecture_requests_ibfk_3` FOREIGN KEY (`requester_id`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `lecture_requests_ibfk_4` FOREIGN KEY (`lecture_id`) REFERENCES `lectures` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `lecture_requests_ibfk_5` FOREIGN KEY (`batch_id`) REFERENCES `batches` (`id`),
  ADD CONSTRAINT `lecture_requests_ibfk_6` FOREIGN KEY (`subject_id`) REFERENCES `subjects` (`id`),
  ADD CONSTRAINT `lecture_requests_ibfk_7` FOREIGN KEY (`current_classroom_id`) REFERENCES `classrooms` (`id`),
  ADD CONSTRAINT `lecture_requests_ibfk_8` FOREIGN KEY (`current_teacher_user_id`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `lecture_requests_ibfk_9` FOREIGN KEY (`requested_classroom_id`) REFERENCES `classrooms` (`id`);

--
-- Constraints for table `levels`
--
ALTER TABLE `levels`
  ADD CONSTRAINT `levels_ibfk_1` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`),
  ADD CONSTRAINT `levels_ibfk_2` FOREIGN KEY (`course_id`) REFERENCES `courses` (`id`),
  ADD CONSTRAINT `levels_ibfk_3` FOREIGN KEY (`program_id`) REFERENCES `programs` (`id`);

--
-- Constraints for table `level_subjects`
--
ALTER TABLE `level_subjects`
  ADD CONSTRAINT `level_subjects_ibfk_1` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`),
  ADD CONSTRAINT `level_subjects_ibfk_2` FOREIGN KEY (`level_id`) REFERENCES `levels` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `level_subjects_ibfk_3` FOREIGN KEY (`subject_id`) REFERENCES `subjects` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `notifications`
--
ALTER TABLE `notifications`
  ADD CONSTRAINT `notifications_ibfk_1` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`),
  ADD CONSTRAINT `notifications_ibfk_2` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`);

--
-- Constraints for table `notification_recipients`
--
ALTER TABLE `notification_recipients`
  ADD CONSTRAINT `notification_recipients_ibfk_1` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`),
  ADD CONSTRAINT `notification_recipients_ibfk_2` FOREIGN KEY (`notification_id`) REFERENCES `notifications` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `notification_recipients_ibfk_3` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `otp_codes`
--
ALTER TABLE `otp_codes`
  ADD CONSTRAINT `otp_codes_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `overridden_permissions`
--
ALTER TABLE `overridden_permissions`
  ADD CONSTRAINT `overridden_permissions_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `overridden_permissions_ibfk_2` FOREIGN KEY (`permission_id`) REFERENCES `permissions` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `password_resets`
--
ALTER TABLE `password_resets`
  ADD CONSTRAINT `password_resets_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `payment_installment_links`
--
ALTER TABLE `payment_installment_links`
  ADD CONSTRAINT `payment_installment_links_ibfk_1` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`),
  ADD CONSTRAINT `payment_installment_links_ibfk_2` FOREIGN KEY (`payment_id`) REFERENCES `payment_transactions` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `payment_transactions`
--
ALTER TABLE `payment_transactions`
  ADD CONSTRAINT `payment_transactions_ibfk_1` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`),
  ADD CONSTRAINT `payment_transactions_ibfk_2` FOREIGN KEY (`receipt_id`) REFERENCES `receipts` (`id`),
  ADD CONSTRAINT `payment_transactions_ibfk_3` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`);

--
-- Constraints for table `payroll_disbursements`
--
ALTER TABLE `payroll_disbursements`
  ADD CONSTRAINT `payroll_disbursements_ibfk_1` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`),
  ADD CONSTRAINT `payroll_disbursements_ibfk_2` FOREIGN KEY (`payroll_record_id`) REFERENCES `payroll_records` (`id`),
  ADD CONSTRAINT `payroll_disbursements_ibfk_3` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`);

--
-- Constraints for table `payroll_periods`
--
ALTER TABLE `payroll_periods`
  ADD CONSTRAINT `payroll_periods_ibfk_1` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`),
  ADD CONSTRAINT `payroll_periods_ibfk_2` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`),
  ADD CONSTRAINT `payroll_periods_ibfk_3` FOREIGN KEY (`processed_by`) REFERENCES `users` (`id`);

--
-- Constraints for table `payroll_records`
--
ALTER TABLE `payroll_records`
  ADD CONSTRAINT `payroll_records_ibfk_1` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`),
  ADD CONSTRAINT `payroll_records_ibfk_2` FOREIGN KEY (`period_id`) REFERENCES `payroll_periods` (`id`),
  ADD CONSTRAINT `payroll_records_ibfk_3` FOREIGN KEY (`staff_id`) REFERENCES `staff_profiles` (`id`);

--
-- Constraints for table `plan_branding`
--
ALTER TABLE `plan_branding`
  ADD CONSTRAINT `plan_branding_ibfk_1` FOREIGN KEY (`plan_id`) REFERENCES `subscription_plans` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `plan_features`
--
ALTER TABLE `plan_features`
  ADD CONSTRAINT `plan_features_ibfk_1` FOREIGN KEY (`plan_id`) REFERENCES `subscription_plans` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `plan_integrations`
--
ALTER TABLE `plan_integrations`
  ADD CONSTRAINT `plan_integrations_ibfk_1` FOREIGN KEY (`plan_id`) REFERENCES `subscription_plans` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `plan_limits`
--
ALTER TABLE `plan_limits`
  ADD CONSTRAINT `plan_limits_ibfk_1` FOREIGN KEY (`plan_id`) REFERENCES `subscription_plans` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `plan_support`
--
ALTER TABLE `plan_support`
  ADD CONSTRAINT `plan_support_ibfk_1` FOREIGN KEY (`plan_id`) REFERENCES `subscription_plans` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `platform_settings`
--
ALTER TABLE `platform_settings`
  ADD CONSTRAINT `platform_settings_ibfk_1` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `programs`
--
ALTER TABLE `programs`
  ADD CONSTRAINT `programs_ibfk_1` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`),
  ADD CONSTRAINT `programs_ibfk_2` FOREIGN KEY (`course_id`) REFERENCES `courses` (`id`);

--
-- Constraints for table `push_tokens`
--
ALTER TABLE `push_tokens`
  ADD CONSTRAINT `push_tokens_ibfk_1` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`),
  ADD CONSTRAINT `push_tokens_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `push_tokens_ibfk_3` FOREIGN KEY (`device_id`) REFERENCES `app_devices` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `receipts`
--
ALTER TABLE `receipts`
  ADD CONSTRAINT `receipts_ibfk_1` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`),
  ADD CONSTRAINT `receipts_ibfk_2` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`),
  ADD CONSTRAINT `receipts_ibfk_3` FOREIGN KEY (`enrollment_id`) REFERENCES `student_enrollments` (`id`);

--
-- Constraints for table `recurring_schedule_rules`
--
ALTER TABLE `recurring_schedule_rules`
  ADD CONSTRAINT `recurring_schedule_rules_ibfk_1` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`),
  ADD CONSTRAINT `recurring_schedule_rules_ibfk_2` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`),
  ADD CONSTRAINT `recurring_schedule_rules_ibfk_3` FOREIGN KEY (`academic_year_id`) REFERENCES `academic_years` (`id`),
  ADD CONSTRAINT `recurring_schedule_rules_ibfk_4` FOREIGN KEY (`batch_id`) REFERENCES `batches` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `recurring_schedule_rules_ibfk_5` FOREIGN KEY (`subject_id`) REFERENCES `subjects` (`id`),
  ADD CONSTRAINT `recurring_schedule_rules_ibfk_6` FOREIGN KEY (`teacher_user_id`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `recurring_schedule_rules_ibfk_7` FOREIGN KEY (`classroom_id`) REFERENCES `classrooms` (`id`);

--
-- Constraints for table `refunds`
--
ALTER TABLE `refunds`
  ADD CONSTRAINT `refunds_ibfk_1` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`),
  ADD CONSTRAINT `refunds_ibfk_2` FOREIGN KEY (`receipt_id`) REFERENCES `receipts` (`id`),
  ADD CONSTRAINT `refunds_ibfk_3` FOREIGN KEY (`approved_by`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `refunds_ibfk_4` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`);

--
-- Constraints for table `role_permissions`
--
ALTER TABLE `role_permissions`
  ADD CONSTRAINT `role_permissions_ibfk_1` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `role_permissions_ibfk_2` FOREIGN KEY (`permission_id`) REFERENCES `permissions` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `saas_invoices`
--
ALTER TABLE `saas_invoices`
  ADD CONSTRAINT `fk_saas_invoices_plan` FOREIGN KEY (`plan_id`) REFERENCES `subscription_plans` (`id`),
  ADD CONSTRAINT `fk_saas_invoices_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `saas_leads`
--
ALTER TABLE `saas_leads`
  ADD CONSTRAINT `fk_saas_leads_assigned_to` FOREIGN KEY (`assigned_to`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_saas_leads_converted_tenant` FOREIGN KEY (`converted_tenant_id`) REFERENCES `tenants` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_saas_leads_plan_id` FOREIGN KEY (`plan_id`) REFERENCES `subscription_plans` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `saas_lead_followups`
--
ALTER TABLE `saas_lead_followups`
  ADD CONSTRAINT `fk_saas_lead_followups_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_saas_lead_followups_lead` FOREIGN KEY (`lead_id`) REFERENCES `saas_leads` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `salary_structures`
--
ALTER TABLE `salary_structures`
  ADD CONSTRAINT `salary_structures_ibfk_1` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`);

--
-- Constraints for table `salary_structure_components`
--
ALTER TABLE `salary_structure_components`
  ADD CONSTRAINT `salary_structure_components_ibfk_1` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`),
  ADD CONSTRAINT `salary_structure_components_ibfk_2` FOREIGN KEY (`structure_id`) REFERENCES `salary_structures` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `schedule_change_logs`
--
ALTER TABLE `schedule_change_logs`
  ADD CONSTRAINT `schedule_change_logs_ibfk_1` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`),
  ADD CONSTRAINT `schedule_change_logs_ibfk_2` FOREIGN KEY (`lecture_id`) REFERENCES `lectures` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `schedule_change_logs_ibfk_3` FOREIGN KEY (`changed_by`) REFERENCES `users` (`id`);

--
-- Constraints for table `sms_templates`
--
ALTER TABLE `sms_templates`
  ADD CONSTRAINT `sms_templates_ibfk_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `staff_attendance`
--
ALTER TABLE `staff_attendance`
  ADD CONSTRAINT `staff_attendance_ibfk_1` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`),
  ADD CONSTRAINT `staff_attendance_ibfk_2` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`),
  ADD CONSTRAINT `staff_attendance_ibfk_3` FOREIGN KEY (`staff_id`) REFERENCES `staff_profiles` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `staff_attendance_ibfk_4` FOREIGN KEY (`marked_by`) REFERENCES `users` (`id`);

--
-- Constraints for table `staff_profiles`
--
ALTER TABLE `staff_profiles`
  ADD CONSTRAINT `staff_profiles_ibfk_1` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`),
  ADD CONSTRAINT `staff_profiles_ibfk_3` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `staff_salary_payments`
--
ALTER TABLE `staff_salary_payments`
  ADD CONSTRAINT `fk_ssp_branch` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_ssp_staff` FOREIGN KEY (`staff_id`) REFERENCES `staff_profiles` (`id`),
  ADD CONSTRAINT `fk_ssp_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `students`
--
ALTER TABLE `students`
  ADD CONSTRAINT `students_ibfk_1` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`),
  ADD CONSTRAINT `students_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `students_ibfk_3` FOREIGN KEY (`primary_branch_id`) REFERENCES `branches` (`id`),
  ADD CONSTRAINT `students_ibfk_4` FOREIGN KEY (`board_id`) REFERENCES `boards` (`id`);

--
-- Constraints for table `student_documents`
--
ALTER TABLE `student_documents`
  ADD CONSTRAINT `student_documents_ibfk_1` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`),
  ADD CONSTRAINT `student_documents_ibfk_2` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `student_documents_ibfk_3` FOREIGN KEY (`document_type_id`) REFERENCES `document_types` (`id`),
  ADD CONSTRAINT `student_documents_ibfk_4` FOREIGN KEY (`verified_by`) REFERENCES `users` (`id`);

--
-- Constraints for table `student_doubts`
--
ALTER TABLE `student_doubts`
  ADD CONSTRAINT `fk_sd_batch` FOREIGN KEY (`batch_id`) REFERENCES `batches` (`id`),
  ADD CONSTRAINT `fk_sd_student` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_sd_subject` FOREIGN KEY (`subject_id`) REFERENCES `subjects` (`id`),
  ADD CONSTRAINT `fk_sd_teacher` FOREIGN KEY (`assigned_teacher_id`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `fk_sd_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `student_doubt_replies`
--
ALTER TABLE `student_doubt_replies`
  ADD CONSTRAINT `fk_sdr_doubt` FOREIGN KEY (`doubt_id`) REFERENCES `student_doubts` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_sdr_sender` FOREIGN KEY (`sender_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `student_enrollments`
--
ALTER TABLE `student_enrollments`
  ADD CONSTRAINT `fk_se_bundle_id` FOREIGN KEY (`bundle_id`) REFERENCES `subject_bundles` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `student_enrollments_ibfk_1` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`),
  ADD CONSTRAINT `student_enrollments_ibfk_2` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`),
  ADD CONSTRAINT `student_enrollments_ibfk_3` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `student_enrollments_ibfk_4` FOREIGN KEY (`batch_id`) REFERENCES `batches` (`id`),
  ADD CONSTRAINT `student_enrollments_ibfk_5` FOREIGN KEY (`academic_year_id`) REFERENCES `academic_years` (`id`),
  ADD CONSTRAINT `student_enrollments_ibfk_6` FOREIGN KEY (`promoted_from_enrollment_id`) REFERENCES `student_enrollments` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `student_guardians`
--
ALTER TABLE `student_guardians`
  ADD CONSTRAINT `student_guardians_ibfk_1` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`),
  ADD CONSTRAINT `student_guardians_ibfk_2` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `student_guardians_ibfk_3` FOREIGN KEY (`guardian_id`) REFERENCES `guardians` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `subjects`
--
ALTER TABLE `subjects`
  ADD CONSTRAINT `subjects_ibfk_1` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`);

--
-- Constraints for table `subject_bundles`
--
ALTER TABLE `subject_bundles`
  ADD CONSTRAINT `fk_subject_bundles_level` FOREIGN KEY (`level_id`) REFERENCES `levels` (`id`),
  ADD CONSTRAINT `subject_bundles_ibfk_1` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`),
  ADD CONSTRAINT `subject_bundles_ibfk_2` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`),
  ADD CONSTRAINT `subject_bundles_ibfk_3` FOREIGN KEY (`fee_plan_id`) REFERENCES `fee_plans` (`id`);

--
-- Constraints for table `subject_fees`
--
ALTER TABLE `subject_fees`
  ADD CONSTRAINT `subject_fees_ibfk_1` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`),
  ADD CONSTRAINT `subject_fees_ibfk_2` FOREIGN KEY (`level_id`) REFERENCES `levels` (`id`),
  ADD CONSTRAINT `subject_fees_ibfk_3` FOREIGN KEY (`subject_id`) REFERENCES `subjects` (`id`);

--
-- Constraints for table `support_replies`
--
ALTER TABLE `support_replies`
  ADD CONSTRAINT `fk_support_replies_sender` FOREIGN KEY (`sender_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_support_replies_ticket` FOREIGN KEY (`ticket_id`) REFERENCES `support_tickets` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `support_tickets`
--
ALTER TABLE `support_tickets`
  ADD CONSTRAINT `fk_support_tickets_branch` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_support_tickets_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_support_tickets_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `system_configurations`
--
ALTER TABLE `system_configurations`
  ADD CONSTRAINT `system_configurations_ibfk_1` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `system_configurations_ibfk_2` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `teacher_allocations`
--
ALTER TABLE `teacher_allocations`
  ADD CONSTRAINT `teacher_allocations_ibfk_1` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`),
  ADD CONSTRAINT `teacher_allocations_ibfk_2` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`),
  ADD CONSTRAINT `teacher_allocations_ibfk_3` FOREIGN KEY (`academic_year_id`) REFERENCES `academic_years` (`id`),
  ADD CONSTRAINT `teacher_allocations_ibfk_4` FOREIGN KEY (`batch_id`) REFERENCES `batches` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `teacher_allocations_ibfk_6` FOREIGN KEY (`teacher_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `teacher_availability`
--
ALTER TABLE `teacher_availability`
  ADD CONSTRAINT `teacher_availability_ibfk_1` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`),
  ADD CONSTRAINT `teacher_availability_ibfk_2` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`),
  ADD CONSTRAINT `teacher_availability_ibfk_3` FOREIGN KEY (`teacher_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `teacher_capabilities`
--
ALTER TABLE `teacher_capabilities`
  ADD CONSTRAINT `teacher_capabilities_ibfk_1` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`),
  ADD CONSTRAINT `teacher_capabilities_ibfk_2` FOREIGN KEY (`teacher_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `teacher_subjects`
--
ALTER TABLE `teacher_subjects`
  ADD CONSTRAINT `teacher_subjects_ibfk_1` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`),
  ADD CONSTRAINT `teacher_subjects_ibfk_2` FOREIGN KEY (`teacher_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `teacher_subjects_ibfk_3` FOREIGN KEY (`subject_id`) REFERENCES `subjects` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `tenants`
--
ALTER TABLE `tenants`
  ADD CONSTRAINT `fk_tenants_plan_id` FOREIGN KEY (`plan_id`) REFERENCES `subscription_plans` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_tenants_primary_admin` FOREIGN KEY (`primary_admin_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_tenants_source_lead` FOREIGN KEY (`source_lead_id`) REFERENCES `saas_leads` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `tenant_module_overrides`
--
ALTER TABLE `tenant_module_overrides`
  ADD CONSTRAINT `tenant_module_overrides_ibfk_1` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `tenant_module_overrides_ibfk_2` FOREIGN KEY (`module_id`) REFERENCES `module_registry` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `topics`
--
ALTER TABLE `topics`
  ADD CONSTRAINT `topics_ibfk_1` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`),
  ADD CONSTRAINT `topics_ibfk_2` FOREIGN KEY (`level_subject_id`) REFERENCES `level_subjects` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `users`
--
ALTER TABLE `users`
  ADD CONSTRAINT `users_ibfk_1` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `user_branch_access`
--
ALTER TABLE `user_branch_access`
  ADD CONSTRAINT `user_branch_access_ibfk_1` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`),
  ADD CONSTRAINT `user_branch_access_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `user_branch_access_ibfk_3` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `user_branch_access_ibfk_4` FOREIGN KEY (`granted_by`) REFERENCES `users` (`id`);

--
-- Constraints for table `user_roles`
--
ALTER TABLE `user_roles`
  ADD CONSTRAINT `user_roles_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `user_roles_ibfk_2` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `user_roles_ibfk_3` FOREIGN KEY (`assigned_by`) REFERENCES `users` (`id`);

--
-- Constraints for table `user_sessions`
--
ALTER TABLE `user_sessions`
  ADD CONSTRAINT `user_sessions_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `user_sessions_ibfk_2` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`),
  ADD CONSTRAINT `user_sessions_ibfk_3` FOREIGN KEY (`device_id`) REFERENCES `app_devices` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `whatsapp_templates`
--
ALTER TABLE `whatsapp_templates`
  ADD CONSTRAINT `whatsapp_templates_ibfk_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE;
SET FOREIGN_KEY_CHECKS = 1;
SET UNIQUE_CHECKS = 1;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
