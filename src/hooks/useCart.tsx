import { createContext, ReactNode, useContext, useState, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const prevCartRef = useRef<Product[]>();

  useEffect(() => {
    prevCartRef.current = cart;
  })

  const cartPreviousValue = prevCartRef.current || cart;

  useEffect(() => {
    if (cartPreviousValue !== cart) {
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(cart));
    }
  }, [cart, cartPreviousValue])

  const addProduct = async (productId: number) => {
    try {
      const updatedCart = [...cart];
      const productOnCart = updatedCart.find(product => (product.id === productId));

      const productStockResponse = await api.get(`/stock/${productId}`);

      const productStockAmount = productStockResponse.data.amount;
      const currentAmount = productOnCart ? productOnCart.amount : 0;
      const amount = currentAmount + 1;

      if (amount > productStockAmount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      if (productOnCart) {
        productOnCart.amount = amount;
      } else {
        const newProductResponse = await api.get(`/products/${productId}`);
        const cartProduct = {
          ...newProductResponse.data,
          amount: 1
        };
        updatedCart.push(cartProduct);
      }

      setCart(updatedCart);
    } catch {
      toast.error('Erro na adição do produto');
    }
    
  };

  const removeProduct = (productId: number) => {
    try {
      const updatedCart = [...cart];
      const productIndex = updatedCart.findIndex(product => (product.id === productId));
      
      if (productIndex >= 0) {
        updatedCart.splice(productIndex, 1);
        setCart(updatedCart);
        return;
      }

      throw Error();
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount < 1) throw Error()

      const updatedCart = [...cart];
      const productOnCart = updatedCart.find(product => (product.id === productId));

      const productStockResponse = await api.get(`/stock/${productId}`);
      const productStockAmount = productStockResponse.data.amount;

      if (amount > productStockAmount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      if (productOnCart) {
        productOnCart.amount = amount;
        setCart(updatedCart);
        return;
      } 
      
      throw Error();
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
