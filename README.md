# aesva-web

## SQL para nuevos campos

Ejecuta las siguientes sentencias en la base de datos (orden recomendado):

```sql
-- Campo de horas mínimas diarias globales en empresa
ALTER TABLE company ADD COLUMN minimum_daily_hours_global NUMERIC(10, 2);

-- Campo equivalente en imputaciones y carga inicial con valor 6
ALTER TABLE imputations ADD COLUMN minimum_daily_hours_global NUMERIC(10, 2);
UPDATE imputations SET minimum_daily_hours_global = 6 WHERE minimum_daily_hours_global IS NULL;

-- Ajustar las imputaciones del mes actual a 5.5 horas mínimas diarias globales
UPDATE imputations
SET minimum_daily_hours_global = 5.5
WHERE date >= date_trunc('month', CURRENT_DATE)
  AND date < date_trunc('month', CURRENT_DATE) + INTERVAL '1 month';
```
