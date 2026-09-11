-- ============================================================
-- Departmental Management System
-- University of Zambia (UNZA)
-- Exported: 2026-06-22 01:28:47
-- Import via: mysql -u root -p < database_export.sql
-- Or drag into MySQL Workbench / phpMyAdmin / DBeaver
-- ============================================================

DROP DATABASE IF EXISTS `Departmental_Management_System`;
CREATE DATABASE `Departmental_Management_System`
  CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
USE `Departmental_Management_System`;

SET FOREIGN_KEY_CHECKS = 0;

-- ============================================================
-- SCHEMA (all tables)
-- ============================================================

-- ── activities_activity
DROP TABLE IF EXISTS `activities_activity`;
CREATE TABLE `activities_activity` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `title` varchar(200) COLLATE utf8mb4_general_ci NOT NULL,
  `description` longtext COLLATE utf8mb4_general_ci NOT NULL,
  `start_date` datetime(6) NOT NULL,
  `end_date` datetime(6) NOT NULL,
  `organizer_id` bigint NOT NULL,
  PRIMARY KEY (`id`),
  KEY `activities_activity_organizer_id_1d5df7db_fk_users_user_id` (`organizer_id`),
  CONSTRAINT `activities_activity_organizer_id_1d5df7db_fk_users_user_id` FOREIGN KEY (`organizer_id`) REFERENCES `users_user` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ── auth_group
DROP TABLE IF EXISTS `auth_group`;
CREATE TABLE `auth_group` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(150) COLLATE utf8mb4_general_ci NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ── auth_group_permissions
DROP TABLE IF EXISTS `auth_group_permissions`;
CREATE TABLE `auth_group_permissions` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `group_id` int NOT NULL,
  `permission_id` int NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `auth_group_permissions_group_id_permission_id_0cd325b0_uniq` (`group_id`,`permission_id`),
  KEY `auth_group_permissio_permission_id_84c5c92e_fk_auth_perm` (`permission_id`),
  CONSTRAINT `auth_group_permissio_permission_id_84c5c92e_fk_auth_perm` FOREIGN KEY (`permission_id`) REFERENCES `auth_permission` (`id`),
  CONSTRAINT `auth_group_permissions_group_id_b120cbf9_fk_auth_group_id` FOREIGN KEY (`group_id`) REFERENCES `auth_group` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ── auth_permission
DROP TABLE IF EXISTS `auth_permission`;
CREATE TABLE `auth_permission` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `content_type_id` int NOT NULL,
  `codename` varchar(100) COLLATE utf8mb4_general_ci NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `auth_permission_content_type_id_codename_01ab375a_uniq` (`content_type_id`,`codename`),
  CONSTRAINT `auth_permission_content_type_id_2f476e4b_fk_django_co` FOREIGN KEY (`content_type_id`) REFERENCES `django_content_type` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=49 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ── django_admin_log
