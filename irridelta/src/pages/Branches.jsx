import React from 'react';
import whatsappLogo from "../../public/whatsapp-logo.svg";

function Branches() {
  const branches = [
    { 
      name: "Sucursal Benavidez",
      map: "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3291.929126566034!2d-58.6829144!3d-34.4031473!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x95bca10d270a9be5%3A0x1f55b2bc18eddcdc!2sIRRIDELTA!5e0!3m2!1ses!2sar!4v1759331165080!5m2!1ses!2sar",
      whatsapp: "https://wa.me/5491162856457",
      address: "Av. Benavidez 3750, Benavidez (Locales 5 y 6)",
      schedule: "Lunes a Viernes: 8:00 a 13:00 y 14:00 a 18:00",
      schedule2:"Sábados: 8:00 a 13:00"
    },
    { 
      name: "Sucursal Escobar",
      map: "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3294.767873477887!2d-58.7678249!3d-34.3309305!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x95bb612fbadd948b%3A0xdc6a8891d3e6be89!2sIRRIDELTA!5e0!3m2!1ses!2sar!4v1759331123159!5m2!1ses!2sar",
      whatsapp: "https://wa.me/5491162856483",
      address: "Av. San Martin 2213, Belén de Escobar",
      schedule: "Lunes a Viernes: 8:00 a 17:30",
      schedule2:"Sábados: 8:00 a 13:00"
    }
  ];

  return (
    <div className="w-full bg-gray-50 p-12 max-w-6xl mx-auto">
      <h2 className="text-4xl font-extrabold text-gray-800 border-b pb-2 mb-8 text-center md:text-left">
        Nuestras Sucursales
      </h2>
      
      {/* AJUSTE CLAVE 1: Usamos 'grid-rows-1' y 'auto-rows-fr' para asegurar que, 
        aunque el contenido sea distinto, las tarjetas tengan la misma altura (solo en pantallas grandes).
        El comportamiento por defecto de 'grid' ya hace esto muy bien.
      */}
      <div className="grid md:grid-cols-2 gap-8 items-stretch"> 
        {branches.map((b, i) => (
          <div 
            key={i} 
            className="bg-white border border-gray-200 rounded-xl shadow-lg hover:shadow-xl transition duration-300 flex flex-col overflow-hidden" // AJUSTE CLAVE 2: Usamos flex-col
          >
            
            {/* Contenido superior que empuja el botón hacia abajo */}
            <div className="p-6 flex-grow"> 
              <h3 className="text-2xl font-semibold text-gray-900 mb-4">{b.name}</h3>
              
              <div className="text-gray-600 space-y-3 mb-4">
                <p>
                  <strong className="text-gray-800 block text-sm mb-1">Dirección:</strong> 
                  <span className="text-base">{b.address}</span>
                </p>
                
                {/* AJUSTE CLAVE 3: Usamos un span para el título del Horario 
                  y luego un div con <br /> para asegurar el salto de línea y el espaciado
                */}
                <div>
                  <strong className="text-gray-800 block text-sm mb-1">Horario:</strong> 
                  <span className="text-base block">{b.schedule}</span> 
                  {/* El 'block' asegura que ocupe toda la línea */}
                  
                  {/* Esto garantiza que el schedule2 aparezca debajo, solo si tiene contenido */}
                  {b.schedule2 && (
                    <span className="text-base block">{b.schedule2}</span>
                  )}
                </div>
              </div>
            </div>

            {/* El iframe y el botón van después, asegurando que estén alineados por abajo */}
            <iframe 
              title={`Mapa de ${b.name}`} 
              src={b.map} 
              width="100%" 
              height="250" 
              style={{border:0}} 
              allowFullScreen="" 
              loading="lazy"
            ></iframe>

            {/* El WhatsApp button */}
            <a 
              href={b.whatsapp} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="flex items-center justify-center mt-0 p-4 bg-green-600 hover:bg-green-700 text-white text-lg font-medium rounded-b-xl transition duration-300"
            >
              <img src={whatsappLogo} alt="WhatsApp" className="w-5 h-5 mr-2" />
              Contactar por WhatsApp
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Branches;
