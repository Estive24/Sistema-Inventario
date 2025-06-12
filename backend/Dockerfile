# Usar Python 3.11 como imagen base
FROM python:3.11-slim

# Establecer variables de entorno
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Establecer directorio de trabajo
WORKDIR /app

# Instalar dependencias del sistema (como antes, es un paso crítico)
# Asegúrate de que apt-get update no dé el error "The update command takes no arguments"
# que mencionaste antes, ya que eso indica un problema de formato o configuración.
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        postgresql-client \
        build-essential \
        libpq-dev \
        gettext \
        curl && \
    rm -rf /var/lib/apt/lists/*

# Copiar requirements y instalar dependencias de Python
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# --- Aquí es donde haremos los cambios clave para los permisos del entrypoint ---

# Copiar el script de entrada ANTES de cambiar de usuario
# Esto asegura que el COPY lo haga ROOT y el chmod lo haga ROOT
COPY docker-entrypoint.sh /app/docker-entrypoint.sh

# Dar permisos de ejecución al script como ROOT
RUN chmod +x /app/docker-entrypoint.sh

# Crear usuario no-root para mayor seguridad
RUN adduser --disabled-password --gecos '' appuser

# Crear directorios necesarios y cambiar propietario a appuser
# ROOT es quien ejecuta esto, por lo que tiene permisos para chown
RUN mkdir -p /app/media /app/static /app/logs
RUN chown -R appuser:appuser /app

# Copiar el resto del código de la aplicación (ahora, después de configurar el usuario y directorios)
# El flag --chown es útil aquí para que los archivos se copien directamente con los permisos correctos
COPY --chown=appuser:appuser . .

# Cambiar al usuario no-root
USER appuser

# Recopilar archivos estáticos (esto se ejecuta como appuser)
# Asegúrate de que appuser tenga permisos de escritura en /app/static
# Esto debería funcionar si chown -R appuser:appuser /app fue exitoso.
RUN python manage.py collectstatic --noinput --clear

# Exponer puerto
EXPOSE 8000

# Definir el script de entrada
ENTRYPOINT ["/app/docker-entrypoint.sh"]

# Comando por defecto para iniciar la aplicación
CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]