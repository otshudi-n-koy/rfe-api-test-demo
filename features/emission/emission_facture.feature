# =============================================================================
# PÉRIMÈTRE : Flux d'émission de factures (RFE)
# Auteur    : N'Koy OTSHUDI — QA Senior
# =============================================================================

@emission
Feature: Émission de factures électroniques

  En tant qu'émetteur assujetti à la TVA,
  Je veux émettre des factures électroniques conformes à la RFE,
  Afin de respecter l'obligation légale de facturation électronique.

  Background:
    Given l'API de facturation est disponible
    And je suis authentifié en tant qu'émetteur

  @smoke @emission
  Scenario: Émission d'une facture standard B2B valide
    Given je prépare une facture avec les données suivantes
      | champ              | valeur      |
      | numero_facture     | FAC-2024-001|
      | date_emission      | 2024-06-01  |
      | montant_ht         | 1000.00     |
      | taux_tva           | 20          |
      | devise             | EUR         |
      | siren_emetteur     | 123456789   |
      | siren_destinataire | 987654321   |
    When j'envoie la facture via l'endpoint POST /invoices
    Then le statut de la réponse est 201
    And la réponse contient un identifiant unique de facture
    And le statut de la facture est "SUBMITTED"

  @emission
  Scenario: Émission d'une facture avec avoir
    Given je prépare une facture d'avoir pour la facture "FAC-2024-001"
    And le montant de l'avoir est -500.00 EUR
    When j'envoie la facture via l'endpoint POST /invoices
    Then le statut de la réponse est 201
    And le type de document est "CREDIT_NOTE"
    And la facture originale est référencée dans la réponse

  @emission
  Scenario: Rejet d'une facture avec SIREN invalide
    Given je prépare une facture avec les données suivantes
      | champ          | valeur       |
      | numero_facture | FAC-2024-002 |
      | siren_emetteur | 000000000    |
      | montant_ht     | 500.00       |
      | taux_tva       | 20           |
    When j'envoie la facture via l'endpoint POST /invoices
    Then le statut de la réponse est 422
    And la réponse contient le code d'erreur "INVALID_SIREN"
    And le message d'erreur mentionne "siren_emetteur"

  @emission
  Scenario: Rejet d'une facture avec montant TVA incohérent
    Given je prépare une facture avec les données suivantes
      | champ       | valeur  |
      | montant_ht  | 100.00  |
      | taux_tva    | 20      |
      | montant_ttc | 150.00  |
    When j'envoie la facture via l'endpoint POST /invoices
    Then le statut de la réponse est 422
    And la réponse contient le code d'erreur "TVA_MISMATCH"

  @emission
  Scenario Outline: Émission avec différents taux de TVA
    Given je prépare une facture avec un montant HT de <montant_ht> et un taux de TVA de <taux>%
    When j'envoie la facture via l'endpoint POST /invoices
    Then le statut de la réponse est 201
    And le montant TTC calculé est <montant_ttc>

    Examples:
      | montant_ht | taux | montant_ttc |
      | 1000.00    | 20   | 1200.00     |
      | 1000.00    | 10   | 1100.00     |
      | 1000.00    | 5.5  | 1055.00     |
      | 1000.00    | 0    | 1000.00     |