DROP TABLE IF EXISTS `django_admin_log`;
CREATE TABLE `django_admin_log` (
  `id` int NOT NULL AUTO_INCREMENT,
  `action_time` datetime(6) NOT NULL,
  `object_id` longtext COLLATE utf8mb4_general_ci,
  `object_repr` varchar(200) COLLATE utf8mb4_general_ci NOT NULL,
  `action_flag` smallint unsigned NOT NULL,
  `change_message` longtext COLLATE utf8mb4_general_ci NOT NULL,
  `content_type_id` int DEFAULT NULL,
  `user_id` bigint NOT NULL,
  PRIMARY KEY (`id`),
  KEY `django_admin_log_content_type_id_c4bce8eb_fk_django_co` (`content_type_id`),
  KEY `django_admin_log_user_id_c564eba6_fk_users_user_id` (`user_id`),
  CONSTRAINT `django_admin_log_content_type_id_c4bce8eb_fk_django_co` FOREIGN KEY (`content_type_id`) REFERENCES `django_content_type` (`id`),
  CONSTRAINT `django_admin_log_user_id_c564eba6_fk_users_user_id` FOREIGN KEY (`user_id`) REFERENCES `users_user` (`id`),
  CONSTRAINT `django_admin_log_chk_1` CHECK ((`action_flag` >= 0))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ── django_content_type
DROP TABLE IF EXISTS `django_content_type`;
CREATE TABLE `django_content_type` (
  `id` int NOT NULL AUTO_INCREMENT,
  `app_label` varchar(100) COLLATE utf8mb4_general_ci NOT NULL,
  `model` varchar(100) COLLATE utf8mb4_general_ci NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `django_content_type_app_label_model_76bd3d3b_uniq` (`app_label`,`model`)
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ── django_migrations
DROP TABLE IF EXISTS `django_migrations`;
CREATE TABLE `django_migrations` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `app` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `applied` datetime(6) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=23 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ── django_session
DROP TABLE IF EXISTS `django_session`;
CREATE TABLE `django_session` (
  `session_key` varchar(40) COLLATE utf8mb4_general_ci NOT NULL,
  `session_data` longtext COLLATE utf8mb4_general_ci NOT NULL,
  `expire_date` datetime(6) NOT NULL,
  PRIMARY KEY (`session_key`),
  KEY `django_session_expire_date_a5c62663` (`expire_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ── finance_approval
DROP TABLE IF EXISTS `finance_approval`;
CREATE TABLE `finance_approval` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `date_approved` datetime(6) NOT NULL,
  `comments` longtext COLLATE utf8mb4_general_ci,
  `approved_by_id` bigint NOT NULL,
  `expense_id` bigint NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `expense_id` (`expense_id`),
  KEY `finance_approval_approved_by_id_a5d9f97d_fk_users_user_id` (`approved_by_id`),
  CONSTRAINT `finance_approval_approved_by_id_a5d9f97d_fk_users_user_id` FOREIGN KEY (`approved_by_id`) REFERENCES `users_user` (`id`),
  CONSTRAINT `finance_approval_expense_id_922fcc9e_fk_finance_expense_id` FOREIGN KEY (`expense_id`) REFERENCES `finance_expense` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ── finance_budget
DROP TABLE IF EXISTS `finance_budget`;
CREATE TABLE `finance_budget` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `department` varchar(100) COLLATE utf8mb4_general_ci NOT NULL,
  `total_amount` decimal(12,2) NOT NULL,
  `allocated_date` date NOT NULL,
  `fiscal_year` varchar(9) COLLATE utf8mb4_general_ci NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ── finance_expense
DROP TABLE IF EXISTS `finance_expense`;
CREATE TABLE `finance_expense` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `amount` decimal(10,2) NOT NULL,
  `description` longtext COLLATE utf8mb4_general_ci NOT NULL,
  `status` varchar(20) COLLATE utf8mb4_general_ci NOT NULL,
  `date_requested` datetime(6) NOT NULL,
  `budget_id` bigint DEFAULT NULL,
  `requested_by_id` bigint NOT NULL,
  PRIMARY KEY (`id`),
  KEY `finance_expense_budget_id_8ff37618_fk_finance_budget_id` (`budget_id`),
  KEY `finance_expense_requested_by_id_78cde08f_fk_users_user_id` (`requested_by_id`),
  CONSTRAINT `finance_expense_budget_id_8ff37618_fk_finance_budget_id` FOREIGN KEY (`budget_id`) REFERENCES `finance_budget` (`id`),
  CONSTRAINT `finance_expense_requested_by_id_78cde08f_fk_users_user_id` FOREIGN KEY (`requested_by_id`) REFERENCES `users_user` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ── resources_allocation
DROP TABLE IF EXISTS `resources_allocation`;
CREATE TABLE `resources_allocation` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `start_time` datetime(6) NOT NULL,
  `end_time` datetime(6) NOT NULL,
  `activity_id` bigint DEFAULT NULL,
  `allocated_to_id` bigint NOT NULL,
  `resource_id` bigint NOT NULL,
  PRIMARY KEY (`id`),
  KEY `resources_allocation_activity_id_44ef4dd9_fk_activitie` (`activity_id`),
  KEY `resources_allocation_allocated_to_id_cc556905_fk_users_user_id` (`allocated_to_id`),
  KEY `resources_allocation_resource_id_e9e943ae_fk_resources` (`resource_id`),
  CONSTRAINT `resources_allocation_activity_id_44ef4dd9_fk_activitie` FOREIGN KEY (`activity_id`) REFERENCES `activities_activity` (`id`),
  CONSTRAINT `resources_allocation_allocated_to_id_cc556905_fk_users_user_id` FOREIGN KEY (`allocated_to_id`) REFERENCES `users_user` (`id`),
  CONSTRAINT `resources_allocation_resource_id_e9e943ae_fk_resources` FOREIGN KEY (`resource_id`) REFERENCES `resources_resource` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ── resources_resource
DROP TABLE IF EXISTS `resources_resource`;
CREATE TABLE `resources_resource` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `name` varchar(100) COLLATE utf8mb4_general_ci NOT NULL,
  `description` longtext COLLATE utf8mb4_general_ci NOT NULL,
  `status` varchar(20) COLLATE utf8mb4_general_ci NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ── users_user
DROP TABLE IF EXISTS `users_user`;
CREATE TABLE `users_user` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `password` varchar(128) COLLATE utf8mb4_general_ci NOT NULL,
  `last_login` datetime(6) DEFAULT NULL,
  `is_superuser` tinyint(1) NOT NULL,
  `username` varchar(150) COLLATE utf8mb4_general_ci NOT NULL,
  `first_name` varchar(150) COLLATE utf8mb4_general_ci NOT NULL,
  `last_name` varchar(150) COLLATE utf8mb4_general_ci NOT NULL,
  `email` varchar(254) COLLATE utf8mb4_general_ci NOT NULL,
  `is_staff` tinyint(1) NOT NULL,
  `is_active` tinyint(1) NOT NULL,
  `date_joined` datetime(6) NOT NULL,
  `role` varchar(20) COLLATE utf8mb4_general_ci NOT NULL,
  `department` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ── users_user_groups
DROP TABLE IF EXISTS `users_user_groups`;
CREATE TABLE `users_user_groups` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` bigint NOT NULL,
  `group_id` int NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `users_user_groups_user_id_group_id_b88eab82_uniq` (`user_id`,`group_id`),
  KEY `users_user_groups_group_id_9afc8d0e_fk_auth_group_id` (`group_id`),
  CONSTRAINT `users_user_groups_group_id_9afc8d0e_fk_auth_group_id` FOREIGN KEY (`group_id`) REFERENCES `auth_group` (`id`),
  CONSTRAINT `users_user_groups_user_id_5f6f5a90_fk_users_user_id` FOREIGN KEY (`user_id`) REFERENCES `users_user` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ── users_user_user_permissions
DROP TABLE IF EXISTS `users_user_user_permissions`;
CREATE TABLE `users_user_user_permissions` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` bigint NOT NULL,
  `permission_id` int NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `users_user_user_permissions_user_id_permission_id_43338c45_uniq` (`user_id`,`permission_id`),
  KEY `users_user_user_perm_permission_id_0b93982e_fk_auth_perm` (`permission_id`),
  CONSTRAINT `users_user_user_perm_permission_id_0b93982e_fk_auth_perm` FOREIGN KEY (`permission_id`) REFERENCES `auth_permission` (`id`),
  CONSTRAINT `users_user_user_permissions_user_id_20aca447_fk_users_user_id` FOREIGN KEY (`user_id`) REFERENCES `users_user` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


-- ============================================================
-- SEED DATA
-- ============================================================

-- Data: auth_permission (48 row(s))
INSERT INTO `auth_permission` (`id`, `name`, `content_type_id`, `codename`) VALUES (1, 'Can add log entry', 1, 'add_logentry');
INSERT INTO `auth_permission` (`id`, `name`, `content_type_id`, `codename`) VALUES (2, 'Can change log entry', 1, 'change_logentry');
INSERT INTO `auth_permission` (`id`, `name`, `content_type_id`, `codename`) VALUES (3, 'Can delete log entry', 1, 'delete_logentry');
INSERT INTO `auth_permission` (`id`, `name`, `content_type_id`, `codename`) VALUES (4, 'Can view log entry', 1, 'view_logentry');
INSERT INTO `auth_permission` (`id`, `name`, `content_type_id`, `codename`) VALUES (5, 'Can add permission', 3, 'add_permission');
INSERT INTO `auth_permission` (`id`, `name`, `content_type_id`, `codename`) VALUES (6, 'Can change permission', 3, 'change_permission');
INSERT INTO `auth_permission` (`id`, `name`, `content_type_id`, `codename`) VALUES (7, 'Can delete permission', 3, 'delete_permission');
INSERT INTO `auth_permission` (`id`, `name`, `content_type_id`, `codename`) VALUES (8, 'Can view permission', 3, 'view_permission');
INSERT INTO `auth_permission` (`id`, `name`, `content_type_id`, `codename`) VALUES (9, 'Can add group', 2, 'add_group');
INSERT INTO `auth_permission` (`id`, `name`, `content_type_id`, `codename`) VALUES (10, 'Can change group', 2, 'change_group');
INSERT INTO `auth_permission` (`id`, `name`, `content_type_id`, `codename`) VALUES (11, 'Can delete group', 2, 'delete_group');
INSERT INTO `auth_permission` (`id`, `name`, `content_type_id`, `codename`) VALUES (12, 'Can view group', 2, 'view_group');
INSERT INTO `auth_permission` (`id`, `name`, `content_type_id`, `codename`) VALUES (13, 'Can add content type', 4, 'add_contenttype');
INSERT INTO `auth_permission` (`id`, `name`, `content_type_id`, `codename`) VALUES (14, 'Can change content type', 4, 'change_contenttype');
INSERT INTO `auth_permission` (`id`, `name`, `content_type_id`, `codename`) VALUES (15, 'Can delete content type', 4, 'delete_contenttype');
INSERT INTO `auth_permission` (`id`, `name`, `content_type_id`, `codename`) VALUES (16, 'Can view content type', 4, 'view_contenttype');
INSERT INTO `auth_permission` (`id`, `name`, `content_type_id`, `codename`) VALUES (17, 'Can add session', 5, 'add_session');
INSERT INTO `auth_permission` (`id`, `name`, `content_type_id`, `codename`) VALUES (18, 'Can change session', 5, 'change_session');
INSERT INTO `auth_permission` (`id`, `name`, `content_type_id`, `codename`) VALUES (19, 'Can delete session', 5, 'delete_session');
INSERT INTO `auth_permission` (`id`, `name`, `content_type_id`, `codename`) VALUES (20, 'Can view session', 5, 'view_session');
INSERT INTO `auth_permission` (`id`, `name`, `content_type_id`, `codename`) VALUES (21, 'Can add user', 6, 'add_user');
INSERT INTO `auth_permission` (`id`, `name`, `content_type_id`, `codename`) VALUES (22, 'Can change user', 6, 'change_user');
INSERT INTO `auth_permission` (`id`, `name`, `content_type_id`, `codename`) VALUES (23, 'Can delete user', 6, 'delete_user');
INSERT INTO `auth_permission` (`id`, `name`, `content_type_id`, `codename`) VALUES (24, 'Can view user', 6, 'view_user');
INSERT INTO `auth_permission` (`id`, `name`, `content_type_id`, `codename`) VALUES (25, 'Can add budget', 8, 'add_budget');
INSERT INTO `auth_permission` (`id`, `name`, `content_type_id`, `codename`) VALUES (26, 'Can change budget', 8, 'change_budget');
INSERT INTO `auth_permission` (`id`, `name`, `content_type_id`, `codename`) VALUES (27, 'Can delete budget', 8, 'delete_budget');
INSERT INTO `auth_permission` (`id`, `name`, `content_type_id`, `codename`) VALUES (28, 'Can view budget', 8, 'view_budget');
INSERT INTO `auth_permission` (`id`, `name`, `content_type_id`, `codename`) VALUES (29, 'Can add expense', 9, 'add_expense');
INSERT INTO `auth_permission` (`id`, `name`, `content_type_id`, `codename`) VALUES (30, 'Can change expense', 9, 'change_expense');
INSERT INTO `auth_permission` (`id`, `name`, `content_type_id`, `codename`) VALUES (31, 'Can delete expense', 9, 'delete_expense');
INSERT INTO `auth_permission` (`id`, `name`, `content_type_id`, `codename`) VALUES (32, 'Can view expense', 9, 'view_expense');
INSERT INTO `auth_permission` (`id`, `name`, `content_type_id`, `codename`) VALUES (33, 'Can add approval', 7, 'add_approval');
INSERT INTO `auth_permission` (`id`, `name`, `content_type_id`, `codename`) VALUES (34, 'Can change approval', 7, 'change_approval');
INSERT INTO `auth_permission` (`id`, `name`, `content_type_id`, `codename`) VALUES (35, 'Can delete approval', 7, 'delete_approval');
INSERT INTO `auth_permission` (`id`, `name`, `content_type_id`, `codename`) VALUES (36, 'Can view approval', 7, 'view_approval');
INSERT INTO `auth_permission` (`id`, `name`, `content_type_id`, `codename`) VALUES (37, 'Can add activity', 10, 'add_activity');
INSERT INTO `auth_permission` (`id`, `name`, `content_type_id`, `codename`) VALUES (38, 'Can change activity', 10, 'change_activity');
INSERT INTO `auth_permission` (`id`, `name`, `content_type_id`, `codename`) VALUES (39, 'Can delete activity', 10, 'delete_activity');
INSERT INTO `auth_permission` (`id`, `name`, `content_type_id`, `codename`) VALUES (40, 'Can view activity', 10, 'view_activity');
INSERT INTO `auth_permission` (`id`, `name`, `content_type_id`, `codename`) VALUES (41, 'Can add resource', 12, 'add_resource');
INSERT INTO `auth_permission` (`id`, `name`, `content_type_id`, `codename`) VALUES (42, 'Can change resource', 12, 'change_resource');
INSERT INTO `auth_permission` (`id`, `name`, `content_type_id`, `codename`) VALUES (43, 'Can delete resource', 12, 'delete_resource');
INSERT INTO `auth_permission` (`id`, `name`, `content_type_id`, `codename`) VALUES (44, 'Can view resource', 12, 'view_resource');
INSERT INTO `auth_permission` (`id`, `name`, `content_type_id`, `codename`) VALUES (45, 'Can add allocation', 11, 'add_allocation');
INSERT INTO `auth_permission` (`id`, `name`, `content_type_id`, `codename`) VALUES (46, 'Can change allocation', 11, 'change_allocation');
INSERT INTO `auth_permission` (`id`, `name`, `content_type_id`, `codename`) VALUES (47, 'Can delete allocation', 11, 'delete_allocation');
INSERT INTO `auth_permission` (`id`, `name`, `content_type_id`, `codename`) VALUES (48, 'Can view allocation', 11, 'view_allocation');

-- Data: django_content_type (12 row(s))
INSERT INTO `django_content_type` (`id`, `app_label`, `model`) VALUES (10, 'activities', 'activity');
INSERT INTO `django_content_type` (`id`, `app_label`, `model`) VALUES (1, 'admin', 'logentry');
INSERT INTO `django_content_type` (`id`, `app_label`, `model`) VALUES (2, 'auth', 'group');
INSERT INTO `django_content_type` (`id`, `app_label`, `model`) VALUES (3, 'auth', 'permission');
INSERT INTO `django_content_type` (`id`, `app_label`, `model`) VALUES (4, 'contenttypes', 'contenttype');
INSERT INTO `django_content_type` (`id`, `app_label`, `model`) VALUES (7, 'finance', 'approval');
INSERT INTO `django_content_type` (`id`, `app_label`, `model`) VALUES (8, 'finance', 'budget');
INSERT INTO `django_content_type` (`id`, `app_label`, `model`) VALUES (9, 'finance', 'expense');
INSERT INTO `django_content_type` (`id`, `app_label`, `model`) VALUES (11, 'resources', 'allocation');
INSERT INTO `django_content_type` (`id`, `app_label`, `model`) VALUES (12, 'resources', 'resource');
INSERT INTO `django_content_type` (`id`, `app_label`, `model`) VALUES (5, 'sessions', 'session');
INSERT INTO `django_content_type` (`id`, `app_label`, `model`) VALUES (6, 'users', 'user');

-- Data: django_migrations (22 row(s))
INSERT INTO `django_migrations` (`id`, `app`, `name`, `applied`) VALUES (1, 'contenttypes', '0001_initial', '2026-06-21 22:42:33.812889');
INSERT INTO `django_migrations` (`id`, `app`, `name`, `applied`) VALUES (2, 'contenttypes', '0002_remove_content_type_name', '2026-06-21 22:42:34.109327');
INSERT INTO `django_migrations` (`id`, `app`, `name`, `applied`) VALUES (3, 'auth', '0001_initial', '2026-06-21 22:42:35.355724');
INSERT INTO `django_migrations` (`id`, `app`, `name`, `applied`) VALUES (4, 'auth', '0002_alter_permission_name_max_length', '2026-06-21 22:42:35.563436');
INSERT INTO `django_migrations` (`id`, `app`, `name`, `applied`) VALUES (5, 'auth', '0003_alter_user_email_max_length', '2026-06-21 22:42:35.580488');
INSERT INTO `django_migrations` (`id`, `app`, `name`, `applied`) VALUES (6, 'auth', '0004_alter_user_username_opts', '2026-06-21 22:42:35.597294');
INSERT INTO `django_migrations` (`id`, `app`, `name`, `applied`) VALUES (7, 'auth', '0005_alter_user_last_login_null', '2026-06-21 22:42:35.614333');
INSERT INTO `django_migrations` (`id`, `app`, `name`, `applied`) VALUES (8, 'auth', '0006_require_contenttypes_0002', '2026-06-21 22:42:35.625058');
INSERT INTO `django_migrations` (`id`, `app`, `name`, `applied`) VALUES (9, 'auth', '0007_alter_validators_add_error_messages', '2026-06-21 22:42:35.640608');
INSERT INTO `django_migrations` (`id`, `app`, `name`, `applied`) VALUES (10, 'auth', '0008_alter_user_username_max_length', '2026-06-21 22:42:35.658260');
INSERT INTO `django_migrations` (`id`, `app`, `name`, `applied`) VALUES (11, 'auth', '0009_alter_user_last_name_max_length', '2026-06-21 22:42:35.674563');
INSERT INTO `django_migrations` (`id`, `app`, `name`, `applied`) VALUES (12, 'auth', '0010_alter_group_name_max_length', '2026-06-21 22:42:35.713687');
INSERT INTO `django_migrations` (`id`, `app`, `name`, `applied`) VALUES (13, 'auth', '0011_update_proxy_permissions', '2026-06-21 22:42:35.732350');
INSERT INTO `django_migrations` (`id`, `app`, `name`, `applied`) VALUES (14, 'auth', '0012_alter_user_first_name_max_length', '2026-06-21 22:42:35.751422');
INSERT INTO `django_migrations` (`id`, `app`, `name`, `applied`) VALUES (15, 'users', '0001_initial', '2026-06-21 22:42:36.898520');
INSERT INTO `django_migrations` (`id`, `app`, `name`, `applied`) VALUES (16, 'activities', '0001_initial', '2026-06-21 22:42:37.213649');
INSERT INTO `django_migrations` (`id`, `app`, `name`, `applied`) VALUES (17, 'admin', '0001_initial', '2026-06-21 22:42:37.692405');
INSERT INTO `django_migrations` (`id`, `app`, `name`, `applied`) VALUES (18, 'admin', '0002_logentry_remove_auto_add', '2026-06-21 22:42:37.715647');
INSERT INTO `django_migrations` (`id`, `app`, `name`, `applied`) VALUES (19, 'admin', '0003_logentry_add_action_flag_choices', '2026-06-21 22:42:37.740169');
INSERT INTO `django_migrations` (`id`, `app`, `name`, `applied`) VALUES (20, 'finance', '0001_initial', '2026-06-21 22:42:38.799640');
INSERT INTO `django_migrations` (`id`, `app`, `name`, `applied`) VALUES (21, 'resources', '0001_initial', '2026-06-21 22:42:39.686212');
INSERT INTO `django_migrations` (`id`, `app`, `name`, `applied`) VALUES (22, 'sessions', '0001_initial', '2026-06-21 22:42:39.905019');

-- Data: finance_budget (2 row(s))
INSERT INTO `finance_budget` (`id`, `department`, `total_amount`, `allocated_date`, `fiscal_year`) VALUES (1, 'Engineering', '50000.00', '2026-06-22', '2026-2027');
INSERT INTO `finance_budget` (`id`, `department`, `total_amount`, `allocated_date`, `fiscal_year`) VALUES (2, 'Marketing', '20000.00', '2026-06-22', '2026-2027');

-- Data: resources_resource (3 row(s))
INSERT INTO `resources_resource` (`id`, `name`, `description`, `status`) VALUES (1, 'Conference Room A', 'Main conference room on 3rd floor', 'AVAILABLE');
INSERT INTO `resources_resource` (`id`, `name`, `description`, `status`) VALUES (2, 'Laptop B', 'Departmental testing laptop', 'AVAILABLE');
INSERT INTO `resources_resource` (`id`, `name`, `description`, `status`) VALUES (3, 'Projector C', 'Portable HDMI projector', 'AVAILABLE');

-- Data: users_user (3 row(s))
INSERT INTO `users_user` (`id`, `password`, `last_login`, `is_superuser`, `username`, `first_name`, `last_name`, `email`, `is_staff`, `is_active`, `date_joined`, `role`, `department`) VALUES (1, 'pbkdf2_sha256$1200000$YqzUL8Xh9vozFD7qc5ebLj$pPIueA/gTMSyzoPT6uFEv44tZkFaYE/S0kgZ5Hk2mvw=', NULL, 1, 'Momo', '', '', 'admin@department.com', 1, 1, '2026-06-21 22:42:58.118035', 'ADMIN', 'Administration');
INSERT INTO `users_user` (`id`, `password`, `last_login`, `is_superuser`, `username`, `first_name`, `last_name`, `email`, `is_staff`, `is_active`, `date_joined`, `role`, `department`) VALUES (2, 'pbkdf2_sha256$1200000$SwGf2QOPM7Yp9ZTwEf14YT$fZ1r63Gt1bkG2Rq1qIlyg/XADj5sUSX85t2hdheZxKw=', NULL, 0, 'manager', '', '', 'manager@department.com', 0, 1, '2026-06-21 22:42:59.705586', 'MANAGER', 'Engineering');
INSERT INTO `users_user` (`id`, `password`, `last_login`, `is_superuser`, `username`, `first_name`, `last_name`, `email`, `is_staff`, `is_active`, `date_joined`, `role`, `department`) VALUES (3, 'pbkdf2_sha256$1200000$wFoOiyKXeSrctZz5Y5SdZg$7CmJFp8aqAqMCMv7ZQDN2tZeL7cA8dF4UQaqj0BFfho=', NULL, 0, 'staff', '', '', 'staff@department.com', 0, 1, '2026-06-21 22:43:01.189696', 'STAFF', 'Engineering');

SET FOREIGN_KEY_CHECKS = 1;

-- End of export