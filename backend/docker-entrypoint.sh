#!/bin/bash

# Esperar a que la base de datos est� disponible
echo "Esperando a que PostgreSQL est� disponible..."

while ! pg_isready -h $DB_HOST -p $DB_PORT -U $DB_USER; do
  echo "PostgreSQL no est� listo - esperando..."
  sleep 2
done

echo "PostgreSQL est� listo!"

# Ejecutar migraciones
echo "Aplicando migraciones..."
python manage.py migrate

# Recolectar archivos est�ticos (si es necesario)
echo "Recolectando archivos est�ticos..."
python manage.py collectstatic --noinput

# Iniciar el servidor Django
echo "Iniciando servidor Django..."
python manage.py runserver 0.0.0.0:8000