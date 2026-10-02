-- MySQL dump 10.13  Distrib 8.0.46, for Win64 (x86_64)
--
-- Host: localhost    Database: departmental_management_system
-- ------------------------------------------------------
-- Server version	8.0.46

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
-- Current Database: `departmental_management_system`
--

CREATE DATABASE /*!32312 IF NOT EXISTS*/ `departmental_management_system` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci */ /*!80016 DEFAULT ENCRYPTION='N' */;

USE `departmental_management_system`;

--
-- Table structure for table `activities`
--

DROP TABLE IF EXISTS `activities`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `activities` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `title` varchar(200) COLLATE utf8mb4_general_ci NOT NULL,
  `description` longtext COLLATE utf8mb4_general_ci NOT NULL,
  `start_date` datetime(6) NOT NULL,
  `end_date` datetime(6) NOT NULL,
  `organizer_id` bigint NOT NULL,
  `google_calendar_link` longtext COLLATE utf8mb4_general_ci NOT NULL,
  `include_all_staff` tinyint(1) NOT NULL,
  `reminder_minutes_before` int unsigned NOT NULL,
  `send_email_reminders` tinyint(1) NOT NULL,
  `activity_type_id` bigint DEFAULT NULL,
  `created_at` datetime(6) DEFAULT NULL,
  `external_participants` longtext COLLATE utf8mb4_general_ci NOT NULL,
  `google_event_id` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `location` varchar(200) COLLATE utf8mb4_general_ci NOT NULL,
  `notes` longtext COLLATE utf8mb4_general_ci NOT NULL,
  `sequence` int unsigned NOT NULL,
  `status` varchar(30) COLLATE utf8mb4_general_ci NOT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  `approval_status` varchar(20) COLLATE utf8mb4_general_ci NOT NULL,
  `rejection_reason` longtext COLLATE utf8mb4_general_ci NOT NULL,
  `reviewed_at` datetime(6) DEFAULT NULL,
  `reviewed_by_id` bigint DEFAULT NULL,
  `submitted_at` datetime(6) DEFAULT NULL,
  `submitted_by_id` bigint DEFAULT NULL,
  `meeting_link` varchar(500) COLLATE utf8mb4_general_ci NOT NULL,
  `meeting_mode` varchar(20) COLLATE utf8mb4_general_ci NOT NULL,
  `meeting_platform` varchar(30) COLLATE utf8mb4_general_ci NOT NULL,
  PRIMARY KEY (`id`),
  KEY `activities_activity_organizer_id_1d5df7db_fk_users_user_id` (`organizer_id`),
  KEY `fk_activities_type` (`activity_type_id`),
  KEY `activities_reviewed_by_id_9c1a15e4_fk_users_id` (`reviewed_by_id`),
  KEY `activities_submitted_by_id_0c395fcb_fk_users_id` (`submitted_by_id`),
  CONSTRAINT `activities_activity_organizer_id_1d5df7db_fk_users_user_id` FOREIGN KEY (`organizer_id`) REFERENCES `users` (`id`),
  CONSTRAINT `activities_reviewed_by_id_9c1a15e4_fk_users_id` FOREIGN KEY (`reviewed_by_id`) REFERENCES `users` (`id`),
  CONSTRAINT `activities_submitted_by_id_0c395fcb_fk_users_id` FOREIGN KEY (`submitted_by_id`) REFERENCES `users` (`id`),
  CONSTRAINT `fk_activities_type` FOREIGN KEY (`activity_type_id`) REFERENCES `activity_types` (`id`) ON DELETE SET NULL,
  CONSTRAINT `activities_chk_1` CHECK ((`reminder_minutes_before` >= 0)),
  CONSTRAINT `activities_chk_2` CHECK ((`sequence` >= 0))
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `activities`
--

