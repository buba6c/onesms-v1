
-- ========================================================================
-- FIX FINAL V3: Autoriser 'debit_admin' également !
-- ========================================================================

ALTER TABLE balance_operations 
DROP CONSTRAINT IF EXISTS balance_operations_operation_type_check;

ALTER TABLE balance_operations 
ADD CONSTRAINT balance_operations_operation_type_check 
CHECK (operation_type IN (
    'freeze', 
    'commit', 
    'refund', 
    'correction', 
    'credit_admin', 
    'debit_admin',
    'deposit', 
    'manual', 
    'bonus', 
    'system'
));
