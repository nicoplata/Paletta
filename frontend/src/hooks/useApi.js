import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';

// Keys para las queries
export const queryKeys = {
  productos: 'productos',
  producto: (id) => ['producto', id],
  categorias: 'categorias',
  pedidos: 'pedidos',
  pedido: (id) => ['pedido', id],
};

// Hooks para productos
export const useProductos = (filters) => {
  return useQuery({
    queryKey: [queryKeys.productos, filters],
    queryFn: async () => {
      const { data } = await axios.get('/api/productos', { params: filters });
      return data;
    }
  });
};

export const useProducto = (id) => {
  return useQuery({
    queryKey: queryKeys.producto(id),
    queryFn: async () => {
      const { data } = await axios.get(`/api/productos/${id}`);
      return data;
    },
    enabled: !!id
  });
};

export const useCrearProducto = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (nuevoProducto) => 
      axios.post('/api/productos', nuevoProducto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [queryKeys.productos] });
    }
  });
};

// Hooks para pedidos
export const usePedidos = () => {
  return useQuery({
    queryKey: queryKeys.pedidos,
    queryFn: async () => {
      const { data } = await axios.get('/api/pedidos');
      return data;
    }
  });
};

export const useCrearPedido = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (nuevoPedido) => 
      axios.post('/api/pedidos', nuevoPedido),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [queryKeys.pedidos] });
    }
  });
};

// Hooks para categorías
export const useCategorias = () => {
  return useQuery({
    queryKey: queryKeys.categorias,
    queryFn: async () => {
      const { data } = await axios.get('/api/categorias');
      return data;
    }
  });
};

export const useCrearCategoria = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (nuevaCategoria) => 
      axios.post('/api/categorias', nuevaCategoria),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [queryKeys.categorias] });
    }
  });
};
