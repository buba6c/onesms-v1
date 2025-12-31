-- 🛠 SCRIPT DE RÉPARATION DES FONDS BLOQUÉS
-- Ce script cherche toutes les activations marquées "cancelled" ou "timeout"
-- qui ont MALHEUREUSEMENT encore de l'argent gelé (bug d'annulation).
-- Il force le remboursement propre.

DO $$
DECLARE
  r RECORD;
  refunded_count INT := 0;
BEGIN
  RAISE NOTICE '🔍 Analyse des fonds bloqués...';
  
  FOR r IN 
    SELECT id, user_id, frozen_amount, status 
    FROM public.activations 
    WHERE status IN ('cancelled', 'timeout') 
    AND frozen_amount > 0 
  LOOP
    RAISE NOTICE '💸 Remboursement pour Activation % (Statut: %, Montant: %)', r.id, r.status, r.frozen_amount;
    
    -- Appel de la fonction de remboursement atomique
    PERFORM public.atomic_refund(
        r.user_id, 
        r.id, 
        NULL, -- rental_id
        NULL, -- transaction_id (optionnel)
        'Fix: Remboursement manuel activation bloquée'
    );
    
    refunded_count := refunded_count + 1;
  END LOOP;
  
  RAISE NOTICE '✅ Terminé. % remboursements effectués.', refunded_count;
END $$;
