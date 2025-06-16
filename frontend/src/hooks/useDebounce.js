// src/hooks/useDebounce.js
import { useState, useEffect } from 'react';

/**
 * Hook personalizado para aplicar debounce a un valor
 * Útil para campos de búsqueda y inputs que necesitan retrasar la ejecución
 * 
 * @param {any} value - El valor que queremos hacer debounce
 * @param {number} delay - El tiempo de delay en milisegundos (por defecto 300ms)
 * @returns {any} El valor con debounce aplicado
 * 
 * @example
 * const [searchTerm, setSearchTerm] = useState('');
 * const debouncedSearchTerm = useDebounce(searchTerm, 500);
 * 
 * // debouncedSearchTerm se actualizará 500ms después del último cambio en searchTerm
 */
export const useDebounce = (value, delay = 300) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    // Establecer un timeout para actualizar el valor después del delay
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Limpiar el timeout si el valor cambia antes del delay
    // Esto es importante para cancelar la ejecución anterior y evitar memory leaks
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]); // Solo se ejecuta cuando value o delay cambian

  return debouncedValue;
};

/**
 * Hook alternativo para casos más complejos donde necesitas una función con debounce
 * Útil cuando quieres aplicar debounce a una función específica en lugar de un valor
 * 
 * @param {function} callback - Función a ejecutar con debounce
 * @param {number} delay - Tiempo de delay en milisegundos
 * @returns {function} Función con debounce aplicado
 * 
 * @example
 * const debouncedSearch = useDebouncedCallback((searchTerm) => {
 *   // Esta función se ejecutará solo después del delay
 *   fetchSearchResults(searchTerm);
 * }, 500);
 */
export const useDebouncedCallback = (callback, delay = 300) => {
  const [timeoutId, setTimeoutId] = useState(null);

  const debouncedCallback = (...args) => {
    // Cancelar timeout anterior si existe
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    // Establecer nuevo timeout
    const newTimeoutId = setTimeout(() => {
      callback(...args);
    }, delay);

    setTimeoutId(newTimeoutId);
  };

  // Cleanup en unmount del componente
  useEffect(() => {
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [timeoutId]);

  return debouncedCallback;
};

/**
 * Hook para debounce con estado de loading
 * Útil cuando quieres mostrar un indicador de carga mientras esperas el debounce
 * 
 * @param {any} value - El valor que queremos hacer debounce
 * @param {number} delay - El tiempo de delay en milisegundos
 * @returns {[any, boolean]} Array con [debouncedValue, isLoading]
 * 
 * @example
 * const [searchTerm, setSearchTerm] = useState('');
 * const [debouncedSearchTerm, isSearching] = useDebouncedValue(searchTerm, 500);
 */
export const useDebouncedValue = (value, delay = 300) => {
  const [debouncedValue, setDebouncedValue] = useState(value);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    
    const handler = setTimeout(() => {
      setDebouncedValue(value);
      setIsLoading(false);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return [debouncedValue, isLoading];
};

// Export por defecto del hook principal
export default useDebounce;