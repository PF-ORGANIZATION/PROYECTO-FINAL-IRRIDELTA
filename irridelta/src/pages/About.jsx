import React from 'react';
// Importamos los iconos adicionales que usaremos para las redes sociales
import { Users, Lightbulb, TrendingUp, Handshake, Facebook, Instagram } from 'lucide-react'; 

// Datos de ejemplo para la sección Hitos
const highlights = [
  { number: "30+", text: "Años de experiencia" },
  { number: "2012", text: "Nuestro inicio" },
  { number: "100+", text: "Instaladores capacitados" },
  { number: "20+", text: "Marcas líderes" },
];

// 3. Datos de Redes Sociales (NUEVA DEFINICIÓN)
const socialLinks = [
    { icon: Instagram, href: "https://instagram.com/irridelta", label: "Instagram", color: "text-pink-600", hover: "hover:bg-pink-600" },
    { icon: Facebook, href: "https://www.facebook.com/p/Irridelta-100064054083065/?locale=es_LA", label: "Facebook", color: "text-blue-600", hover: "hover:bg-blue-600" }
];
// 

function About() {
  return (
    <div className="w-full bg-white">

      {/* 1. Encabezado / Hero Section (Simulando la forma de la imagen) */}
      <header className="relative bg-gradient-to-br from-green-700 to-yellow-500 text-white pt-20 pb-28 md:pb-40"
        style={{ clipPath: 'polygon(0 0, 100% 0, 100% 85%, 0 100%)' /* Forma diagonal / ondulada */ }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-5xl font-extrabold mb-3">
            Nuestra Historia, Nuestro Compromiso
          </h1>
          <p className="text-xl font-light">
            Desde 1990, generando experiencia y conocimiento para tu proyecto.
          </p>
        </div>
      </header>

      {/* 2. Historia y Origen */}
      <section className="py-16 -mt-16 md:-mt-24 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 bg-white p-8 rounded-xl shadow-2xl">
          <h2 className="text-2xl font-bold text-green-700 uppercase tracking-wider mb-4">
            NOSOTROS...
          </h2>
          
          <p className="mt-4 text-lg text-gray-700 leading-relaxed text-justify">
            Desde fines de los 90' trabajamos en el sector del riego generando <strong>experiencia y conocimientos</strong>.
            Iniciamos nuestro recorrido como instaladores de sistemas residenciales, deportivos y agrícolas.
            En 2012 abrimos nuestro local en Benavídez que llamamos <strong>IRRIDELTA</strong>, enfocándonos en la 
            <strong> venta de insumos</strong>, <strong> capacitación y formación</strong> de instaladores independientes.
            Desde ese entonces somos distribuidores de las principales marcas en el rubro del riego.
            Comenzamos con la comercialización de productos de riego y de a poco hemos ido incorporando otros de áreas afines como piscinas, tratamientos de agua con ablandadores, bombas de tipo centrífugas, sumergibles, periféricas, multietapas, desagote tanto para riego como sanitarias, herramientas de jardinería y máquinas de explosión, para acompañar los requerimientos del público.
          </p>

          <p className="mt-4 text-lg text-gray-700 leading-relaxed text-justify">
            En Octubre de 2024 abrimos una <strong>nueva sucursal</strong> en Escobar para atender mejor la demanda creciente en esta zona. 
          </p>

          <p className="mt-4 text-lg text-gray-700 leading-relaxed text-justify">
            <strong>Nuestro objetivo</strong> es contar con una importante variedad de
            <strong> productos de primer nivel</strong> que permitan a nuestros clientes encontrar la mejor opción para la realización de sus proyectos en cada situación particular. Para ello, sumamos una creciente y gran variedad de marcas de primera línea internacional.
          </p>

          <p className="mt-4 text-lg text-gray-700 leading-relaxed text-justify">
            <strong>Involucrarnos</strong> en los desafíos que nos plantean nuestros clientes con sus diferentes proyectos,
            <strong> es parte de nuestra esencia</strong> para acompañarlos en el crecimiento.
          </p>

          <p className="mt-4 text-lg text-gray-700 leading-relaxed text-justify">
            <strong>Capacitamos</strong> permanentemente a nuestro personal para ser los primeros en implementar las nuevas tecnologías que llegan al país.
          </p>

        </div>
      </section>

      {/* 3. Hitos y Cifras (Prueba de Confianza) */}
      <section className="py-16 bg-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {highlights.map((item, index) => (
              <div key={index} className="p-4">
                <p className="text-5xl font-extrabold text-green-700">{item.number}</p>
                <p className="mt-2 text-lg text-gray-600">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. Misión, Visión y Valores */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-extrabold text-gray-900 text-center mb-12">
            Nuestro Propósito
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <ValueCard icon={Lightbulb} title="Nuestra Misión" description="Ser el socio estratégico que provee productos de primer nivel y la capacitación necesaria para el éxito de tus proyectos." />
            <ValueCard icon={TrendingUp} title="Nuestra Visión" description="Consolidarnos como el distribuidor líder en insumos de la región, reconocido por la calidad, la innovación y el soporte técnico." />
            <ValueCard icon={Handshake} title="Nuestros Valores" description="Compromiso con el cliente, la experiencia profunda en el sector, y la búsqueda constante del crecimiento y la excelencia." />
          </div>
        </div>
      </section>

      {/* 3. NUEVA SECCIÓN: Conexión Social */}
            <section className="py-12  bg-gray-300 mb-16">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <h2 className="text-2xl font-bold text-gray-800 mb-6">
                        Seguínos en nuestras redes
                    </h2>
                    <div className="flex justify-center space-x-6">
                        {socialLinks.map((link) => (
                            <a 
                                key={link.label}
                                href={link.href} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className={`p-4 rounded-full bg-gray-100 ${link.color} transition duration-300 transform hover:scale-110 ${link.hover} hover:text-white shadow-md`}
                                aria-label={`Visita nuestro perfil de ${link.label}`}
                            >
                                <link.icon className="w-8 h-8" />
                            </a>
                        ))}
                    </div>
                </div>
            </section>
            {/* FIN NUEVA SECCIÓN */}

      {/* 6. Llamada a la Acción Final */}
      <section className="py-16 bg-blue-600 text-white text-center">
        <h2 className="text-3xl font-extrabold mb-4">¡Conoce al equipo que lo hace posible!</h2>
        <p className="text-xl mb-8">Te invitamos a pasar por nuestros locales de Benavídez y Escobar o contactarnos!</p>
        <a href="/contacto" className="bg-white hover:bg-gray-100 text-blue-600 font-bold py-3 px-8 rounded-lg transition duration-300 shadow-xl">
          Contactanos!
        </a>
      </section>
    </div>
  );
}

// Componente reutilizable para los valores
const ValueCard = ({ icon: Icon, title, description }) => (
  <div className="flex flex-col items-center text-center p-6 bg-white rounded-xl shadow-lg border-t-4 border-yellow-500">
    <Icon className="w-10 h-10 mb-4 text-yellow-500" />
    <h3 className="text-xl font-semibold text-gray-900 mb-2">{title}</h3>
    <p className="text-gray-600">{description}</p>
  </div>
); 

export default About;