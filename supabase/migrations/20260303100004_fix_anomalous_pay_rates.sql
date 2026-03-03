-- Fix anomalous pay rates — data clarification sweep
-- Staff with pay_type = 'Salary' store biweekly salary amounts (e.g. $5,000/biweekly).
-- These are correct and must NOT be changed.
-- Only normalize HOURLY rates that are unrealistically high (> $200/hr).
UPDATE staff
SET pay_rate = 25.00
WHERE pay_rate > 200
  AND (pay_type = 'Hourly' OR pay_type IS NULL)
  AND archived_at IS NULL;
