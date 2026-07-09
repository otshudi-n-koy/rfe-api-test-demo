# =============================================================================
# PÉRIMÈTRE : Transferts MFT de fichiers de factures (RFE)
# Auteur    : N'Koy OTSHUDI — QA Senior
# =============================================================================

@mft
Feature: Transfert MFT de fichiers de factures électroniques

  En tant que système émetteur,
  Je veux transférer des fichiers de factures via MFT,
  Afin d'assurer l'acheminement sécurisé vers la PDP conformément à la RFE.

  Background:
    Given le système MFT est disponible
    And le répertoire de dépôt est accessible

  @smoke @mft
  Scenario: Dépôt et transfert d'un fichier de facture JSON valide
    Given je prépare un fichier de facture JSON avec les données suivantes
      | champ              | valeur          |
      | numero_facture     | FAC-MFT-001     |
      | siren_emetteur     | 123456789       |
      | siren_destinataire | 987654321       |
      | montant_ht         | 1000.00         |
      | taux_tva           | 20              |
      | devise             | EUR             |
    When je dépose le fichier dans le répertoire d'émission
    Then le fichier est accepté par le système MFT
    And un accusé de dépôt est généré
    And le fichier est transféré vers le répertoire de destination

  @mft
  Scenario: Rejet d'un fichier de facture corrompu
    Given je prépare un fichier de facture corrompu
    When je dépose le fichier dans le répertoire d'émission
    Then le fichier est rejeté par le système MFT
    And le code d'erreur est "FILE_CORRUPTED"
    And une alerte de transfert est générée

  @mft
  Scenario: Rejet d'un fichier avec format non conforme
    Given je prépare un fichier de facture avec un format invalide "txt"
    When je dépose le fichier dans le répertoire d'émission
    Then le fichier est rejeté par le système MFT
    And le code d'erreur est "INVALID_FORMAT"

  @mft
  Scenario: Rejet d'un fichier avec SIREN émetteur invalide
    Given je prépare un fichier de facture JSON avec les données suivantes
      | champ          | valeur      |
      | numero_facture | FAC-MFT-002 |
      | siren_emetteur | 000000000   |
      | montant_ht     | 500.00      |
      | taux_tva       | 20          |
    When je dépose le fichier dans le répertoire d'émission
    Then le fichier est rejeté par le système MFT
    And le code d'erreur est "INVALID_SIREN"

  @mft
  Scenario: Transfert d'un lot de fichiers de factures
    Given je prépare un lot de 3 fichiers de factures valides
    When je dépose le lot dans le répertoire d'émission
    Then tous les fichiers sont acceptés par le système MFT
    And 3 accusés de dépôt sont générés
    And le lot est transféré vers le répertoire de destination

  @mft
  Scenario: Gestion d'un fichier en double — doublon détecté
    Given un fichier "FAC-MFT-001" a déjà été transféré
    When je tente de déposer à nouveau le même fichier
    Then le fichier est rejeté par le système MFT
    And le code d'erreur est "DUPLICATE_FILE"