LOCK TABLES `activities` WRITE;
/*!40000 ALTER TABLE `activities` DISABLE KEYS */;
INSERT INTO `activities` VALUES (11,'Quick meeting','We are testing the systems\'s functionality','2026-10-01 21:10:00.000000','2026-10-01 21:20:00.000000',12,'https://calendar.google.com/calendar/render?action=TEMPLATE&text=Quick+meeting&details=We+are+testing+the+systems%27s+functionality%0A%0AJoin+meeting%3A+https%3A%2F%2Fmeet.google.com%2Ffws-tzzi-daf&dates=20261001T211000Z%2F20261001T212000Z&location=https%3A%2F%2Fmeet.google.com%2Ffws-tzzi-daf',1,5,1,3,'2026-10-01 16:59:17.086688','mwansanandala02@gmail.com\nkaluwenoria@gmail.com',NULL,'','',1,'SCHEDULED','2026-10-01 17:07:49.136356','APPROVED','','2026-10-01 16:59:17.085457',12,'2026-10-01 16:59:17.086619',12,'https://meet.google.com/fws-tzzi-daf','ONLINE','GOOGLE_MEET');
/*!40000 ALTER TABLE `activities` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `activities_participant_categories`
--

DROP TABLE IF EXISTS `activities_participant_categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `activities_participant_categories` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `activity_id` bigint NOT NULL,
  `usergroupcategory_id` bigint NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `activities_participant_c_activity_id_usergroupcat_1da9772f_uniq` (`activity_id`,`usergroupcategory_id`),
  KEY `activities_participa_usergroupcategory_id_c00f92cf_fk_user_grou` (`usergroupcategory_id`),
  CONSTRAINT `activities_participa_activity_id_127339e7_fk_activitie` FOREIGN KEY (`activity_id`) REFERENCES `activities` (`id`),
  CONSTRAINT `activities_participa_usergroupcategory_id_c00f92cf_fk_user_grou` FOREIGN KEY (`usergroupcategory_id`) REFERENCES `user_group_categories` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `activities_participant_categories`
--

LOCK TABLES `activities_participant_categories` WRITE;
/*!40000 ALTER TABLE `activities_participant_categories` DISABLE KEYS */;
/*!40000 ALTER TABLE `activities_participant_categories` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `activities_participants`
--

DROP TABLE IF EXISTS `activities_participants`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `activities_participants` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `activity_id` bigint NOT NULL,
  `user_id` bigint NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `activities_participants_activity_id_user_id_36024222_uniq` (`activity_id`,`user_id`),
  KEY `activities_participants_user_id_435ba769_fk_users_id` (`user_id`),
  CONSTRAINT `activities_participants_activity_id_cad4a637_fk_activities_id` FOREIGN KEY (`activity_id`) REFERENCES `activities` (`id`),
  CONSTRAINT `activities_participants_user_id_435ba769_fk_users_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `activities_participants`
--

LOCK TABLES `activities_participants` WRITE;
/*!40000 ALTER TABLE `activities_participants` DISABLE KEYS */;
/*!40000 ALTER TABLE `activities_participants` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `activities_recipient_groups`
--

DROP TABLE IF EXISTS `activities_recipient_groups`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `activities_recipient_groups` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `activity_id` bigint NOT NULL,
  `recipientgroup_id` bigint NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `activities_recipient_gro_activity_id_recipientgro_c66f44b0_uniq` (`activity_id`,`recipientgroup_id`),
  KEY `activities_recipient_recipientgroup_id_6919b689_fk_recipient` (`recipientgroup_id`),
  CONSTRAINT `activities_recipient_activity_id_c42baf73_fk_activitie` FOREIGN KEY (`activity_id`) REFERENCES `activities` (`id`),
  CONSTRAINT `activities_recipient_recipientgroup_id_6919b689_fk_recipient` FOREIGN KEY (`recipientgroup_id`) REFERENCES `recipient_groups` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `activities_recipient_groups`
--

LOCK TABLES `activities_recipient_groups` WRITE;
/*!40000 ALTER TABLE `activities_recipient_groups` DISABLE KEYS */;
/*!40000 ALTER TABLE `activities_recipient_groups` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `activity_types`
--

DROP TABLE IF EXISTS `activity_types`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `activity_types` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `description` longtext NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime(6) NOT NULL,
  `created_by_id` bigint DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`),
  KEY `fk_act_type_user` (`created_by_id`),
  CONSTRAINT `fk_act_type_user` FOREIGN KEY (`created_by_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `activity_types`
--

LOCK TABLES `activity_types` WRITE;
/*!40000 ALTER TABLE `activity_types` DISABLE KEYS */;
INSERT INTO `activity_types` VALUES (3,'Academic Seminar','Research talks, guest presentations, and academic lectures',1,'2026-09-21 23:57:19.641648',NULL),(15,'Staff Briefing','',1,'2026-10-01 20:42:23.034866',12),(16,'Project Defense','',1,'2026-10-01 20:43:12.707616',12);
/*!40000 ALTER TABLE `activity_types` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `allocations`
--

DROP TABLE IF EXISTS `allocations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `allocations` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `start_time` datetime(6) NOT NULL,
  `end_time` datetime(6) NOT NULL,
  `activity_id` bigint DEFAULT NULL,
  `allocated_to_id` bigint NOT NULL,
  `resource_id` bigint NOT NULL,
  `created_at` datetime(6) DEFAULT NULL,
  `notes` longtext COLLATE utf8mb4_general_ci NOT NULL,
  `purpose` varchar(200) COLLATE utf8mb4_general_ci NOT NULL,
  `rejection_reason` longtext COLLATE utf8mb4_general_ci NOT NULL,
  `reviewed_at` datetime(6) DEFAULT NULL,
  `reviewed_by_id` bigint DEFAULT NULL,
  `status` varchar(20) COLLATE utf8mb4_general_ci NOT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `resources_allocation_activity_id_44ef4dd9_fk_activitie` (`activity_id`),
  KEY `resources_allocation_allocated_to_id_cc556905_fk_users_user_id` (`allocated_to_id`),
  KEY `resources_allocation_resource_id_e9e943ae_fk_resources` (`resource_id`),
  KEY `allocations_reviewed_by_id_749089b4_fk_users_id` (`reviewed_by_id`),
  CONSTRAINT `allocations_reviewed_by_id_749089b4_fk_users_id` FOREIGN KEY (`reviewed_by_id`) REFERENCES `users` (`id`),
  CONSTRAINT `resources_allocation_activity_id_44ef4dd9_fk_activitie` FOREIGN KEY (`activity_id`) REFERENCES `activities` (`id`),
  CONSTRAINT `resources_allocation_allocated_to_id_cc556905_fk_users_user_id` FOREIGN KEY (`allocated_to_id`) REFERENCES `users` (`id`),
  CONSTRAINT `resources_allocation_resource_id_e9e943ae_fk_resources` FOREIGN KEY (`resource_id`) REFERENCES `resources` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `allocations`
--

LOCK TABLES `allocations` WRITE;
/*!40000 ALTER TABLE `allocations` DISABLE KEYS */;
/*!40000 ALTER TABLE `allocations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `approvals`
--

DROP TABLE IF EXISTS `approvals`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `approvals` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `date_approved` datetime(6) NOT NULL,
  `comments` longtext COLLATE utf8mb4_general_ci,
  `approved_by_id` bigint NOT NULL,
  `expense_id` bigint NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `expense_id` (`expense_id`),
  KEY `finance_approval_approved_by_id_a5d9f97d_fk_users_user_id` (`approved_by_id`),
  CONSTRAINT `finance_approval_approved_by_id_a5d9f97d_fk_users_user_id` FOREIGN KEY (`approved_by_id`) REFERENCES `users` (`id`),
  CONSTRAINT `finance_approval_expense_id_922fcc9e_fk_finance_expense_id` FOREIGN KEY (`expense_id`) REFERENCES `expenses` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `approvals`
--

LOCK TABLES `approvals` WRITE;
/*!40000 ALTER TABLE `approvals` DISABLE KEYS */;
INSERT INTO `approvals` VALUES (5,'2026-09-21 09:21:00.714330','',5,6),(6,'2026-09-21 12:31:55.116791','',5,8),(7,'2026-09-21 17:30:18.973420','',13,10),(8,'2026-09-21 17:32:50.212026','',13,11);
/*!40000 ALTER TABLE `approvals` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `auth_group`
--

DROP TABLE IF EXISTS `auth_group`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `auth_group` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(150) COLLATE utf8mb4_general_ci NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `auth_group`
--

LOCK TABLES `auth_group` WRITE;
/*!40000 ALTER TABLE `auth_group` DISABLE KEYS */;
/*!40000 ALTER TABLE `auth_group` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `auth_group_permissions`
--

DROP TABLE IF EXISTS `auth_group_permissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `auth_group_permissions`
--

LOCK TABLES `auth_group_permissions` WRITE;
/*!40000 ALTER TABLE `auth_group_permissions` DISABLE KEYS */;
/*!40000 ALTER TABLE `auth_group_permissions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `auth_permission`
--

DROP TABLE IF EXISTS `auth_permission`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `auth_permission` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `content_type_id` int NOT NULL,
  `codename` varchar(100) COLLATE utf8mb4_general_ci NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `auth_permission_content_type_id_codename_01ab375a_uniq` (`content_type_id`,`codename`),
  CONSTRAINT `auth_permission_content_type_id_2f476e4b_fk_django_co` FOREIGN KEY (`content_type_id`) REFERENCES `django_content_type` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=129 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `auth_permission`
--

LOCK TABLES `auth_permission` WRITE;
/*!40000 ALTER TABLE `auth_permission` DISABLE KEYS */;
INSERT INTO `auth_permission` VALUES (1,'Can add log entry',1,'add_logentry'),(2,'Can change log entry',1,'change_logentry'),(3,'Can delete log entry',1,'delete_logentry'),(4,'Can view log entry',1,'view_logentry'),(5,'Can add permission',3,'add_permission'),(6,'Can change permission',3,'change_permission'),(7,'Can delete permission',3,'delete_permission'),(8,'Can view permission',3,'view_permission'),(9,'Can add group',2,'add_group'),(10,'Can change group',2,'change_group'),(11,'Can delete group',2,'delete_group'),(12,'Can view group',2,'view_group'),(13,'Can add content type',4,'add_contenttype'),(14,'Can change content type',4,'change_contenttype'),(15,'Can delete content type',4,'delete_contenttype'),(16,'Can view content type',4,'view_contenttype'),(17,'Can add session',5,'add_session'),(18,'Can change session',5,'change_session'),(19,'Can delete session',5,'delete_session'),(20,'Can view session',5,'view_session'),(21,'Can add user',6,'add_user'),(22,'Can change user',6,'change_user'),(23,'Can delete user',6,'delete_user'),(24,'Can view user',6,'view_user'),(25,'Can add budget',8,'add_budget'),(26,'Can change budget',8,'change_budget'),(27,'Can delete budget',8,'delete_budget'),(28,'Can view budget',8,'view_budget'),(29,'Can add expense',9,'add_expense'),(30,'Can change expense',9,'change_expense'),(31,'Can delete expense',9,'delete_expense'),(32,'Can view expense',9,'view_expense'),(33,'Can add approval',7,'add_approval'),(34,'Can change approval',7,'change_approval'),(35,'Can delete approval',7,'delete_approval'),(36,'Can view approval',7,'view_approval'),(37,'Can add activity',10,'add_activity'),(38,'Can change activity',10,'change_activity'),(39,'Can delete activity',10,'delete_activity'),(40,'Can view activity',10,'view_activity'),(41,'Can add resource',12,'add_resource'),(42,'Can change resource',12,'change_resource'),(43,'Can delete resource',12,'delete_resource'),(44,'Can view resource',12,'view_resource'),(45,'Can add allocation',11,'add_allocation'),(46,'Can change allocation',11,'change_allocation'),(47,'Can delete allocation',11,'delete_allocation'),(48,'Can view allocation',11,'view_allocation'),(49,'Can add budget transaction',13,'add_budgettransaction'),(50,'Can change budget transaction',13,'change_budgettransaction'),(51,'Can delete budget transaction',13,'delete_budgettransaction'),(52,'Can view budget transaction',13,'view_budgettransaction'),(53,'Can add income',14,'add_income'),(54,'Can change income',14,'change_income'),(55,'Can delete income',14,'delete_income'),(56,'Can view income',14,'view_income'),(73,'Can add user group category',19,'add_usergroupcategory'),(74,'Can change user group category',19,'change_usergroupcategory'),(75,'Can delete user group category',19,'delete_usergroupcategory'),(76,'Can view user group category',19,'view_usergroupcategory'),(77,'Can add financial summary request',20,'add_financialsummaryrequest'),(78,'Can change financial summary request',20,'change_financialsummaryrequest'),(79,'Can delete financial summary request',20,'delete_financialsummaryrequest'),(80,'Can view financial summary request',20,'view_financialsummaryrequest'),(81,'Can add resource category',21,'add_resourcecategory'),(82,'Can change resource category',21,'change_resourcecategory'),(83,'Can delete resource category',21,'delete_resourcecategory'),(84,'Can view resource category',21,'view_resourcecategory'),(85,'Can add finance notification',23,'add_financenotification'),(86,'Can change finance notification',23,'change_financenotification'),(87,'Can delete finance notification',23,'delete_financenotification'),(88,'Can view finance notification',23,'view_financenotification'),(89,'Can add finance audit log',22,'add_financeauditlog'),(90,'Can change finance audit log',22,'change_financeauditlog'),(91,'Can delete finance audit log',22,'delete_financeauditlog'),(92,'Can view finance audit log',22,'view_financeauditlog'),(93,'Can add notification',24,'add_notification'),(94,'Can change notification',24,'change_notification'),(95,'Can delete notification',24,'delete_notification'),(96,'Can view notification',24,'view_notification'),(97,'Can add recipient group',25,'add_recipientgroup'),(98,'Can change recipient group',25,'change_recipientgroup'),(99,'Can delete recipient group',25,'delete_recipientgroup'),(100,'Can view recipient group',25,'view_recipientgroup'),(101,'Can add resource inspection',26,'add_resourceinspection'),(102,'Can change resource inspection',26,'change_resourceinspection'),(103,'Can delete resource inspection',26,'delete_resourceinspection'),(104,'Can view resource inspection',26,'view_resourceinspection'),(105,'Can add resource location history',27,'add_resourcelocationhistory'),(106,'Can change resource location history',27,'change_resourcelocationhistory'),(107,'Can delete resource location history',27,'delete_resourcelocationhistory'),(108,'Can view resource location history',27,'view_resourcelocationhistory'),(109,'Can add activity type',28,'add_activitytype'),(110,'Can change activity type',28,'change_activitytype'),(111,'Can delete activity type',28,'delete_activitytype'),(112,'Can view activity type',28,'view_activitytype'),(113,'Can add resource status history',29,'add_resourcestatushistory'),(114,'Can change resource status history',29,'change_resourcestatushistory'),(115,'Can delete resource status history',29,'delete_resourcestatushistory'),(116,'Can view resource status history',29,'view_resourcestatushistory'),(117,'Can add departmental income',30,'add_departmentalincome'),(118,'Can change departmental income',30,'change_departmentalincome'),(119,'Can delete departmental income',30,'delete_departmentalincome'),(120,'Can view departmental income',30,'view_departmentalincome'),(121,'Can add departmental income allocation',31,'add_departmentalincomeallocation'),(122,'Can change departmental income allocation',31,'change_departmentalincomeallocation'),(123,'Can delete departmental income allocation',31,'delete_departmentalincomeallocation'),(124,'Can view departmental income allocation',31,'view_departmentalincomeallocation'),(125,'Can add resource report request',32,'add_resourcereportrequest'),(126,'Can change resource report request',32,'change_resourcereportrequest'),(127,'Can delete resource report request',32,'delete_resourcereportrequest'),(128,'Can view resource report request',32,'view_resourcereportrequest');
/*!40000 ALTER TABLE `auth_permission` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `budgets`
--

DROP TABLE IF EXISTS `budgets`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `budgets` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `department` varchar(100) COLLATE utf8mb4_general_ci NOT NULL,
  `total_amount` decimal(12,2) NOT NULL,
  `allocated_date` date NOT NULL,
  `fiscal_year` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `current_balance` decimal(12,2) NOT NULL,
  `end_date` date DEFAULT NULL,
  `start_date` date DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `budgets`
--

LOCK TABLES `budgets` WRITE;
/*!40000 ALTER TABLE `budgets` DISABLE KEYS */;
INSERT INTO `budgets` VALUES (6,'IT AND HARDWARE',85000.00,'2026-09-21',NULL,84000.00,'2026-12-21','2026-09-21'),(7,'office equipment and stationary',35000.00,'2026-09-21',NULL,29750.00,'2026-12-21','2026-09-21');
/*!40000 ALTER TABLE `budgets` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `departmental_income`
--

DROP TABLE IF EXISTS `departmental_income`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `departmental_income` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `reference` varchar(24) COLLATE utf8mb4_general_ci NOT NULL,
  `source_name` varchar(160) COLLATE utf8mb4_general_ci NOT NULL,
  `description` longtext COLLATE utf8mb4_general_ci NOT NULL,
  `amount` decimal(12,2) NOT NULL,
  `unallocated_amount` decimal(12,2) NOT NULL,
  `date_received` date NOT NULL,
  `external_reference` varchar(120) COLLATE utf8mb4_general_ci NOT NULL,
  `allocation_status` varchar(30) COLLATE utf8mb4_general_ci NOT NULL,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  `recorded_by_id` bigint NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `reference` (`reference`),
  KEY `departmental_income_recorded_by_id_94b4a2b9_fk_users_id` (`recorded_by_id`),
  CONSTRAINT `departmental_income_recorded_by_id_94b4a2b9_fk_users_id` FOREIGN KEY (`recorded_by_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `departmental_income`
--

LOCK TABLES `departmental_income` WRITE;
/*!40000 ALTER TABLE `departmental_income` DISABLE KEYS */;
INSERT INTO `departmental_income` VALUES (1,'INC-991EF7C1B3','cisco cources','this is the money received from the extra lessons (cisco) offered by the department',13200.00,8200.00,'2026-10-01','txn-9937268','PARTIALLY_ALLOCATED','2026-10-01 16:51:41.348110','2026-10-01 18:23:43.813536',12);
/*!40000 ALTER TABLE `departmental_income` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `departmental_income_allocations`
--

DROP TABLE IF EXISTS `departmental_income_allocations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `departmental_income_allocations` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `reference` varchar(24) COLLATE utf8mb4_general_ci NOT NULL,
  `amount` decimal(12,2) NOT NULL,
  `allocated_at` datetime(6) NOT NULL,
  `notes` longtext COLLATE utf8mb4_general_ci NOT NULL,
  `allocated_by_id` bigint NOT NULL,
  `budget_id` bigint NOT NULL,
  `income_id` bigint NOT NULL,
  `transaction_id` bigint DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `reference` (`reference`),
  UNIQUE KEY `transaction_id` (`transaction_id`),
  KEY `departmental_income_a_allocated_by_id_bcbd2e25_fk_users_id` (`allocated_by_id`),
  KEY `departmental_income_allocations_budget_id_bd710f66_fk_budgets_id` (`budget_id`),
  KEY `departmental_income__income_id_719ca894_fk_departmen` (`income_id`),
  CONSTRAINT `departmental_income__income_id_719ca894_fk_departmen` FOREIGN KEY (`income_id`) REFERENCES `departmental_income` (`id`),
  CONSTRAINT `departmental_income__transaction_id_1f15996b_fk_transacti` FOREIGN KEY (`transaction_id`) REFERENCES `transactions` (`id`),
  CONSTRAINT `departmental_income_a_allocated_by_id_bcbd2e25_fk_users_id` FOREIGN KEY (`allocated_by_id`) REFERENCES `users` (`id`),
  CONSTRAINT `departmental_income_allocations_budget_id_bd710f66_fk_budgets_id` FOREIGN KEY (`budget_id`) REFERENCES `budgets` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `departmental_income_allocations`
--

LOCK TABLES `departmental_income_allocations` WRITE;
/*!40000 ALTER TABLE `departmental_income_allocations` DISABLE KEYS */;
INSERT INTO `departmental_income_allocations` VALUES (1,'IAL-64DF05F397',5000.00,'2026-10-01 18:23:43.833744','Purchasing switches for cisco classes',12,6,1,15);
/*!40000 ALTER TABLE `departmental_income_allocations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `django_admin_log`
--

DROP TABLE IF EXISTS `django_admin_log`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
  CONSTRAINT `django_admin_log_user_id_c564eba6_fk_users_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`),
  CONSTRAINT `django_admin_log_chk_1` CHECK ((`action_flag` >= 0))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `django_admin_log`
--

LOCK TABLES `django_admin_log` WRITE;
/*!40000 ALTER TABLE `django_admin_log` DISABLE KEYS */;
/*!40000 ALTER TABLE `django_admin_log` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `django_content_type`
--

DROP TABLE IF EXISTS `django_content_type`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `django_content_type` (
  `id` int NOT NULL AUTO_INCREMENT,
  `app_label` varchar(100) COLLATE utf8mb4_general_ci NOT NULL,
  `model` varchar(100) COLLATE utf8mb4_general_ci NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `django_content_type_app_label_model_76bd3d3b_uniq` (`app_label`,`model`)
) ENGINE=InnoDB AUTO_INCREMENT=33 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `django_content_type`
--

LOCK TABLES `django_content_type` WRITE;
/*!40000 ALTER TABLE `django_content_type` DISABLE KEYS */;
INSERT INTO `django_content_type` VALUES (10,'activities','activity'),(28,'activities','activitytype'),(1,'admin','logentry'),(2,'auth','group'),(3,'auth','permission'),(4,'contenttypes','contenttype'),(7,'finance','approval'),(8,'finance','budget'),(13,'finance','budgettransaction'),(30,'finance','departmentalincome'),(31,'finance','departmentalincomeallocation'),(9,'finance','expense'),(22,'finance','financeauditlog'),(23,'finance','financenotification'),(20,'finance','financialsummaryrequest'),(14,'finance','income'),(11,'resources','allocation'),(12,'resources','resource'),(21,'resources','resourcecategory'),(26,'resources','resourceinspection'),(27,'resources','resourcelocationhistory'),(32,'resources','resourcereportrequest'),(29,'resources','resourcestatushistory'),(5,'sessions','session'),(24,'users','notification'),(25,'users','recipientgroup'),(6,'users','user'),(19,'users','usergroupcategory');
/*!40000 ALTER TABLE `django_content_type` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `django_migrations`
--

DROP TABLE IF EXISTS `django_migrations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `django_migrations` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `app` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `applied` datetime(6) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=58 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `django_migrations`
--

LOCK TABLES `django_migrations` WRITE;
/*!40000 ALTER TABLE `django_migrations` DISABLE KEYS */;
INSERT INTO `django_migrations` VALUES (1,'contenttypes','0001_initial','2026-06-21 22:42:33.812889'),(2,'contenttypes','0002_remove_content_type_name','2026-06-21 22:42:34.109327'),(3,'auth','0001_initial','2026-06-21 22:42:35.355724'),(4,'auth','0002_alter_permission_name_max_length','2026-06-21 22:42:35.563436'),(5,'auth','0003_alter_user_email_max_length','2026-06-21 22:42:35.580488'),(6,'auth','0004_alter_user_username_opts','2026-06-21 22:42:35.597294'),(7,'auth','0005_alter_user_last_login_null','2026-06-21 22:42:35.614333'),(8,'auth','0006_require_contenttypes_0002','2026-06-21 22:42:35.625058'),(9,'auth','0007_alter_validators_add_error_messages','2026-06-21 22:42:35.640608'),(10,'auth','0008_alter_user_username_max_length','2026-06-21 22:42:35.658260'),(11,'auth','0009_alter_user_last_name_max_length','2026-06-21 22:42:35.674563'),(12,'auth','0010_alter_group_name_max_length','2026-06-21 22:42:35.713687'),(13,'auth','0011_update_proxy_permissions','2026-06-21 22:42:35.732350'),(14,'auth','0012_alter_user_first_name_max_length','2026-06-21 22:42:35.751422'),(15,'users','0001_initial','2026-06-21 22:42:36.898520'),(16,'activities','0001_initial','2026-06-21 22:42:37.213649'),(17,'admin','0001_initial','2026-06-21 22:42:37.692405'),(18,'admin','0002_logentry_remove_auto_add','2026-06-21 22:42:37.715647'),(19,'admin','0003_logentry_add_action_flag_choices','2026-06-21 22:42:37.740169'),(20,'finance','0001_initial','2026-06-21 22:42:38.799640'),(21,'resources','0001_initial','2026-06-21 22:42:39.686212'),(22,'sessions','0001_initial','2026-06-21 22:42:39.905019'),(23,'resources','0002_resource_category','2026-08-28 23:06:36.876501'),(24,'finance','0002_budget_current_balance_budget_end_date_and_more','2026-08-29 21:08:03.068454'),(30,'users','0002_readable_table_name','2026-09-12 17:43:42.726285'),(31,'activities','0002_readable_table_name','2026-09-12 17:43:42.739408'),(32,'finance','0003_readable_table_names','2026-09-12 17:43:42.740146'),(33,'resources','0003_readable_table_names','2026-09-12 17:43:42.740727'),(34,'users','0003_alter_user_options','2026-09-15 12:29:41.135717'),(35,'users','0003_usergroupcategory_alter_user_options_and_more','2026-09-20 23:57:01.511057'),(36,'activities','0003_activity_google_calendar_link_and_more','2026-09-20 23:57:03.911093'),(37,'finance','0004_financialsummaryrequest','2026-09-20 23:57:04.632498'),(38,'resources','0004_resource_assigned_room_resource_resource_id_and_more','2026-09-20 23:57:06.613738'),(39,'finance','0005_expense_rejection_reason','2026-09-21 09:19:57.743158'),(40,'finance','0006_budgettransaction_refund_choice','2026-09-21 09:19:57.777544'),(41,'users','0004_user_has_finance_balance_access','2026-09-21 09:19:58.055514'),(42,'finance','0007_financialsummaryrequest_report_fields','2026-09-21 09:38:55.857468'),(43,'finance','0008_finance_workflow_overhaul','2026-09-21 11:17:58.804591'),(44,'finance','0009_alter_budget_options_alter_budgettransaction_options_and_more','2026-09-21 11:22:54.332031'),(45,'finance','0010_alter_financialsummaryrequest_report_format','2026-09-21 18:35:26.076197'),(46,'finance','0011_alter_financialsummaryrequest_report_format','2026-09-21 21:59:45.769146'),(47,'users','0005_notification_recipientgroup','2026-09-21 22:49:05.732978'),(48,'activities','0004_activity_activity_type_activity_created_at_and_more','2026-09-21 22:49:08.559846'),(49,'resources','0005_alter_resource_options_resource_condition_and_more','2026-09-21 22:49:12.249063'),(50,'activities','0005_activitytype_alter_activity_activity_type','2026-09-22 00:00:08.395668'),(51,'users','0006_recipientgroup_is_active_alter_notification_link_and_more','2026-09-22 00:00:11.483580'),(52,'activities','0006_activity_approval_status_activity_rejection_reason_and_more','2026-09-22 01:37:53.067065'),(53,'resources','0006_allocation_created_at_allocation_notes_and_more','2026-09-22 01:37:56.643131'),(54,'users','0007_alter_notification_notification_type','2026-09-22 01:37:56.713892'),(55,'activities','0007_activity_meeting_link_activity_meeting_mode_and_more','2026-10-01 16:37:54.979100'),(56,'finance','0012_financialsummaryrequest_budget_and_more','2026-10-01 16:37:58.198371'),(57,'resources','0007_resourcereportrequest','2026-10-01 20:15:20.021840');
/*!40000 ALTER TABLE `django_migrations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `django_session`
--

DROP TABLE IF EXISTS `django_session`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `django_session` (
  `session_key` varchar(40) COLLATE utf8mb4_general_ci NOT NULL,
  `session_data` longtext COLLATE utf8mb4_general_ci NOT NULL,
  `expire_date` datetime(6) NOT NULL,
  PRIMARY KEY (`session_key`),
  KEY `django_session_expire_date_a5c62663` (`expire_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `django_session`
--

LOCK TABLES `django_session` WRITE;
/*!40000 ALTER TABLE `django_session` DISABLE KEYS */;
/*!40000 ALTER TABLE `django_session` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `dms_notifications`
--

DROP TABLE IF EXISTS `dms_notifications`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `dms_notifications` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `notification_type` varchar(40) COLLATE utf8mb4_general_ci NOT NULL,
  `title` varchar(200) COLLATE utf8mb4_general_ci NOT NULL,
  `message` longtext COLLATE utf8mb4_general_ci NOT NULL,
  `link` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `is_read` tinyint(1) NOT NULL,
  `created_at` datetime(6) NOT NULL,
  `recipient_id` bigint NOT NULL,
  PRIMARY KEY (`id`),
  KEY `dms_notifications_recipient_id_c5ca1230_fk_users_id` (`recipient_id`),
  CONSTRAINT `dms_notifications_recipient_id_c5ca1230_fk_users_id` FOREIGN KEY (`recipient_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=91 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `dms_notifications`
--

LOCK TABLES `dms_notifications` WRITE;
/*!40000 ALTER TABLE `dms_notifications` DISABLE KEYS */;
INSERT INTO `dms_notifications` VALUES (1,'ACTIVITY_UPDATE','Activity Rescheduled: Comprehensive DMS Colloquium','The activity \"Comprehensive DMS Colloquium\" (Student Orientation & Induction) has been rescheduled to 15 Oct 2026 10:00 – 12:30.\n\nNote: Adjusted for keynote speaker flight schedule','/activities',1,'2026-09-22 00:47:50.347355',3),(2,'ACTIVITY_UPDATE','Activity Rescheduled: Comprehensive DMS Colloquium','The activity \"Comprehensive DMS Colloquium\" (Student Orientation & Induction) has been rescheduled to 15 Oct 2026 10:00 – 12:30.\n\nNote: Adjusted for keynote speaker flight schedule','/activities',1,'2026-09-22 00:47:50.384781',12),(3,'ACTIVITY_UPDATE','Activity Rescheduled: Comprehensive DMS Colloquium','The activity \"Comprehensive DMS Colloquium\" (Student Orientation & Induction) has been rescheduled to 15 Oct 2026 10:00 – 12:30.\n\nNote: Adjusted for keynote speaker flight schedule','/activities',0,'2026-09-22 00:47:50.404300',2),(4,'ACTIVITY_UPDATE','Activity Rescheduled: Comprehensive DMS Colloquium','The activity \"Comprehensive DMS Colloquium\" (Student Orientation & Induction) has been rescheduled to 15 Oct 2026 10:00 – 12:30.\n\nNote: Adjusted for keynote speaker flight schedule','/activities',1,'2026-09-22 00:47:50.423642',5),(5,'ACTIVITY_UPDATE','Activity Rescheduled: Comprehensive DMS Colloquium','The activity \"Comprehensive DMS Colloquium\" (Student Orientation & Induction) has been rescheduled to 15 Oct 2026 10:00 – 12:30.\n\nNote: Adjusted for keynote speaker flight schedule','/activities',1,'2026-09-22 00:47:50.439750',13),(6,'ACTIVITY_CANCEL','Activity Cancelled: Comprehensive DMS Colloquium','The activity \"Comprehensive DMS Colloquium\" (Student Orientation & Induction) scheduled for 15 Oct 2026 10:00 has been cancelled.\n\nReason: Postponed due to department retreat','/activities',1,'2026-09-22 00:47:50.537425',3),(7,'ACTIVITY_CANCEL','Activity Cancelled: Comprehensive DMS Colloquium','The activity \"Comprehensive DMS Colloquium\" (Student Orientation & Induction) scheduled for 15 Oct 2026 10:00 has been cancelled.\n\nReason: Postponed due to department retreat','/activities',1,'2026-09-22 00:47:50.554978',12),(8,'ACTIVITY_CANCEL','Activity Cancelled: Comprehensive DMS Colloquium','The activity \"Comprehensive DMS Colloquium\" (Student Orientation & Induction) scheduled for 15 Oct 2026 10:00 has been cancelled.\n\nReason: Postponed due to department retreat','/activities',0,'2026-09-22 00:47:50.571255',2),(9,'ACTIVITY_CANCEL','Activity Cancelled: Comprehensive DMS Colloquium','The activity \"Comprehensive DMS Colloquium\" (Student Orientation & Induction) scheduled for 15 Oct 2026 10:00 has been cancelled.\n\nReason: Postponed due to department retreat','/activities',1,'2026-09-22 00:47:50.590453',5),(10,'ACTIVITY_CANCEL','Activity Cancelled: Comprehensive DMS Colloquium','The activity \"Comprehensive DMS Colloquium\" (Student Orientation & Induction) scheduled for 15 Oct 2026 10:00 has been cancelled.\n\nReason: Postponed due to department retreat','/activities',1,'2026-09-22 00:47:50.608531',13),(11,'RESOURCE_APPROVED','Resource booking approved','Your booking for Lenovo has been approved.','/resources',1,'2026-09-22 01:50:13.705274',3),(12,'RESOURCE_BOOKING','New resource booking request','staff requested Lenovo from 2026-09-22 03:50:00+00:00 to 2026-09-22 03:51:00+00:00.','/resources',1,'2026-09-22 01:51:04.668345',5),(13,'RESOURCE_APPROVED','Resource booking approved','Your booking for Lenovo has been approved.','/resources',1,'2026-09-22 01:51:52.621273',3),(14,'GENERAL','New financial report request','FR-295B26B9BE requires review.','/finance',1,'2026-09-22 01:59:48.267464',5),(15,'GENERAL','New financial report request','FR-295B26B9BE requires review.','/finance',1,'2026-09-22 01:59:48.280315',13),(16,'REPORT_READY','Financial report ready','FR-295B26B9BE was approved and the report is ready.','/finance',1,'2026-09-22 02:00:30.174665',12),(17,'ACTIVITY_SUBMITTED','New activity pending approval','meeting submitted by peter for 22 Sep 2026 23:00 requires review.','/activities',0,'2026-09-22 19:24:37.653675',2),(18,'ACTIVITY_SUBMITTED','New activity pending approval','meeting submitted by peter for 22 Sep 2026 23:00 requires review.','/activities',1,'2026-09-22 19:24:41.512186',5),(19,'ACTIVITY_SUBMITTED','New activity pending approval','meeting submitted by peter for 22 Sep 2026 23:00 requires review.','/activities',1,'2026-09-22 19:24:45.437691',12),(20,'ACTIVITY_APPROVED','Activity approved','Your activity \"meeting\" has been approved and scheduled.','/activities',0,'2026-09-22 19:25:15.744293',14),(21,'ACTIVITY_UPDATE','Activity Rescheduled: meeting','The activity \"meeting\" (Academic Seminar) has been rescheduled to 22 Sep 2026 23:00 – 23:30.','/activities',0,'2026-09-22 19:25:19.734228',2),(22,'ACTIVITY_UPDATE','Activity Rescheduled: meeting','The activity \"meeting\" (Academic Seminar) has been rescheduled to 22 Sep 2026 23:00 – 23:30.','/activities',1,'2026-09-22 19:25:23.787548',3),(23,'ACTIVITY_UPDATE','Activity Rescheduled: meeting','The activity \"meeting\" (Academic Seminar) has been rescheduled to 22 Sep 2026 23:00 – 23:30.','/activities',1,'2026-09-22 19:25:27.829643',5),(24,'ACTIVITY_UPDATE','Activity Rescheduled: meeting','The activity \"meeting\" (Academic Seminar) has been rescheduled to 22 Sep 2026 23:00 – 23:30.','/activities',1,'2026-09-22 19:25:32.179065',12),(25,'ACTIVITY_UPDATE','Activity Rescheduled: meeting','The activity \"meeting\" (Academic Seminar) has been rescheduled to 22 Sep 2026 23:00 – 23:30.','/activities',0,'2026-09-22 19:25:36.374237',13),(26,'ACTIVITY_UPDATE','Activity Rescheduled: meeting','The activity \"meeting\" (Academic Seminar) has been rescheduled to 22 Sep 2026 23:00 – 23:30.','/activities',0,'2026-09-22 19:25:40.568882',14),(27,'ACTIVITY_SUBMITTED','New activity pending approval','System Review submitted by Nandie for 23 Sep 2026 10:00 requires review.','/activities',0,'2026-09-22 20:07:44.076194',2),(28,'ACTIVITY_SUBMITTED','New activity pending approval','System Review submitted by Nandie for 23 Sep 2026 10:00 requires review.','/activities',1,'2026-09-22 20:07:49.151948',12),(29,'ACTIVITY_SUBMITTED','New activity pending approval','System Review submitted by Nandie for 23 Sep 2026 10:00 requires review.','/activities',0,'2026-09-22 20:07:53.660468',14),(30,'ACTIVITY_APPROVED','Activity approved','Your activity \"System Review\" has been approved and scheduled.','/activities',1,'2026-09-22 20:11:08.214390',5),(31,'ACTIVITY_UPDATE','Activity Rescheduled: System Review','The activity \"System Review\" (Departmental Meeting) has been rescheduled to 23 Sep 2026 10:00 – 11:30.','/activities',1,'2026-09-22 20:11:12.103501',5),(32,'ACTIVITY_UPDATE','Activity Rescheduled: System Review','The activity \"System Review\" (Departmental Meeting) has been rescheduled to 23 Sep 2026 10:00 – 11:30.','/activities',1,'2026-09-22 20:11:16.193237',12),(33,'ACTIVITY_UPDATE','Activity Rescheduled: System Review','The activity \"System Review\" (Departmental Meeting) has been rescheduled to 23 Sep 2026 10:00 – 11:30.','/activities',0,'2026-09-22 20:11:20.042478',13),(34,'ACTIVITY_CANCEL','Activity Cancelled: meeting','The activity \"meeting\" (Academic Seminar) scheduled for 22 Sep 2026 23:00 has been cancelled.\n\nReason: This activity has been deleted from the Departmental Management System.','/activities',0,'2026-09-22 20:19:50.725501',2),(35,'ACTIVITY_CANCEL','Activity Cancelled: meeting','The activity \"meeting\" (Academic Seminar) scheduled for 22 Sep 2026 23:00 has been cancelled.\n\nReason: This activity has been deleted from the Departmental Management System.','/activities',1,'2026-09-22 20:19:54.759571',3),(36,'ACTIVITY_CANCEL','Activity Cancelled: meeting','The activity \"meeting\" (Academic Seminar) scheduled for 22 Sep 2026 23:00 has been cancelled.\n\nReason: This activity has been deleted from the Departmental Management System.','/activities',1,'2026-09-22 20:19:58.523438',5),(37,'ACTIVITY_CANCEL','Activity Cancelled: meeting','The activity \"meeting\" (Academic Seminar) scheduled for 22 Sep 2026 23:00 has been cancelled.\n\nReason: This activity has been deleted from the Departmental Management System.','/activities',1,'2026-09-22 20:20:02.508404',12),(38,'ACTIVITY_CANCEL','Activity Cancelled: meeting','The activity \"meeting\" (Academic Seminar) scheduled for 22 Sep 2026 23:00 has been cancelled.\n\nReason: This activity has been deleted from the Departmental Management System.','/activities',0,'2026-09-22 20:20:06.485765',13),(39,'ACTIVITY_CANCEL','Activity Cancelled: meeting','The activity \"meeting\" (Academic Seminar) scheduled for 22 Sep 2026 23:00 has been cancelled.\n\nReason: This activity has been deleted from the Departmental Management System.','/activities',0,'2026-09-22 20:20:10.581415',14),(40,'ACTIVITY_UPDATE','Activity Rescheduled: System Review','The activity \"System Review\" (Departmental Meeting) has been rescheduled to 23 Sep 2026 12:00 – 13:30.\n\nNote: Schedule has been updated.','/activities',1,'2026-09-22 20:34:36.001142',3),(41,'ACTIVITY_UPDATE','Activity Rescheduled: System Review','The activity \"System Review\" (Departmental Meeting) has been rescheduled to 23 Sep 2026 12:00 – 13:30.\n\nNote: Schedule has been updated.','/activities',1,'2026-09-22 20:34:40.106116',5),(42,'ACTIVITY_UPDATE','Activity Rescheduled: System Review','The activity \"System Review\" (Departmental Meeting) has been rescheduled to 23 Sep 2026 12:00 – 13:30.\n\nNote: Schedule has been updated.','/activities',1,'2026-09-22 20:34:44.531233',12),(43,'ACTIVITY_UPDATE','Activity Rescheduled: System Review','The activity \"System Review\" (Departmental Meeting) has been rescheduled to 23 Sep 2026 12:00 – 13:30.\n\nNote: Schedule has been updated.','/activities',0,'2026-09-22 20:34:48.448384',13),(44,'ACTIVITY_CANCEL','Activity Cancelled: System Review','The activity \"System Review\" (Departmental Meeting) scheduled for 23 Sep 2026 12:00 has been cancelled.\n\nReason: This activity has been deleted from the Departmental Management System.','/activities',1,'2026-09-23 15:38:13.058650',3),(45,'ACTIVITY_CANCEL','Activity Cancelled: System Review','The activity \"System Review\" (Departmental Meeting) scheduled for 23 Sep 2026 12:00 has been cancelled.\n\nReason: This activity has been deleted from the Departmental Management System.','/activities',1,'2026-09-23 15:38:16.849146',5),(46,'ACTIVITY_CANCEL','Activity Cancelled: System Review','The activity \"System Review\" (Departmental Meeting) scheduled for 23 Sep 2026 12:00 has been cancelled.\n\nReason: This activity has been deleted from the Departmental Management System.','/activities',1,'2026-09-23 15:38:21.124990',12),(47,'ACTIVITY_CANCEL','Activity Cancelled: System Review','The activity \"System Review\" (Departmental Meeting) scheduled for 23 Sep 2026 12:00 has been cancelled.\n\nReason: This activity has been deleted from the Departmental Management System.','/activities',0,'2026-09-23 15:38:25.217115',13),(48,'ACTIVITY_SUBMITTED','New activity pending approval','GRACE submitted by Nandie for 24 Sep 2026 13:30 requires review.','/activities',0,'2026-09-24 11:20:37.943285',2),(49,'ACTIVITY_SUBMITTED','New activity pending approval','GRACE submitted by Nandie for 24 Sep 2026 13:30 requires review.','/activities',1,'2026-09-24 11:20:45.148575',12),(50,'ACTIVITY_SUBMITTED','New activity pending approval','GRACE submitted by Nandie for 24 Sep 2026 13:30 requires review.','/activities',0,'2026-09-24 11:20:49.977687',14),(51,'ACTIVITY_SUBMITTED','New activity pending approval','GRACE submitted by Nandie for 24 Sep 2026 13:30 requires review.','/activities',1,'2026-09-24 11:20:55.587946',15),(52,'ACTIVITY_APPROVED','Activity approved','Your activity \"GRACE\" has been approved and scheduled.','/activities',1,'2026-09-24 11:21:44.094989',5),(53,'ACTIVITY_UPDATE','Activity Rescheduled: GRACE','The activity \"GRACE\" (General Activity) has been rescheduled to 24 Sep 2026 13:30 – 13:50.','/activities',1,'2026-09-24 11:21:48.502681',15),(54,'ACTIVITY_UPDATE','Activity Rescheduled: GRACE','The activity \"GRACE\" (General Activity) has been rescheduled to 24 Sep 2026 13:30 – 13:50.','/activities',1,'2026-09-24 11:21:55.124490',5),(55,'ACTIVITY_CANCEL','Activity Cancelled: GRACE','The activity \"GRACE\" (General Activity) scheduled for 24 Sep 2026 13:30 has been cancelled.\n\nReason: This activity has been deleted from the Departmental Management System.','/activities',1,'2026-09-24 11:30:45.579705',15),(56,'ACTIVITY_CANCEL','Activity Cancelled: GRACE','The activity \"GRACE\" (General Activity) scheduled for 24 Sep 2026 13:30 has been cancelled.\n\nReason: This activity has been deleted from the Departmental Management System.','/activities',1,'2026-09-24 11:30:50.027432',5),(57,'ACTIVITY_SUBMITTED','New activity pending approval','meeting submitted by Nandie for 01 Oct 2026 12:40 requires review.','/activities',0,'2026-10-01 10:27:29.991857',2),(58,'ACTIVITY_SUBMITTED','New activity pending approval','meeting submitted by Nandie for 01 Oct 2026 12:40 requires review.','/activities',1,'2026-10-01 10:27:35.585857',12),(59,'ACTIVITY_SUBMITTED','New activity pending approval','meeting submitted by Nandie for 01 Oct 2026 12:40 requires review.','/activities',0,'2026-10-01 10:27:39.818548',14),(60,'ACTIVITY_SUBMITTED','New activity pending approval','meeting submitted by Nandie for 01 Oct 2026 12:40 requires review.','/activities',0,'2026-10-01 10:27:44.779818',15),(61,'ACTIVITY_APPROVED','Activity approved','Your activity \"meeting\" has been approved and scheduled.','/activities',0,'2026-10-01 10:28:09.894481',5),(62,'ACTIVITY_UPDATE','Activity Rescheduled: meeting','The activity \"meeting\" (Academic Seminar) has been rescheduled to 01 Oct 2026 12:40 – 12:45.','/activities',0,'2026-10-01 10:28:14.210957',5),(63,'GENERAL','New financial report request','FR-B007BE373A requires review.','/finance',0,'2026-10-01 10:43:16.512201',5),(64,'GENERAL','New financial report request','FR-B007BE373A requires review.','/finance',1,'2026-10-01 10:43:16.523544',12),(65,'GENERAL','New financial report request','FR-B007BE373A requires review.','/finance',0,'2026-10-01 10:43:16.535884',13),(66,'GENERAL','New financial report request','FR-B007BE373A requires review.','/finance',0,'2026-10-01 10:43:16.557850',14),(67,'GENERAL','New financial report request','FR-B007BE373A requires review.','/finance',0,'2026-10-01 10:43:16.571759',15),(68,'REPORT_REJECTED','Financial report request rejected','FR-B007BE373A was rejected. Reason: ..','/finance',1,'2026-10-01 10:44:17.176290',3),(69,'ACTIVITY_INVITE','Activity Invitation: Quick meeting','You have been invited to: Quick meeting (Academic Seminar)\nWhen: 01 Oct 2026 19:10 – 19:20\nJoin meeting: https://meet.google.com/fws-tzzi-daf\nOrganizer: Moses','/activities',0,'2026-10-01 16:59:17.254164',2),(70,'ACTIVITY_INVITE','Activity Invitation: Quick meeting','You have been invited to: Quick meeting (Academic Seminar)\nWhen: 01 Oct 2026 19:10 – 19:20\nJoin meeting: https://meet.google.com/fws-tzzi-daf\nOrganizer: Moses','/activities',1,'2026-10-01 16:59:21.281227',3),(71,'ACTIVITY_INVITE','Activity Invitation: Quick meeting','You have been invited to: Quick meeting (Academic Seminar)\nWhen: 01 Oct 2026 19:10 – 19:20\nJoin meeting: https://meet.google.com/fws-tzzi-daf\nOrganizer: Moses','/activities',0,'2026-10-01 16:59:25.094486',5),(72,'ACTIVITY_INVITE','Activity Invitation: Quick meeting','You have been invited to: Quick meeting (Academic Seminar)\nWhen: 01 Oct 2026 19:10 – 19:20\nJoin meeting: https://meet.google.com/fws-tzzi-daf\nOrganizer: Moses','/activities',1,'2026-10-01 16:59:28.776637',12),(73,'ACTIVITY_INVITE','Activity Invitation: Quick meeting','You have been invited to: Quick meeting (Academic Seminar)\nWhen: 01 Oct 2026 19:10 – 19:20\nJoin meeting: https://meet.google.com/fws-tzzi-daf\nOrganizer: Moses','/activities',0,'2026-10-01 16:59:32.783746',13),(74,'ACTIVITY_INVITE','Activity Invitation: Quick meeting','You have been invited to: Quick meeting (Academic Seminar)\nWhen: 01 Oct 2026 19:10 – 19:20\nJoin meeting: https://meet.google.com/fws-tzzi-daf\nOrganizer: Moses','/activities',0,'2026-10-01 16:59:36.590157',14),(75,'ACTIVITY_INVITE','Activity Invitation: Quick meeting','You have been invited to: Quick meeting (Academic Seminar)\nWhen: 01 Oct 2026 19:10 – 19:20\nJoin meeting: https://meet.google.com/fws-tzzi-daf\nOrganizer: Moses','/activities',0,'2026-10-01 16:59:41.292082',15),(76,'ACTIVITY_UPDATE','Activity Rescheduled: meeting','The activity \"meeting\" (Academic Seminar) has been rescheduled to 01 Oct 2026 14:40 – 14:45.\n\nNote: Schedule has been updated.','/activities',0,'2026-10-01 17:05:17.556332',5),(77,'ACTIVITY_UPDATE','Activity Rescheduled: Quick meeting','The activity \"Quick meeting\" (Academic Seminar) has been rescheduled to 01 Oct 2026 21:10 – 21:20.\n\nNote: Schedule has been updated.','/activities',0,'2026-10-01 17:07:49.192571',2),(78,'ACTIVITY_UPDATE','Activity Rescheduled: Quick meeting','The activity \"Quick meeting\" (Academic Seminar) has been rescheduled to 01 Oct 2026 21:10 – 21:20.\n\nNote: Schedule has been updated.','/activities',1,'2026-10-01 17:07:52.997167',3),(79,'ACTIVITY_UPDATE','Activity Rescheduled: Quick meeting','The activity \"Quick meeting\" (Academic Seminar) has been rescheduled to 01 Oct 2026 21:10 – 21:20.\n\nNote: Schedule has been updated.','/activities',0,'2026-10-01 17:07:56.747466',5),(80,'ACTIVITY_UPDATE','Activity Rescheduled: Quick meeting','The activity \"Quick meeting\" (Academic Seminar) has been rescheduled to 01 Oct 2026 21:10 – 21:20.\n\nNote: Schedule has been updated.','/activities',1,'2026-10-01 17:08:00.393306',12),(81,'ACTIVITY_UPDATE','Activity Rescheduled: Quick meeting','The activity \"Quick meeting\" (Academic Seminar) has been rescheduled to 01 Oct 2026 21:10 – 21:20.\n\nNote: Schedule has been updated.','/activities',0,'2026-10-01 17:08:04.146405',13),(82,'ACTIVITY_UPDATE','Activity Rescheduled: Quick meeting','The activity \"Quick meeting\" (Academic Seminar) has been rescheduled to 01 Oct 2026 21:10 – 21:20.\n\nNote: Schedule has been updated.','/activities',0,'2026-10-01 17:08:07.885452',14),(83,'ACTIVITY_UPDATE','Activity Rescheduled: Quick meeting','The activity \"Quick meeting\" (Academic Seminar) has been rescheduled to 01 Oct 2026 21:10 – 21:20.\n\nNote: Schedule has been updated.','/activities',0,'2026-10-01 17:08:11.453578',15),(84,'GENERAL','New financial report request','FR-99DBAF4944 requires review.','/finance',0,'2026-10-01 17:35:22.481858',5),(85,'GENERAL','New financial report request','FR-99DBAF4944 requires review.','/finance',1,'2026-10-01 17:35:22.494949',12),(86,'GENERAL','New financial report request','FR-99DBAF4944 requires review.','/finance',0,'2026-10-01 17:35:22.507522',13),(87,'GENERAL','New financial report request','FR-99DBAF4944 requires review.','/finance',0,'2026-10-01 17:35:22.525416',14),(88,'GENERAL','New financial report request','FR-99DBAF4944 requires review.','/finance',0,'2026-10-01 17:35:22.543814',15),(89,'REPORT_READY','Financial report ready','FR-99DBAF4944 was approved and the report is ready.','/finance',1,'2026-10-01 18:10:30.763064',3),(90,'ACTIVITY_CANCEL','Activity Cancelled: meeting','The activity \"meeting\" (Academic Seminar) scheduled for 01 Oct 2026 14:40 has been cancelled.\n\nReason: This activity has been deleted from the Departmental Management System.','/activities',0,'2026-10-01 20:59:06.554137',5);
/*!40000 ALTER TABLE `dms_notifications` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `expenses`
--

DROP TABLE IF EXISTS `expenses`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `expenses` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `amount` decimal(12,2) NOT NULL,
  `description` longtext COLLATE utf8mb4_general_ci NOT NULL,
  `status` varchar(20) COLLATE utf8mb4_general_ci NOT NULL,
  `date_requested` datetime(6) NOT NULL,
  `budget_id` bigint DEFAULT NULL,
  `requested_by_id` bigint NOT NULL,
  `date_processed` datetime(6) DEFAULT NULL,
  `processed_by_id` bigint DEFAULT NULL,
  `rejection_reason` longtext COLLATE utf8mb4_general_ci,
  `reference` varchar(24) COLLATE utf8mb4_general_ci NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `expenses_reference_1084c329_uniq` (`reference`),
  KEY `finance_expense_budget_id_8ff37618_fk_finance_budget_id` (`budget_id`),
  KEY `finance_expense_requested_by_id_78cde08f_fk_users_user_id` (`requested_by_id`),
  KEY `finance_expense_processed_by_id_04e7f4f9_fk_users_user_id` (`processed_by_id`),
  CONSTRAINT `finance_expense_budget_id_8ff37618_fk_finance_budget_id` FOREIGN KEY (`budget_id`) REFERENCES `budgets` (`id`),
  CONSTRAINT `finance_expense_processed_by_id_04e7f4f9_fk_users_user_id` FOREIGN KEY (`processed_by_id`) REFERENCES `users` (`id`),
  CONSTRAINT `finance_expense_requested_by_id_78cde08f_fk_users_user_id` FOREIGN KEY (`requested_by_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `expenses`
--

LOCK TABLES `expenses` WRITE;
/*!40000 ALTER TABLE `expenses` DISABLE KEYS */;
INSERT INTO `expenses` VALUES (6,500.00,'snacks and refreshments for the meeting','APPROVED','2026-09-21 08:29:17.330791',6,3,'2026-09-21 09:21:00.708701',5,'','EXP-5619ED744B'),(7,350.00,'office stationary','REJECTED','2026-09-21 08:30:52.960081',NULL,3,'2026-09-21 08:32:12.471952',5,NULL,'EXP-182FD63FDB'),(8,5000.00,'WIFI','APPROVED','2026-09-21 12:18:29.114103',7,3,'2026-09-21 12:31:55.114412',5,NULL,'EXP-F88D1F0CE3'),(9,2500.00,'Allowance','REJECTED','2026-09-21 16:43:06.666189',NULL,3,'2026-09-21 16:44:38.886823',5,'allowances are not yet ready ,you will be notified when they are','EXP-72B997EEFF'),(10,500.00,'refreshments','APPROVED','2026-09-21 17:27:20.220990',6,3,'2026-09-21 17:30:18.959940',13,NULL,'EXP-10790B4DED'),(11,250.00,'snacks','APPROVED','2026-09-21 17:31:20.953181',7,3,'2026-09-21 17:32:50.209854',13,NULL,'EXP-836ED30A25');
/*!40000 ALTER TABLE `expenses` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `finance_audit_log`
--

DROP TABLE IF EXISTS `finance_audit_log`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `finance_audit_log` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `action` varchar(80) COLLATE utf8mb4_general_ci NOT NULL,
  `object_type` varchar(50) COLLATE utf8mb4_general_ci NOT NULL,
  `object_reference` varchar(50) COLLATE utf8mb4_general_ci NOT NULL,
  `details` longtext COLLATE utf8mb4_general_ci NOT NULL,
  `created_at` datetime(6) NOT NULL,
  `actor_id` bigint DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `finance_audit_log_actor_id_d4ea6ab9_fk_users_id` (`actor_id`),
  CONSTRAINT `finance_audit_log_actor_id_d4ea6ab9_fk_users_id` FOREIGN KEY (`actor_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `finance_audit_log`
--

LOCK TABLES `finance_audit_log` WRITE;
/*!40000 ALTER TABLE `finance_audit_log` DISABLE KEYS */;
INSERT INTO `finance_audit_log` VALUES (1,'FUNDS_ADDED','BudgetTransaction','TXN-F8CBD3DE55','ZMW 49,000.00 -> ZMW 79,000.00','2026-09-24 11:40:36.495865',15),(2,'REPORT_REQUESTED','FinancialSummaryRequest','FR-B007BE373A','auditing','2026-10-01 10:43:16.473063',3),(3,'REPORT_REJECTED','FinancialSummaryRequest','FR-B007BE373A','..','2026-10-01 10:44:17.171159',12),(4,'INCOME_RECORDED','DepartmentalIncome','INC-991EF7C1B3','ZMW 13,200.00 from cisco cources','2026-10-01 16:51:41.356761',12),(5,'REPORT_REQUESTED','FinancialSummaryRequest','FR-99DBAF4944','i need to perform some verification','2026-10-01 17:35:22.422063',3),(6,'REPORT_APPROVED','FinancialSummaryRequest','FR-99DBAF4944','DMS_Financial_Statement_2026-09-01_to_2026-10-10.pdf','2026-10-01 18:10:30.758575',12),(7,'INCOME_ALLOCATED','DepartmentalIncomeAllocation','IAL-64DF05F397','INC-991EF7C1B3 -> IT AND HARDWARE: ZMW 5,000.00','2026-10-01 18:23:43.839484',12);
/*!40000 ALTER TABLE `finance_audit_log` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `finance_notifications`
--

DROP TABLE IF EXISTS `finance_notifications`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `finance_notifications` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `kind` varchar(30) COLLATE utf8mb4_general_ci NOT NULL,
  `title` varchar(160) COLLATE utf8mb4_general_ci NOT NULL,
  `message` longtext COLLATE utf8mb4_general_ci NOT NULL,
  `is_read` tinyint(1) NOT NULL,
  `created_at` datetime(6) NOT NULL,
  `expense_id` bigint DEFAULT NULL,
  `report_request_id` bigint DEFAULT NULL,
  `recipient_id` bigint NOT NULL,
  PRIMARY KEY (`id`),
  KEY `finance_notifications_expense_id_2c101bd3_fk_expenses_id` (`expense_id`),
  KEY `finance_notification_report_request_id_4ff04b9b_fk_financial` (`report_request_id`),
  KEY `finance_notifications_recipient_id_f227c855_fk_users_id` (`recipient_id`),
  CONSTRAINT `finance_notification_report_request_id_4ff04b9b_fk_financial` FOREIGN KEY (`report_request_id`) REFERENCES `financial_summary_requests` (`id`),
  CONSTRAINT `finance_notifications_expense_id_2c101bd3_fk_expenses_id` FOREIGN KEY (`expense_id`) REFERENCES `expenses` (`id`),
  CONSTRAINT `finance_notifications_recipient_id_f227c855_fk_users_id` FOREIGN KEY (`recipient_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=55 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `finance_notifications`
--

LOCK TABLES `finance_notifications` WRITE;
/*!40000 ALTER TABLE `finance_notifications` DISABLE KEYS */;
INSERT INTO `finance_notifications` VALUES (1,'EXPENSE_APPROVED','Expense request approved','EXP-F88D1F0CE3 for ZMK 5,000.00 was approved.',1,'2026-09-21 12:31:55.144352',8,NULL,3),(2,'REPORT_READY','Financial report ready','FR-F363A4B7FC was approved and the report is ready.',1,'2026-09-21 12:32:24.640446',NULL,4,3),(3,'REPORT_REJECTED','Financial report request rejected','FR-812DD7A0E0 was rejected. Reason: ALREADY APPROVED THE FIRST REQUEST',1,'2026-09-21 12:37:51.227030',NULL,3,3),(4,'REPORT_REJECTED','Financial report request rejected','FR-D46F8B566C was rejected. Reason: ALREADY APPROVED THE FIRST REQUEST',1,'2026-09-21 12:38:10.190635',NULL,2,3),(5,'REPORT_READY','Financial report ready','FR-F5C473C9D4 was approved and the report is ready.',1,'2026-09-21 15:58:09.534853',NULL,6,3),(6,'REPORT_REJECTED','Financial report request rejected','FR-6AFEC3122D was rejected. Reason: NaN',1,'2026-09-21 15:58:26.628536',NULL,5,3),(7,'REPORT_READY','Financial report ready','FR-37CD2D8879 was approved and the report is ready.',1,'2026-09-21 16:00:27.284474',NULL,7,3),(8,'ACTION_REQUIRED','New financial report request','FR-8779F040B5 requires review.',0,'2026-09-21 16:25:34.096396',NULL,9,5),(9,'ACTION_REQUIRED','New financial report request','FR-8779F040B5 requires review.',0,'2026-09-21 16:25:34.096422',NULL,9,12),(10,'ACTION_REQUIRED','New financial report request','FR-8779F040B5 requires review.',0,'2026-09-21 16:25:34.096432',NULL,9,13),(11,'ACTION_REQUIRED','New financial report request','FR-4C5A41E3D8 requires review.',0,'2026-09-21 16:34:16.054731',NULL,10,5),(12,'ACTION_REQUIRED','New financial report request','FR-4C5A41E3D8 requires review.',0,'2026-09-21 16:34:16.054769',NULL,10,12),(13,'ACTION_REQUIRED','New financial report request','FR-4C5A41E3D8 requires review.',0,'2026-09-21 16:34:16.054784',NULL,10,13),(14,'REPORT_READY','Financial report ready','FR-4C5A41E3D8 was approved and the report is ready.',1,'2026-09-21 16:36:41.718470',NULL,10,3),(15,'REPORT_REJECTED','Financial report request rejected','FR-8779F040B5 was rejected. Reason: already approved previous ones',1,'2026-09-21 16:37:10.991401',NULL,9,3),(16,'REPORT_REJECTED','Financial report request rejected','FR-FD2A781451 was rejected. Reason: already approved previous ones',1,'2026-09-21 16:37:26.044202',NULL,8,3),(17,'ACTION_REQUIRED','New expense request','EXP-72B997EEFF for ZMK 2,500.00 requires review.',0,'2026-09-21 16:43:06.740058',9,NULL,5),(18,'ACTION_REQUIRED','New expense request','EXP-72B997EEFF for ZMK 2,500.00 requires review.',0,'2026-09-21 16:43:06.740145',9,NULL,12),(19,'ACTION_REQUIRED','New expense request','EXP-72B997EEFF for ZMK 2,500.00 requires review.',0,'2026-09-21 16:43:06.740164',9,NULL,13),(20,'EXPENSE_REJECTED','Expense request rejected','EXP-72B997EEFF was rejected. Reason: allowances are not yet ready ,you will be notified when they are',1,'2026-09-21 16:44:38.895771',9,NULL,3),(21,'ACTION_REQUIRED','New financial report request','FR-19DEBA9E70 requires review.',0,'2026-09-21 16:46:12.947690',NULL,11,5),(22,'ACTION_REQUIRED','New financial report request','FR-19DEBA9E70 requires review.',0,'2026-09-21 16:46:12.947772',NULL,11,12),(23,'ACTION_REQUIRED','New financial report request','FR-19DEBA9E70 requires review.',0,'2026-09-21 16:46:12.947817',NULL,11,13),(24,'REPORT_READY','Financial report ready','FR-19DEBA9E70 was approved and the report is ready.',1,'2026-09-21 16:47:06.784357',NULL,11,3),(25,'ACTION_REQUIRED','New expense request','EXP-10790B4DED for ZMK 500.00 requires review.',0,'2026-09-21 17:27:20.352086',10,NULL,5),(26,'ACTION_REQUIRED','New expense request','EXP-10790B4DED for ZMK 500.00 requires review.',0,'2026-09-21 17:27:20.352113',10,NULL,12),(27,'ACTION_REQUIRED','New expense request','EXP-10790B4DED for ZMK 500.00 requires review.',0,'2026-09-21 17:27:20.352124',10,NULL,13),(28,'ACTION_REQUIRED','New financial report request','FR-6C27152A44 requires review.',0,'2026-09-21 17:28:03.544581',NULL,12,5),(29,'ACTION_REQUIRED','New financial report request','FR-6C27152A44 requires review.',0,'2026-09-21 17:28:03.544633',NULL,12,12),(30,'ACTION_REQUIRED','New financial report request','FR-6C27152A44 requires review.',0,'2026-09-21 17:28:03.544660',NULL,12,13),(31,'REPORT_READY','Financial report ready','FR-6C27152A44 was approved and the report is ready.',1,'2026-09-21 17:29:28.758941',NULL,12,3),(32,'EXPENSE_APPROVED','Expense request approved','EXP-10790B4DED for ZMK 500.00 was approved.',1,'2026-09-21 17:30:19.022626',10,NULL,3),(33,'ACTION_REQUIRED','New expense request','EXP-836ED30A25 for ZMK 250.00 requires review.',0,'2026-09-21 17:31:20.990279',11,NULL,5),(34,'ACTION_REQUIRED','New expense request','EXP-836ED30A25 for ZMK 250.00 requires review.',0,'2026-09-21 17:31:20.990393',11,NULL,12),(35,'ACTION_REQUIRED','New expense request','EXP-836ED30A25 for ZMK 250.00 requires review.',0,'2026-09-21 17:31:20.990455',11,NULL,13),(36,'EXPENSE_APPROVED','Expense request approved','EXP-836ED30A25 for ZMK 250.00 was approved.',1,'2026-09-21 17:32:50.225912',11,NULL,3),(37,'REPORT_READY','Financial report ready','FR-8852C57BC0 was approved and the report is ready.',0,'2026-09-21 18:58:09.809437',NULL,13,5),(38,'REPORT_READY','Financial report ready','FR-1CBC81835D was approved and the report is ready.',0,'2026-09-21 18:58:38.057521',NULL,14,5),(40,'ACTION_REQUIRED','New financial report request','FR-295B26B9BE requires review.',0,'2026-09-22 01:59:48.248395',NULL,16,5),(41,'ACTION_REQUIRED','New financial report request','FR-295B26B9BE requires review.',0,'2026-09-22 01:59:48.248420',NULL,16,13),(42,'REPORT_READY','Financial report ready','FR-295B26B9BE was approved and the report is ready.',0,'2026-09-22 02:00:30.172276',NULL,16,12),(43,'ACTION_REQUIRED','New financial report request','FR-B007BE373A requires review.',0,'2026-10-01 10:43:16.497398',NULL,17,5),(44,'ACTION_REQUIRED','New financial report request','FR-B007BE373A requires review.',0,'2026-10-01 10:43:16.497428',NULL,17,12),(45,'ACTION_REQUIRED','New financial report request','FR-B007BE373A requires review.',0,'2026-10-01 10:43:16.497441',NULL,17,13),(46,'ACTION_REQUIRED','New financial report request','FR-B007BE373A requires review.',0,'2026-10-01 10:43:16.497452',NULL,17,14),(47,'ACTION_REQUIRED','New financial report request','FR-B007BE373A requires review.',0,'2026-10-01 10:43:16.497462',NULL,17,15),(48,'REPORT_REJECTED','Financial report request rejected','FR-B007BE373A was rejected. Reason: ..',1,'2026-10-01 10:44:17.174982',NULL,17,3),(49,'ACTION_REQUIRED','New financial report request','FR-99DBAF4944 requires review.',0,'2026-10-01 17:35:22.458095',NULL,18,5),(50,'ACTION_REQUIRED','New financial report request','FR-99DBAF4944 requires review.',0,'2026-10-01 17:35:22.458127',NULL,18,12),(51,'ACTION_REQUIRED','New financial report request','FR-99DBAF4944 requires review.',0,'2026-10-01 17:35:22.458141',NULL,18,13),(52,'ACTION_REQUIRED','New financial report request','FR-99DBAF4944 requires review.',0,'2026-10-01 17:35:22.458153',NULL,18,14),(53,'ACTION_REQUIRED','New financial report request','FR-99DBAF4944 requires review.',0,'2026-10-01 17:35:22.458164',NULL,18,15),(54,'REPORT_READY','Financial report ready','FR-99DBAF4944 was approved and the report is ready.',1,'2026-10-01 18:10:30.760849',NULL,18,3);
/*!40000 ALTER TABLE `finance_notifications` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `financial_summary_requests`
--

DROP TABLE IF EXISTS `financial_summary_requests`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `financial_summary_requests` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `reason` longtext COLLATE utf8mb4_general_ci NOT NULL,
  `status` varchar(20) COLLATE utf8mb4_general_ci NOT NULL,
  `response_notes` longtext COLLATE utf8mb4_general_ci,
  `requested_at` datetime(6) NOT NULL,
  `processed_at` datetime(6) DEFAULT NULL,
  `processed_by_id` bigint DEFAULT NULL,
  `requested_by_id` bigint NOT NULL,
  `rejection_reason` longtext COLLATE utf8mb4_general_ci,
  `report_end` date DEFAULT NULL,
  `report_format` varchar(10) COLLATE utf8mb4_general_ci NOT NULL,
  `report_start` date DEFAULT NULL,
  `reference` varchar(24) COLLATE utf8mb4_general_ci NOT NULL,
  `generated_report` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `budget_id` bigint DEFAULT NULL,
  `transaction_type` varchar(20) COLLATE utf8mb4_general_ci NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `financial_summary_requests_reference_98a28997_uniq` (`reference`),
  KEY `financial_summary_requests_processed_by_id_4d895502_fk_users_id` (`processed_by_id`),
  KEY `financial_summary_requests_requested_by_id_91d4486e_fk_users_id` (`requested_by_id`),
  KEY `financial_summary_requests_budget_id_1662579c_fk_budgets_id` (`budget_id`),
  CONSTRAINT `financial_summary_requests_budget_id_1662579c_fk_budgets_id` FOREIGN KEY (`budget_id`) REFERENCES `budgets` (`id`),
  CONSTRAINT `financial_summary_requests_processed_by_id_4d895502_fk_users_id` FOREIGN KEY (`processed_by_id`) REFERENCES `users` (`id`),
  CONSTRAINT `financial_summary_requests_requested_by_id_91d4486e_fk_users_id` FOREIGN KEY (`requested_by_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=19 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `financial_summary_requests`
--

LOCK TABLES `financial_summary_requests` WRITE;
/*!40000 ALTER TABLE `financial_summary_requests` DISABLE KEYS */;
INSERT INTO `financial_summary_requests` VALUES (2,'auditing purposes','REJECTED','','2026-09-21 12:18:00.982197','2026-09-21 12:38:10.182770',5,3,'ALREADY APPROVED THE FIRST REQUEST','2026-09-21','PDF','2026-09-21','FR-D46F8B566C','',NULL,'ALL'),(3,'auditing purposes','REJECTED','','2026-09-21 12:18:03.784269','2026-09-21 12:37:51.222273',5,3,'ALREADY APPROVED THE FIRST REQUEST','2026-09-21','PDF','2026-09-21','FR-812DD7A0E0','',NULL,'ALL'),(4,'AUDITING','COMPLETED','Approved. The generated report is available for download.','2026-09-21 12:29:57.733121','2026-09-21 12:32:24.634925',5,3,NULL,'2026-09-21','PDF','2026-09-21','FR-F363A4B7FC','financial_reports/2026/09/FR-F363A4B7FC-2026-09-21-to-2026-09-21.pdf',NULL,'ALL'),(5,'second audit','REJECTED','','2026-09-21 15:55:23.595712','2026-09-21 15:58:26.614166',5,3,'NaN','2026-09-30','PDF','2026-09-20','FR-6AFEC3122D','',NULL,'ALL'),(6,'second audit','COMPLETED','Approved. The generated report is available for download.','2026-09-21 15:55:25.726790','2026-09-21 15:58:09.517402',5,3,NULL,'2026-09-30','PDF','2026-09-20','FR-F5C473C9D4','financial_reports/2026/09/FR-F5C473C9D4-2026-09-20-to-2026-09-30.pdf',NULL,'ALL'),(7,'TRYING','COMPLETED','Approved. The generated report is available for download.','2026-09-21 15:59:48.753538','2026-09-21 16:00:27.270296',5,3,NULL,'2026-09-20','PDF','2026-08-03','FR-37CD2D8879','financial_reports/2026/09/FR-37CD2D8879-2026-08-03-to-2026-09-20.pdf',NULL,'ALL'),(8,'testing request error','REJECTED','','2026-09-21 16:22:28.588672','2026-09-21 16:37:26.036948',5,3,'already approved previous ones','2026-09-21','PDF','2026-09-20','FR-FD2A781451','',NULL,'ALL'),(9,'test report flow','REJECTED','','2026-09-21 16:25:34.079514','2026-09-21 16:37:10.985002',5,3,'already approved previous ones','2026-09-21','PDF','2026-09-20','FR-8779F040B5','',NULL,'ALL'),(10,'check','COMPLETED','Approved. The generated report is available for download.','2026-09-21 16:34:15.986391','2026-09-21 16:36:41.714834',5,3,NULL,'2026-09-30','PDF','2026-09-01','FR-4C5A41E3D8','financial_reports/2026/09/FR-4C5A41E3D8-2026-09-01-to-2026-09-30.pdf',NULL,'ALL'),(11,'proof of funds','COMPLETED','Approved. The generated report is available for download.','2026-09-21 16:46:12.887690','2026-09-21 16:47:06.775623',5,3,NULL,'2026-09-30','PDF','2026-09-01','FR-19DEBA9E70','financial_reports/2026/09/FR-19DEBA9E70-2026-09-01-to-2026-09-30.pdf',NULL,'ALL'),(12,'i need to verify expenses','COMPLETED','Approved. The generated report is available for download.','2026-09-21 17:28:03.482578','2026-09-21 17:29:28.748050',13,3,NULL,'2026-09-30','PDF','2026-09-01','FR-6C27152A44','financial_reports/2026/09/FR-6C27152A44-2026-09-01-to-2026-09-30.pdf',NULL,'ALL'),(13,'Verification test for Excel generation','COMPLETED','Approved. The generated report is available for download.','2026-09-21 18:58:09.614700','2026-09-21 18:58:09.796555',5,5,NULL,'2026-12-31','EXCEL','2026-01-01','FR-8852C57BC0','financial_reports/2026/09/FR-8852C57BC0-2026-01-01-to-2026-12-31.xlsx',NULL,'ALL'),(14,'Verification test for Excel generation','COMPLETED','Approved. The generated report is available for download.','2026-09-21 18:58:37.898392','2026-09-21 18:58:38.041328',5,5,NULL,'2026-12-31','EXCEL','2026-01-01','FR-1CBC81835D','financial_reports/2026/09/FR-1CBC81835D-2026-01-01-to-2026-12-31.xlsx',NULL,'ALL'),(16,'tryg','COMPLETED','Approved. The generated report is available for download.','2026-09-22 01:59:48.197648','2026-09-22 02:00:30.163808',13,12,NULL,'2026-09-30','PDF','2026-09-22','FR-295B26B9BE','financial_reports/2026/09/DMS_Financial_Statement_2026-09-22_to_2026-09-30.pdf',NULL,'ALL'),(17,'auditing','REJECTED','','2026-10-01 10:43:16.449642','2026-10-01 10:44:17.169222',12,3,'..','2026-10-01','PDF','2026-09-01','FR-B007BE373A','',NULL,'ALL'),(18,'i need to perform some verification','COMPLETED','Approved. The generated report is available for download.','2026-10-01 17:35:22.404677','2026-10-01 18:10:30.754745',12,3,NULL,'2026-10-10','PDF','2026-09-01','FR-99DBAF4944','financial_reports/2026/10/DMS_Financial_Statement_2026-09-01_to_2026-10-10.pdf',NULL,'ALL');
/*!40000 ALTER TABLE `financial_summary_requests` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `recipient_groups`
--

DROP TABLE IF EXISTS `recipient_groups`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `recipient_groups` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `name` varchar(120) COLLATE utf8mb4_general_ci NOT NULL,
  `description` longtext COLLATE utf8mb4_general_ci NOT NULL,
  `created_at` datetime(6) NOT NULL,
  `created_by_id` bigint DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`),
  KEY `recipient_groups_created_by_id_0b20a3ef_fk_users_id` (`created_by_id`),
  CONSTRAINT `recipient_groups_created_by_id_0b20a3ef_fk_users_id` FOREIGN KEY (`created_by_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `recipient_groups`
--

LOCK TABLES `recipient_groups` WRITE;
/*!40000 ALTER TABLE `recipient_groups` DISABLE KEYS */;
INSERT INTO `recipient_groups` VALUES (7,'Finance committee','oversee Departmental Financial activities','2026-09-22 20:02:10.309823',5,1);
/*!40000 ALTER TABLE `recipient_groups` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `recipient_groups_members`
--

DROP TABLE IF EXISTS `recipient_groups_members`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `recipient_groups_members` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `recipientgroup_id` bigint NOT NULL,
  `user_id` bigint NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `recipient_groups_members_recipientgroup_id_user_id_501851ee_uniq` (`recipientgroup_id`,`user_id`),
  KEY `recipient_groups_members_user_id_c045c158_fk_users_id` (`user_id`),
  CONSTRAINT `recipient_groups_mem_recipientgroup_id_35523b22_fk_recipient` FOREIGN KEY (`recipientgroup_id`) REFERENCES `recipient_groups` (`id`),
  CONSTRAINT `recipient_groups_members_user_id_c045c158_fk_users_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=22 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `recipient_groups_members`
--

LOCK TABLES `recipient_groups_members` WRITE;
/*!40000 ALTER TABLE `recipient_groups_members` DISABLE KEYS */;
INSERT INTO `recipient_groups_members` VALUES (21,7,5),(20,7,12),(19,7,13);
/*!40000 ALTER TABLE `recipient_groups_members` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `resource_categories`
--

DROP TABLE IF EXISTS `resource_categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `resource_categories` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `name` varchar(100) COLLATE utf8mb4_general_ci NOT NULL,
  `description` longtext COLLATE utf8mb4_general_ci NOT NULL,
  `manager_id` bigint DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`),
  KEY `resource_categories_manager_id_0e201e75_fk_users_id` (`manager_id`),
  CONSTRAINT `resource_categories_manager_id_0e201e75_fk_users_id` FOREIGN KEY (`manager_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `resource_categories`
--

LOCK TABLES `resource_categories` WRITE;
/*!40000 ALTER TABLE `resource_categories` DISABLE KEYS */;
INSERT INTO `resource_categories` VALUES (1,'Rooms & Venues','',NULL),(2,'IT & Hardware','',NULL),(3,'Vehicles','',NULL),(4,'Audio / Visual','',NULL),(5,'Laboratory & Equipment','',NULL),(6,'General Office Assets','',NULL),(7,'Technical','Hardware and computer related resources',5),(8,'MONITORS','COMPUTER HARDWARE',5),(9,'Laptops','for visitors',14);
/*!40000 ALTER TABLE `resource_categories` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `resource_inspections`
--

DROP TABLE IF EXISTS `resource_inspections`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `resource_inspections` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `previous_condition` varchar(30) COLLATE utf8mb4_general_ci NOT NULL,
  `current_condition` varchar(30) COLLATE utf8mb4_general_ci NOT NULL,
  `inspection_date` date NOT NULL,
  `remarks` longtext COLLATE utf8mb4_general_ci NOT NULL,
  `created_at` datetime(6) NOT NULL,
  `inspected_by_id` bigint DEFAULT NULL,
  `resource_id` bigint NOT NULL,
  PRIMARY KEY (`id`),
  KEY `resource_inspections_inspected_by_id_807fda98_fk_users_id` (`inspected_by_id`),
  KEY `resource_inspections_resource_id_db4605cf_fk_resources_id` (`resource_id`),
  CONSTRAINT `resource_inspections_inspected_by_id_807fda98_fk_users_id` FOREIGN KEY (`inspected_by_id`) REFERENCES `users` (`id`),
  CONSTRAINT `resource_inspections_resource_id_db4605cf_fk_resources_id` FOREIGN KEY (`resource_id`) REFERENCES `resources` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `resource_inspections`
--

LOCK TABLES `resource_inspections` WRITE;
/*!40000 ALTER TABLE `resource_inspections` DISABLE KEYS */;
/*!40000 ALTER TABLE `resource_inspections` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `resource_location_history`
--

DROP TABLE IF EXISTS `resource_location_history`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `resource_location_history` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `previous_location` varchar(150) COLLATE utf8mb4_general_ci NOT NULL,
  `new_location` varchar(150) COLLATE utf8mb4_general_ci NOT NULL,
  `changed_at` datetime(6) NOT NULL,
  `notes` longtext COLLATE utf8mb4_general_ci NOT NULL,
  `changed_by_id` bigint DEFAULT NULL,
  `resource_id` bigint NOT NULL,
  PRIMARY KEY (`id`),
  KEY `resource_location_history_changed_by_id_4f199fa0_fk_users_id` (`changed_by_id`),
  KEY `resource_location_history_resource_id_177f1868_fk_resources_id` (`resource_id`),
  CONSTRAINT `resource_location_history_changed_by_id_4f199fa0_fk_users_id` FOREIGN KEY (`changed_by_id`) REFERENCES `users` (`id`),
  CONSTRAINT `resource_location_history_resource_id_177f1868_fk_resources_id` FOREIGN KEY (`resource_id`) REFERENCES `resources` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=32 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `resource_location_history`
--

LOCK TABLES `resource_location_history` WRITE;
/*!40000 ALTER TABLE `resource_location_history` DISABLE KEYS */;
/*!40000 ALTER TABLE `resource_location_history` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `resource_report_requests`
--

DROP TABLE IF EXISTS `resource_report_requests`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `resource_report_requests` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `reference` varchar(24) COLLATE utf8mb4_general_ci NOT NULL,
  `report_type` varchar(40) COLLATE utf8mb4_general_ci NOT NULL,
  `report_format` varchar(10) COLLATE utf8mb4_general_ci NOT NULL,
  `filters` json NOT NULL,
  `status` varchar(20) COLLATE utf8mb4_general_ci NOT NULL,
  `rejection_reason` longtext COLLATE utf8mb4_general_ci NOT NULL,
  `response_notes` longtext COLLATE utf8mb4_general_ci NOT NULL,
  `generated_report` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `requested_at` datetime(6) NOT NULL,
  `processed_at` datetime(6) DEFAULT NULL,
  `processed_by_id` bigint DEFAULT NULL,
  `requested_by_id` bigint NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `reference` (`reference`),
  KEY `resource_report_requests_processed_by_id_d4165e62_fk_users_id` (`processed_by_id`),
  KEY `resource_report_requests_requested_by_id_93d6d102_fk_users_id` (`requested_by_id`),
  CONSTRAINT `resource_report_requests_processed_by_id_d4165e62_fk_users_id` FOREIGN KEY (`processed_by_id`) REFERENCES `users` (`id`),
  CONSTRAINT `resource_report_requests_requested_by_id_93d6d102_fk_users_id` FOREIGN KEY (`requested_by_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `resource_report_requests`
--

LOCK TABLES `resource_report_requests` WRITE;
/*!40000 ALTER TABLE `resource_report_requests` DISABLE KEYS */;
/*!40000 ALTER TABLE `resource_report_requests` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `resource_status_history`
--

DROP TABLE IF EXISTS `resource_status_history`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `resource_status_history` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `previous_status` varchar(20) COLLATE utf8mb4_general_ci NOT NULL,
  `new_status` varchar(20) COLLATE utf8mb4_general_ci NOT NULL,
  `changed_at` datetime(6) NOT NULL,
  `notes` longtext COLLATE utf8mb4_general_ci NOT NULL,
  `changed_by_id` bigint DEFAULT NULL,
  `resource_id` bigint NOT NULL,
  PRIMARY KEY (`id`),
  KEY `resource_status_history_changed_by_id_991e4b37_fk_users_id` (`changed_by_id`),
  KEY `resource_status_history_resource_id_90f0301c_fk_resources_id` (`resource_id`),
  CONSTRAINT `resource_status_history_changed_by_id_991e4b37_fk_users_id` FOREIGN KEY (`changed_by_id`) REFERENCES `users` (`id`),
  CONSTRAINT `resource_status_history_resource_id_90f0301c_fk_resources_id` FOREIGN KEY (`resource_id`) REFERENCES `resources` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `resource_status_history`
--

LOCK TABLES `resource_status_history` WRITE;
/*!40000 ALTER TABLE `resource_status_history` DISABLE KEYS */;
/*!40000 ALTER TABLE `resource_status_history` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `resources`
--

DROP TABLE IF EXISTS `resources`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `resources` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `name` varchar(100) COLLATE utf8mb4_general_ci NOT NULL,
  `description` longtext COLLATE utf8mb4_general_ci NOT NULL,
  `status` varchar(20) COLLATE utf8mb4_general_ci NOT NULL,
  `assigned_room_id` bigint DEFAULT NULL,
  `resource_id` varchar(80) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `category_id` bigint DEFAULT NULL,
  `condition` varchar(30) COLLATE utf8mb4_general_ci NOT NULL,
  `date_added` date DEFAULT NULL,
  `is_portable` tinyint(1) NOT NULL,
  `location` varchar(150) COLLATE utf8mb4_general_ci NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `resource_id` (`resource_id`),
  KEY `resources_assigned_room_id_e8cdc44e_fk_resources_id` (`assigned_room_id`),
  KEY `resources_category_id_0b9a97ea_fk_resource_categories_id` (`category_id`),
  CONSTRAINT `resources_assigned_room_id_e8cdc44e_fk_resources_id` FOREIGN KEY (`assigned_room_id`) REFERENCES `resources` (`id`),
  CONSTRAINT `resources_category_id_0b9a97ea_fk_resource_categories_id` FOREIGN KEY (`category_id`) REFERENCES `resource_categories` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=45 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `resources`
--

LOCK TABLES `resources` WRITE;
/*!40000 ALTER TABLE `resources` DISABLE KEYS */;
INSERT INTO `resources` VALUES (44,'Dell laptop','Dell latitude 5480 \ncore i7-11bt4527, 2.5Ghz\n8GB Ram\n512 GB SSD','AVAILABLE',NULL,'comp-001',2,'NEW','2026-10-01',0,'Office 1');
/*!40000 ALTER TABLE `resources` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `transactions`
--

DROP TABLE IF EXISTS `transactions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `transactions` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `action_type` varchar(30) COLLATE utf8mb4_general_ci NOT NULL,
  `amount` decimal(12,2) NOT NULL,
  `balance_after` decimal(12,2) NOT NULL,
  `timestamp` datetime(6) NOT NULL,
  `notes` longtext COLLATE utf8mb4_general_ci,
  `budget_id` bigint DEFAULT NULL,
  `expense_id` bigint DEFAULT NULL,
  `performed_by_id` bigint DEFAULT NULL,
  `reference` varchar(24) COLLATE utf8mb4_general_ci NOT NULL,
  `balance_before` decimal(12,2) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `transactions_reference_4f5021e8_uniq` (`reference`),
  KEY `finance_budgettransa_budget_id_08d6b741_fk_finance_b` (`budget_id`),
  KEY `finance_budgettransa_expense_id_f1f08d49_fk_finance_e` (`expense_id`),
  KEY `finance_budgettransa_performed_by_id_a6e6457f_fk_users_use` (`performed_by_id`),
  CONSTRAINT `finance_budgettransa_budget_id_08d6b741_fk_finance_b` FOREIGN KEY (`budget_id`) REFERENCES `budgets` (`id`),
  CONSTRAINT `finance_budgettransa_expense_id_f1f08d49_fk_finance_e` FOREIGN KEY (`expense_id`) REFERENCES `expenses` (`id`),
  CONSTRAINT `finance_budgettransa_performed_by_id_a6e6457f_fk_users_use` FOREIGN KEY (`performed_by_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `transactions`
--

LOCK TABLES `transactions` WRITE;
/*!40000 ALTER TABLE `transactions` DISABLE KEYS */;
INSERT INTO `transactions` VALUES (7,'TOP_UP',50000.00,50000.00,'2026-09-21 00:29:07.406437','Initial department budget allocation for IT AND HARDWARE',6,NULL,5,'TXN-EEDF4A7457',0.00),(8,'REJECTION',350.00,0.00,'2026-09-21 08:32:12.487313','Expense status changed to REJECTED: office stationary',NULL,7,5,'TXN-372891D651',0.00),(9,'DEDUCTION',500.00,49500.00,'2026-09-21 09:21:00.721550','Expense approved: snacks and refreshments for the meeting',6,6,5,'TXN-39CF210915',50000.00),(10,'TOP_UP',35000.00,35000.00,'2026-09-21 09:41:52.418632','Initial department budget allocation for office equipment and stationary',7,NULL,13,'TXN-2D729FF73A',0.00),(11,'DEDUCTION',5000.00,30000.00,'2026-09-21 12:31:55.140501','Approved expense EXP-F88D1F0CE3: WIFI',7,8,5,'TXN-A7CD448E6D',35000.00),(12,'DEDUCTION',500.00,49000.00,'2026-09-21 17:30:19.010900','Approved expense EXP-10790B4DED: refreshments',6,10,13,'TXN-255E50E59B',49500.00),(13,'DEDUCTION',250.00,29750.00,'2026-09-21 17:32:50.214201','Approved expense EXP-836ED30A25: snacks',7,11,13,'TXN-D96655BF10',30000.00),(14,'TOP_UP',30000.00,79000.00,'2026-09-24 11:40:36.481181','Additional allocation',6,NULL,15,'TXN-F8CBD3DE55',49000.00),(15,'ALLOCATION',5000.00,84000.00,'2026-10-01 18:23:43.822913','Purchasing switches for cisco classes',6,NULL,12,'TXN-A9070F5D6E',79000.00);
/*!40000 ALTER TABLE `transactions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_group_categories`
--

DROP TABLE IF EXISTS `user_group_categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_group_categories` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `name` varchar(100) COLLATE utf8mb4_general_ci NOT NULL,
  `description` longtext COLLATE utf8mb4_general_ci NOT NULL,
  `created_at` datetime(6) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_group_categories`
--

LOCK TABLES `user_group_categories` WRITE;
/*!40000 ALTER TABLE `user_group_categories` DISABLE KEYS */;
/*!40000 ALTER TABLE `user_group_categories` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
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
  `has_activity_privilege` tinyint(1) NOT NULL,
  `has_finance_privilege` tinyint(1) NOT NULL,
  `has_resource_privilege` tinyint(1) NOT NULL,
  `user_category_id` bigint DEFAULT NULL,
  `has_finance_balance_access` tinyint(1) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`),
  KEY `users_user_category_id_39922786_fk_user_group_categories_id` (`user_category_id`),
  CONSTRAINT `users_user_category_id_39922786_fk_user_group_categories_id` FOREIGN KEY (`user_category_id`) REFERENCES `user_group_categories` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (2,'pbkdf2_sha256$1200000$ricyQ0nWLzy3fUoCttuOw5$hJAL1yFn+rOsnq6u8FjmpCm8v3rlFkKR4D87fCkdPmY=',NULL,0,'manager','','','manager@department.com',0,1,'2026-06-21 22:42:59.705586','MANAGER','CyberSecurity & Networking',1,0,0,NULL,1),(3,'pbkdf2_sha256$1200000$f0VmoWl8bA9ygOA6ZotzSE$/44pTxafQRs9SP+X639TEXDtkSIhwKn3i/xoArbbC1Q=',NULL,0,'staff','','','staff@department.com',0,1,'2026-06-21 22:43:01.189696','STAFF','Software Engineering',0,1,1,NULL,0),(5,'pbkdf2_sha256$1200000$sED34c9Ykso2zEjVZGg7vv$2SBj73qfpx5E6oZkbYwDPAoMaIvkYVbWmurj6lftmWo=',NULL,0,'Nandie','','','nandie@gmail.com',0,1,'2026-08-30 14:36:04.325274','ADMIN','HOD',1,1,1,NULL,1),(12,'pbkdf2_sha256$1200000$zNaEwoHVzrbfc5QfBmSe6l$KDHYrSsWHDetCLr+y5jZBhMlTiMUCRWl2hmCJR9lPgA=',NULL,0,'Moses','','','moseschaswala7@gmail.com',0,1,'2026-09-17 09:06:25.851694','ADMIN','HOD',1,1,1,NULL,1),(13,'pbkdf2_sha256$1200000$wrzfBKnXKb4NpC9XLlrACj$bog8CeZLux/LNyh+fIj/9uBxTPWITNkTI3BRDKgBVdk=',NULL,0,'Chaswala','','','chaswala@gmail.com',0,1,'2026-09-21 00:30:35.979425','MANAGER','Finance',0,1,0,NULL,0),(14,'pbkdf2_sha256$1200000$MOvV0hKVLQmh9sgsVgh28G$46qoTtvwd2ybZDX4TD4yETcEi7x9ZFsEILt3MZBXBnE=',NULL,0,'peter','','','peterphiri4307@gmail.com',0,1,'2026-09-22 19:17:09.592096','ADMIN','HOD',1,1,1,NULL,1),(15,'pbkdf2_sha256$1200000$lG6jazDp81avZwCJWJpcgj$jxbk0qUVbiIgAhW3WioKBTzoxX/fAkkiRvMFlObC11M=',NULL,0,'Grace','','','gracemusanga59@gmail.com',0,1,'2026-09-24 11:10:24.696237','ADMIN','HOD',1,1,1,NULL,1);
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users_groups`
--

DROP TABLE IF EXISTS `users_groups`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users_groups` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` bigint NOT NULL,
  `group_id` int NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `users_user_groups_user_id_group_id_b88eab82_uniq` (`user_id`,`group_id`),
  KEY `users_user_groups_group_id_9afc8d0e_fk_auth_group_id` (`group_id`),
  CONSTRAINT `users_user_groups_group_id_9afc8d0e_fk_auth_group_id` FOREIGN KEY (`group_id`) REFERENCES `auth_group` (`id`),
  CONSTRAINT `users_user_groups_user_id_5f6f5a90_fk_users_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users_groups`
--

LOCK TABLES `users_groups` WRITE;
/*!40000 ALTER TABLE `users_groups` DISABLE KEYS */;
/*!40000 ALTER TABLE `users_groups` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users_user_permissions`
--

DROP TABLE IF EXISTS `users_user_permissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users_user_permissions` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` bigint NOT NULL,
  `permission_id` int NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `users_user_user_permissions_user_id_permission_id_43338c45_uniq` (`user_id`,`permission_id`),
  KEY `users_user_user_perm_permission_id_0b93982e_fk_auth_perm` (`permission_id`),
  CONSTRAINT `users_user_user_perm_permission_id_0b93982e_fk_auth_perm` FOREIGN KEY (`permission_id`) REFERENCES `auth_permission` (`id`),
  CONSTRAINT `users_user_user_permissions_user_id_20aca447_fk_users_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users_user_permissions`
--

LOCK TABLES `users_user_permissions` WRITE;
/*!40000 ALTER TABLE `users_user_permissions` DISABLE KEYS */;
/*!40000 ALTER TABLE `users_user_permissions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping routines for database 'departmental_management_system'
--
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-10-01 23:45:15
