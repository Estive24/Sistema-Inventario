from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from .models import Categoria, Repuesto
from .serializers import CategoriaSerializer, RepuestoSerializer

class CategoriaViewSet(viewsets.ModelViewSet):
    queryset = Categoria.objects.all()
    serializer_class = CategoriaSerializer
    permission_classes = [IsAuthenticated]

class RepuestoViewSet(viewsets.ModelViewSet):
    queryset = Repuesto.objects.all()
    serializer_class = RepuestoSerializer
    permission_classes = [IsAuthenticated]
