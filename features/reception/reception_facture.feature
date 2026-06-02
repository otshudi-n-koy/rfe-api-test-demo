# =============================================================================
# PÉRIMÈTRE : Flux de réception de factures (RFE)
# Auteur    : N'Koy OTSHUDI — QA Senior
# =============================================================================

@reception
Feature: Réception de factures électroniques

  En tant que destinataire assujetti à la TVA,
  Je veux recevoir et traiter les factures électroniques,
  Afin d'assurer le traitement comptable conforme à la RFE.

  Background:
    Given l'API de facturation est disponible
    And je suis authentifié en tant que destinataire

  @smoke @reception
  Scenario: Récupération d'une facture reçue
    Given une facture avec l'identifiant "INV-20240601-001" existe dans le système
    When je consulte la facture via GET /invoices/INV-20240601-001
    Then le statut de la réponse est 200
    And la réponse respecte le schéma JSON de la facture
    And la facture contient les champs obligatoires RFE

  @reception
  Scenario: Consultation de la liste des factures reçues
    Given je suis connecté en tant que destinataire avec le SIREN "987654321"
    When je consulte la liste via GET /invoices?direction=RECEIVED&status=SUBMITTED
    Then le statut de la réponse est 200
    And la réponse est une liste paginée
    And chaque facture a le statut "SUBMITTED"
    And chaque facture a pour destinataire le SIREN "987654321"

  @reception
  Scenario: Accusé de réception d'une facture
    Given une facture avec l'identifiant "INV-20240601-001" a le statut "SUBMITTED"
    When j'envoie un accusé de réception via PUT /invoices/INV-20240601-001/acknowledge
    Then le statut de la réponse est 200
    And le nouveau statut de la facture est "ACKNOWLEDGED"
    And la date d'accusé de réception est renseignée

  @reception
  Scenario: Rejet d'une facture non conforme par le destinataire
    Given une facture avec l'identifiant "INV-20240601-002" a le statut "SUBMITTED"
    When je rejette la facture avec le motif "Montant incorrect"
    Then le statut de la réponse est 200
    And le nouveau statut de la facture est "REJECTED"
    And le motif de rejet est enregistré

  @reception
  Scenario: Facture introuvable — gestion d'erreur 404
    When je consulte la facture via GET /invoices/INEXISTANT-999
    Then le statut de la réponse est 404
    And la réponse contient le code d'erreur "INVOICE_NOT_FOUND"

  @reception
  Scenario: Accès non autorisé à une facture d'un tiers
    Given une facture appartenant au SIREN "111111111" existe
    When je tente d'y accéder sans les droits correspondants
    Then le statut de la réponse est 403
    And la réponse contient le code d'erreur "ACCESS_DENIED"