import { createContext, useContext } from "react";

export const ProductContext = createContext(null);

export const useProducts = () => useContext(ProductContext);
