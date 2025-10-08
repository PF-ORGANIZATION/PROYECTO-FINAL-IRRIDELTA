import React from 'react';
import whatsappLogo from "../../public/whatsapp-logo.svg";

/**
 * Muestra la ficha detallada de un producto con opción de consulta por WhatsApp.
 * @param {object} props - Propiedades del componente.
 * @param {object} props.product - Objeto del producto.
 * @param {string} props.whatsappLink - URL base de WhatsApp.
 */
function ProductCard({ product, whatsappLink }) {
  // Simulación de un precio si tu producto lo tiene (ejemplo para mejor estética)
  const price = product.precio || null; // Asume que tienes una propiedad 'precio'
  
  // Construye el link de consulta con el nombre del producto
  const phoneNumber = "5491162856483";
  const message = `Hola, quería hacer una consulta acerca del producto: ${product.nombre}`;
  const finalWhatsappLink = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;

  return (
    <div className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition duration-300 transform hover:-translate-y-0.5 flex flex-col">

      {/* Imagen del Producto */}
      <div className="relative h-48 w-full overflow-hidden">
        {/* Badge de Categoría (Estilo mejorado) */}
        <span className="absolute top-2 right-2 bg-green-500 text-white text-xs font-semibold px-3 py-1 rounded-full shadow-md z-10">
            {product.category}
        </span>
        
        <img
          src={product.imagen_url}
          alt={product.nombre}
          className="w-full h-full object-cover"
          onError={(e) => { e.target.onerror = null; e.target.src = "https://placehold.co/400x300/e0e0e0/555555?text=Sin+Imagen" }}
        />
      </div>

      {/* Cuerpo de la Tarjeta */}
      <div className="p-5 flex flex-col flex-grow">
        
        {/* Título */}
        <h3 className="text-2xl font-bold text-gray-800 truncate mb-2">{product.nombre}</h3>

        {/* Descripción (Limitada a 3 líneas para uniformidad) */}
        <p className="text-gray-600 text-sm mb-4 flex-grow line-clamp-3">
            {product.descripcion || "Producto sin descripción detallada."}
        </p>

        {/* Sección de Precio y Botón (Separador visual) */}
        <div className="mt-auto pt-4 border-t border-gray-100 flex flex-col gap-3">

            {/* Precio (Si existe) */}
            {price && (
                <div className="text-right">
                    <span className="text-xl font-extrabold text-gray-900">
                        ${price.toLocaleString('es-AR')} 
                    </span>
                </div>
            )}


            {/* Botón de Acción a WhatsApp (CTA más limpio y visible) */}
            <a
                href={finalWhatsappLink}
                target="_blank"
                rel="noopener noreferrer"
                // Fondo más dinámico con un hover sutil y sombra verde
                className="w-full flex justify-center items-center bg-green-600 text-white font-semibold py-2.5 rounded-xl hover:bg-green-700 transition duration-300 shadow-lg shadow-green-200/50"
            >
                <img src={whatsappLogo} alt="WhatsApp" className="w-5 h-5 mr-2 filter brightness-110" />
                Consultar por WhatsApp
            </a>
        </div>

      </div>
    </div>
  );
}

export default ProductCard;