#!/bin/bash

# Esperar a que la base de datos esté disponible
echo "Esperando a que PostgreSQL esté disponible..."

while ! pg_isready -h $DB_HOST -p $DB_PORT -U $DB_USER; do
  echo "PostgreSQL no está listo - esperando..."
  sleep 2
done

echo "PostgreSQL está listo!"

# Ejecutar migraciones
echo "Aplicando migraciones..."
python manage.py migrate

# Recolectar archivos estáticos (si es necesario)
echo "Recolectando archivos estáticos..."
python manage.py collectstatic --noinput

# Iniciar el servidor Django
echo "Iniciando servidor Django..."
python manage.py runserver 0.0.0.0:8000